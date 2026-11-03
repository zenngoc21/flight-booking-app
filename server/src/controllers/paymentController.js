const mongoose = require('mongoose');
const crypto = require('crypto');
const Booking = require('../models/Booking');
const Flight = require('../models/Flight');
const { getRedisClient } = require('../config/redis');
const {
  createPaymentUrl,
  getClientReturnUrl,
  getVnpayConfig,
  isValidSignature,
  parseVnpayDate,
  validateClientReturnUrl,
} = require('../services/vnpayService');

function getBookingLegs(booking) {
  if (Array.isArray(booking.legs) && booking.legs.length > 0) {
    return booking.legs.map((leg) => ({
      flightId: leg.flight,
      seats: leg.seats || [],
    }));
  }

  return [
    { flightId: booking.flight, seats: booking.seats },
    ...(booking.returnFlight
      ? [{ flightId: booking.returnFlight, seats: booking.returnSeats || [] }]
      : []),
  ];
}

async function releaseBookingSeats(booking, redis) {
  if (!redis || !redis.isReady) return;

  const userId = booking.user.toString();

  for (const { flightId: flightValue, seats } of getBookingLegs(booking)) {
    const flightId = flightValue?._id
      ? flightValue._id.toString()
      : flightValue.toString();

    for (const seatNumber of seats) {
      const key = `seat-hold:${flightId}:${seatNumber}`;

      try {
        await redis.eval(
          `if redis.call("GET", KEYS[1]) == ARGV[1] then
             return redis.call("DEL", KEYS[1])
           end
           return 0`,
          {
            keys: [key],
            arguments: [userId],
          }
        );
      } catch (error) {
        console.error('Không thể giải phóng Redis lock:', error.message);
      }
    }
  }
}

async function rollbackBookedSeats(reservedLegs) {
  for (const { flightId, seats } of reservedLegs) {
    try {
      await Flight.updateOne(
        {
          _id: flightId,
          seats: {
            $all: seats.map((seatNumber) => ({
              $elemMatch: { seatNumber, status: 'booked' },
            })),
          },
        },
        {
          $set: { 'seats.$[seat].status': 'available' },
        },
        {
          arrayFilters: [
            { 'seat.seatNumber': { $in: seats }, 'seat.status': 'booked' },
          ],
        }
      );
    } catch (error) {
      console.error('Không thể hoàn tác giữ ghế sau lỗi thanh toán:', error.message);
    }
  }
}

// GET /api/payments/:bookingId
async function getPaymentInfo(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.bookingId)) {
      return res.status(400).json({ message: 'Mã booking không hợp lệ' });
    }

    const booking = await Booking.findOne({
      _id: req.params.bookingId,
      user: req.user._id,
    })
      .populate('flight')
      .populate('returnFlight')
      .populate('legs.flight');

    if (!booking) {
      return res.status(404).json({ message: 'Không tìm thấy booking' });
    }

    return res.json({
      data: {
        id: booking._id,
        bookingCode: booking.bookingCode,
        bookingStatus: booking.bookingStatus,
        paymentStatus: booking.paymentStatus,
        expiresAt: booking.expiresAt,
        paidAt: booking.paidAt,
        paymentMethod: booking.paymentMethod,
        bankCode: booking.bankCode,
        seats: booking.seats,
        returnSeats: booking.returnSeats,
        legs: booking.legs,
        passengers: booking.passengers,
        pricing: booking.pricing,
        flight: booking.flight,
        returnFlight: booking.returnFlight,
      },
    });
  } catch (error) {
    next(error);
  }
}

// POST /api/payments/demo/:bookingId
// Backend tự quyết định kết quả mô phỏng.
async function payDemo(req, res, next) {
  const reservedLegs = [];
  let redis;
  let paymentLockKey;
  let paymentLockToken;

  try {
    if (!['development', 'test'].includes(process.env.NODE_ENV)) {
      return res.status(404).json({ message: 'Không tìm thấy API' });
    }

    const { outcome, paymentMethod = 'bank_transfer', bankCode = 'VCB' } = req.body;
    if (!['bank_transfer', 'card', 'wallet'].includes(paymentMethod) || !/^[A-Z0-9]{2,8}$/.test(String(bankCode))) {
      return res.status(400).json({ message: 'Phương thức thanh toán không hợp lệ' });
    }

    if (!['success', 'failure'].includes(outcome)) {
      return res.status(400).json({
        message: 'Kết quả Demo phải là success hoặc failure',
      });
    }

    if (!mongoose.isValidObjectId(req.params.bookingId)) {
      return res.status(400).json({ message: 'Mã booking không hợp lệ' });
    }

    const booking = await Booking.findOne({
      _id: req.params.bookingId,
      user: req.user._id,
    });

    if (!booking) {
      return res.status(404).json({ message: 'Không tìm thấy booking' });
    }

    if (booking.bookingStatus !== 'pending' ||
        booking.paymentStatus !== 'pending' ||
        booking.paymentMethod === 'vnpay') {
      return res.status(409).json({
        message: 'Booking không còn ở trạng thái chờ thanh toán',
        bookingStatus: booking.bookingStatus,
        paymentStatus: booking.paymentStatus,
      });
    }

    redis = getRedisClient();

    if (!redis || !redis.isReady) {
      return res.status(503).json({
        message: 'Dịch vụ giữ ghế không khả dụng. Vui lòng thử lại.',
      });
    }

    paymentLockKey = `booking-payment:${booking._id}`;
    paymentLockToken = crypto.randomUUID();
    const lockResult = await redis.set(paymentLockKey, paymentLockToken, {
      NX: true,
      EX: 120,
    });

    if (lockResult !== 'OK') {
      return res.status(409).json({
        message: 'Thanh toán booking này đang được xử lý. Vui lòng chờ và kiểm tra lại.',
      });
    }

    if (new Date(booking.expiresAt).getTime() <= Date.now()) {
      const expired = await Booking.updateOne(
        {
          _id: booking._id,
          bookingStatus: 'pending',
          paymentStatus: 'pending',
        },
        {
          $set: {
            bookingStatus: 'expired',
            paymentStatus: 'failed',
            failedAt: new Date(),
          },
        }
      );

      if (expired.modifiedCount === 1) {
        await releaseBookingSeats(booking, redis);
      }

      return res.status(410).json({
        message: 'Booking đã hết thời hạn thanh toán',
        bookingStatus: 'expired',
        paymentStatus: 'failed',
      });
    }

    if (outcome === 'failure') {
      const failedAt = new Date();
      const failed = await Booking.updateOne(
        {
          _id: booking._id,
          bookingStatus: 'pending',
          paymentStatus: 'pending',
        },
        {
          $set: {
            paymentMethod,
            bankCode: String(bankCode),
            bookingStatus: 'cancelled',
            paymentStatus: 'failed',
            failedAt,
          },
        }
      );

      if (failed.modifiedCount !== 1) {
        return res.status(409).json({
          message: 'Booking vừa được xử lý bởi một yêu cầu khác',
        });
      }

      await releaseBookingSeats(booking, redis);
      return res.json({
        message: 'Thanh toán Demo thất bại',
        data: {
          bookingCode: booking.bookingCode,
          bookingStatus: 'cancelled',
          paymentStatus: 'failed',
        },
      });
    }

    const legs = getBookingLegs(booking);

    for (const { flightId: flightValue, seats } of legs) {
      const flightId = flightValue._id ? flightValue._id : flightValue;
      const flight = await Flight.findOne({
        _id: flightId,
        status: 'scheduled',
        departureAt: { $gt: new Date() },
      });

      if (!flight) {
        await rollbackBookedSeats(reservedLegs);
        return res.status(409).json({
          message: 'Một chuyến bay không còn khả dụng',
        });
      }

      for (const seatNumber of seats) {
        const holder = await redis.get(`seat-hold:${flight._id}:${seatNumber}`);
        if (holder !== booking.user.toString()) {
          await rollbackBookedSeats(reservedLegs);
          return res.status(409).json({
            message: `Quyền giữ ghế ${seatNumber} trên chuyến ${flight.flightNumber} đã hết hạn`,
          });
        }
      }

      const selectedSeats = flight.seats.filter((seat) =>
        seats.includes(seat.seatNumber)
      );

      if (
        selectedSeats.length !== seats.length ||
        selectedSeats.some((seat) => seat.status !== 'available')
      ) {
        await rollbackBookedSeats(reservedLegs);
        return res.status(409).json({
          message: `Một hoặc nhiều ghế trên chuyến ${flight.flightNumber} không còn khả dụng`,
        });
      }

      const updateResult = await Flight.updateOne(
        {
          _id: flight._id,
          status: 'scheduled',
          seats: {
            $all: seats.map((seatNumber) => ({
              $elemMatch: {
                seatNumber,
                status: 'available',
              },
            })),
          },
        },
        {
          $set: {
            'seats.$[seat].status': 'booked',
          },
        },
        {
          arrayFilters: [
            { 'seat.seatNumber': { $in: seats } },
          ],
        }
      );

      if (updateResult.modifiedCount !== 1) {
        await rollbackBookedSeats(reservedLegs);
        return res.status(409).json({
          message: `Ghế trên chuyến ${flight.flightNumber} vừa được người khác đặt`,
        });
      }

      reservedLegs.push({ flightId: flight._id, seats });
    }

    const paidAt = new Date();
    const paid = await Booking.updateOne(
      {
        _id: booking._id,
        bookingStatus: 'pending',
        paymentStatus: 'pending',
        expiresAt: { $gt: paidAt },
      },
      {
        $set: {
          paymentMethod,
          bankCode: String(bankCode),
          bookingStatus: 'confirmed',
          paymentStatus: 'paid',
          paidAt,
        },
      }
    );

    if (paid.modifiedCount !== 1) {
      await rollbackBookedSeats(reservedLegs);
      return res.status(409).json({
        message: 'Booking đã hết hạn hoặc vừa được xử lý bởi một yêu cầu khác',
      });
    }

    await releaseBookingSeats(booking, redis);

    return res.json({
      message: 'Thanh toán Demo thành công!',
      data: {
        bookingCode: booking.bookingCode,
        bookingStatus: 'confirmed',
        paymentStatus: 'paid',
        paidAt,
        pricing: booking.pricing,
      },
    });
  } catch (error) {
    await rollbackBookedSeats(reservedLegs);
    next(error);
  } finally {
    if (redis?.isReady && paymentLockKey && paymentLockToken) {
      try {
        await redis.eval(
          `if redis.call("GET", KEYS[1]) == ARGV[1] then
             return redis.call("DEL", KEYS[1])
           end
           return 0`,
          {
            keys: [paymentLockKey],
            arguments: [paymentLockToken],
          }
        );
      } catch (error) {
        console.error('Không thể giải phóng khóa thanh toán booking:', error.message);
      }
    }
  }
}

async function createVnpayPayment(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.bookingId)) {
      return res.status(400).json({ message: 'Mã booking không hợp lệ' });
    }

    const booking = await Booking.findOne({
      _id: req.params.bookingId,
      user: req.user._id,
    }).select('+vnpayPaymentUrl +vnpayClientReturnUrl');
    if (!booking) {
      return res.status(404).json({ message: 'Không tìm thấy booking' });
    }
    if (
      booking.bookingStatus !== 'pending' ||
      booking.paymentStatus !== 'pending'
    ) {
      return res.status(409).json({
        message: 'Booking không còn ở trạng thái chờ thanh toán',
        bookingStatus: booking.bookingStatus,
        paymentStatus: booking.paymentStatus,
      });
    }

    const clientReturnUrl = validateClientReturnUrl(req.body?.clientReturnUrl);
    if (booking.vnpayPaymentUrl) {
      const returnUrlUpdated = await Booking.updateOne(
        {
          _id: booking._id,
          user: req.user._id,
          bookingStatus: 'pending',
          paymentStatus: 'pending',
          vnpayPaymentUrl: booking.vnpayPaymentUrl,
        },
        { $set: { vnpayClientReturnUrl: clientReturnUrl } },
      );
      if (
        returnUrlUpdated.matchedCount !== 1 &&
        returnUrlUpdated.modifiedCount !== 1
      ) {
        return res.status(409).json({
          message: 'Booking vừa được xử lý bởi một yêu cầu khác',
        });
      }
      return res.json({
        message: 'Đã tạo giao dịch VNPay Sandbox',
        data: { paymentUrl: booking.vnpayPaymentUrl },
      });
    }

    if (booking.paymentMethod === 'vnpay') {
      return res.status(409).json({
        message: 'Giao dịch VNPay của booking này đang được xử lý',
      });
    }

    const paymentUrl = createPaymentUrl({
      booking,
      ipAddress: req.ip?.replace(/^::ffff:/, '') || '127.0.0.1',
    });
    const started = await Booking.updateOne(
      {
        _id: booking._id,
        user: req.user._id,
        bookingStatus: 'pending',
        paymentStatus: 'pending',
        paymentMethod: { $ne: 'vnpay' },
        vnpayPaymentUrl: { $exists: false },
      },
      {
        $set: {
          paymentMethod: 'vnpay',
          bankCode: 'VNPAY',
          vnpayPaymentUrl: paymentUrl,
          vnpayClientReturnUrl: clientReturnUrl,
        },
      },
    );
    if (started.modifiedCount !== 1) {
      const currentBooking = await Booking.findOne({
        _id: booking._id,
        user: req.user._id,
        bookingStatus: 'pending',
        paymentStatus: 'pending',
      }).select('+vnpayPaymentUrl +vnpayClientReturnUrl');
      if (currentBooking?.vnpayPaymentUrl) {
        return res.json({
          message: 'Đã tạo giao dịch VNPay Sandbox',
          data: { paymentUrl: currentBooking.vnpayPaymentUrl },
        });
      }
      return res.status(409).json({
        message: 'Booking vừa được xử lý bởi một yêu cầu khác',
      });
    }

    return res.json({
      message: 'Đã tạo giao dịch VNPay Sandbox',
      data: { paymentUrl },
    });
  } catch (error) {
    next(error);
  }
}

function getCallbackParameters(query) {
  if (
    !query ||
    Object.values(query).some((value) => typeof value !== 'string')
  ) {
    return null;
  }
  return query;
}

function sendVnpayIpnResult(res, code, message) {
  return res.json({ RspCode: code, Message: message });
}

function logVnpayReconciliation(booking, reason) {
  console.error('VNPay đã xác nhận thu tiền nhưng booking cần đối soát:', {
    bookingId: booking._id.toString(),
    bookingCode: booking.bookingCode,
    reason,
  });
}

function getVnpayBankCode(parameters) {
  return /^[a-z\d]{2,20}$/i.test(parameters.vnp_BankCode || '')
    ? parameters.vnp_BankCode
    : 'VNPAY';
}

async function recordPaidBookingForReconciliation(
  booking,
  parameters,
  paidAt,
  redis,
  reason,
) {
  const updated = await Booking.updateOne(
    {
      _id: booking._id,
      bookingStatus: booking.bookingStatus,
      paymentStatus: booking.paymentStatus,
      'pricing.currency': 'VND',
      'pricing.total': booking.pricing.total,
    },
    {
      $set: {
        paymentMethod: 'vnpay',
        bankCode: getVnpayBankCode(parameters),
        bookingStatus: 'cancelled',
        paymentStatus: 'paid',
        paidAt,
      },
      $unset: { vnpayPaymentUrl: 1, failedAt: 1 },
    },
  );

  if (updated.modifiedCount !== 1) return false;
  await releaseBookingSeats(booking, redis);
  logVnpayReconciliation(booking, reason);
  return true;
}

async function handleVnpayReturn(req, res, next) {
  try {
    const config = getVnpayConfig();
    const parameters = getCallbackParameters(req.query);
    if (
      !parameters ||
      parameters.vnp_TmnCode !== config.tmnCode ||
      !isValidSignature(parameters, config.hashSecret)
    ) {
      return res.status(400).send('Chữ ký VNPay không hợp lệ');
    }
    if (!mongoose.isValidObjectId(parameters.vnp_TxnRef)) {
      return res.status(400).send('Mã giao dịch VNPay không hợp lệ');
    }
    const booking = await Booking.findById(parameters.vnp_TxnRef)
      .select('+vnpayClientReturnUrl');
    if (!booking) {
      return res.status(404).send('Không tìm thấy booking');
    }
    if (
      booking.pricing?.currency !== 'VND' ||
      parameters.vnp_Amount !== String(Number(booking.pricing?.total) * 100)
    ) {
      return res.status(400).send('Số tiền giao dịch VNPay không hợp lệ');
    }

    const processingResponse = {
      body: null,
      json(body) {
        this.body = body;
        return this;
      },
    };
    await handleVnpayIpn(req, processingResponse);
    if (
      processingResponse.body?.RspCode !== '00' &&
      processingResponse.body?.RspCode !== '02'
    ) {
      console.error(
        'VNPay Return đã xác thực nhưng IPN chưa thể hoàn tất:',
        processingResponse.body?.Message || 'Unknown processing error',
      );
    }

    return res.redirect(
      303,
      getClientReturnUrl(parameters, booking.vnpayClientReturnUrl),
    );
  } catch (error) {
    next(error);
  }
}

async function handleVnpayIpn(req, res) {
  let redis;
  let paymentLockKey;
  let paymentLockToken;
  const reservedLegs = [];

  try {
    const config = getVnpayConfig();
    const parameters = getCallbackParameters(req.query);
    if (
      !parameters ||
      parameters.vnp_TmnCode !== config.tmnCode ||
      !isValidSignature(parameters, config.hashSecret)
    ) {
      return sendVnpayIpnResult(res, '97', 'Invalid signature');
    }
    if (!mongoose.isValidObjectId(parameters.vnp_TxnRef)) {
      return sendVnpayIpnResult(res, '01', 'Order not found');
    }

    const booking = await Booking.findById(parameters.vnp_TxnRef);
    if (!booking) {
      return sendVnpayIpnResult(res, '01', 'Order not found');
    }

    const expectedAmount = Number(booking.pricing?.total) * 100;
    if (
      !Number.isSafeInteger(expectedAmount) ||
      booking.pricing?.currency !== 'VND' ||
      parameters.vnp_Amount !== String(expectedAmount)
    ) {
      logVnpayReconciliation(booking, 'Số tiền hoặc loại tiền từ IPN không khớp');
      return sendVnpayIpnResult(res, '04', 'Invalid amount');
    }
    const providerPaid =
      parameters.vnp_ResponseCode === '00' &&
      parameters.vnp_TransactionStatus === '00';
    const pendingBooking =
      booking.bookingStatus === 'pending' &&
      booking.paymentStatus === 'pending';
    const expiredBooking =
      booking.bookingStatus === 'expired' &&
      booking.paymentStatus === 'failed';
    const canAcceptCallback =
      booking.paymentMethod === 'vnpay' &&
      (pendingBooking || (providerPaid && expiredBooking));
    if (!canAcceptCallback) {
      if (providerPaid && booking.paymentStatus !== 'paid') {
        logVnpayReconciliation(booking, 'Booking đã được đóng trước khi nhận IPN thành công');
      }
      return sendVnpayIpnResult(res, '02', 'Order already processed');
    }

    const paidAt = providerPaid ? parseVnpayDate(parameters.vnp_PayDate) : null;
    if (providerPaid && !paidAt) {
      logVnpayReconciliation(booking, 'Thời gian thanh toán trong IPN không hợp lệ');
      return sendVnpayIpnResult(res, '97', 'Invalid payment date');
    }

    redis = getRedisClient();
    if (!redis || !redis.isReady) {
      if (providerPaid) {
        logVnpayReconciliation(booking, 'Redis không khả dụng để giữ ghế');
      }
      return sendVnpayIpnResult(res, '99', 'Booking service unavailable');
    }

    paymentLockKey = `booking-payment:${booking._id}`;
    paymentLockToken = crypto.randomUUID();
    const lockResult = await redis.set(paymentLockKey, paymentLockToken, {
      NX: true,
      EX: 180,
    });
    if (lockResult !== 'OK') {
      return sendVnpayIpnResult(res, '99', 'Payment is being processed');
    }

    if (!providerPaid) {
      if (!pendingBooking) {
        return sendVnpayIpnResult(res, '02', 'Order already processed');
      }
      const failedAt = new Date();
      const failed = await Booking.updateOne(
        {
          _id: booking._id,
          bookingStatus: 'pending',
          paymentStatus: 'pending',
          expiresAt: { $gt: failedAt },
        },
        {
          $set: {
            paymentMethod: 'vnpay',
            bankCode: getVnpayBankCode(parameters),
            bookingStatus: 'cancelled',
            paymentStatus: 'failed',
            failedAt,
          },
          $unset: { vnpayPaymentUrl: 1 },
        },
      );
      if (failed.modifiedCount !== 1) {
        return sendVnpayIpnResult(res, '02', 'Order already processed');
      }
      await releaseBookingSeats(booking, redis);
      return sendVnpayIpnResult(res, '00', 'Confirm success');
    }

    const expiresAt = new Date(booking.expiresAt);
    const createdAt = booking.createdAt ? new Date(booking.createdAt) : null;
    const paidWithinBookingWindow =
      Number.isFinite(expiresAt.getTime()) &&
      paidAt <= expiresAt &&
      (!createdAt || paidAt >= createdAt);
    const isLatePayment =
      expiredBooking || expiresAt.getTime() <= Date.now();

    if (!paidWithinBookingWindow) {
      const recorded = await recordPaidBookingForReconciliation(
        booking,
        parameters,
        paidAt,
        redis,
        'VNPay đã thu tiền ngoài thời hạn booking; cần hoàn tiền hoặc đối soát',
      );
      return sendVnpayIpnResult(
        res,
        recorded ? '00' : '02',
        recorded ? 'Confirm success' : 'Order already processed',
      );
    }

    for (const { flightId: flightValue, seats } of getBookingLegs(booking)) {
      const flightId = flightValue?._id ? flightValue._id : flightValue;
      const flight = await Flight.findOne({
        _id: flightId,
        status: 'scheduled',
        departureAt: { $gt: new Date() },
      });
      if (!flight) {
        await rollbackBookedSeats(reservedLegs);
        const recorded = await recordPaidBookingForReconciliation(
          booking,
          parameters,
          paidAt,
          redis,
          'Chuyến bay không còn khả dụng sau khi VNPay đã thu tiền',
        );
        return sendVnpayIpnResult(
          res,
          recorded ? '00' : '02',
          recorded ? 'Confirm success' : 'Order already processed',
        );
      }

      for (const seatNumber of seats) {
        const holder = isLatePayment
          ? booking.user.toString()
          : await redis.get(`seat-hold:${flight._id}:${seatNumber}`);
        if (holder !== booking.user.toString()) {
          await rollbackBookedSeats(reservedLegs);
          const recorded = await recordPaidBookingForReconciliation(
            booking,
            parameters,
            paidAt,
            redis,
            `Quyền giữ ghế ${seatNumber} đã hết hạn sau khi VNPay thu tiền`,
          );
          return sendVnpayIpnResult(
            res,
            recorded ? '00' : '02',
            recorded ? 'Confirm success' : 'Order already processed',
          );
        }
      }

      const selectedSeats = flight.seats.filter((seat) =>
        seats.includes(seat.seatNumber),
      );
      if (
        selectedSeats.length !== seats.length ||
        selectedSeats.some((seat) => seat.status !== 'available')
      ) {
        await rollbackBookedSeats(reservedLegs);
        const recorded = await recordPaidBookingForReconciliation(
          booking,
          parameters,
          paidAt,
          redis,
          'Ghế không còn khả dụng sau khi VNPay đã thu tiền',
        );
        return sendVnpayIpnResult(
          res,
          recorded ? '00' : '02',
          recorded ? 'Confirm success' : 'Order already processed',
        );
      }

      const reservation = await Flight.updateOne(
        {
          _id: flight._id,
          status: 'scheduled',
          seats: {
            $all: seats.map((seatNumber) => ({
              $elemMatch: { seatNumber, status: 'available' },
            })),
          },
        },
        { $set: { 'seats.$[seat].status': 'booked' } },
        { arrayFilters: [{ 'seat.seatNumber': { $in: seats } }] },
      );
      if (reservation.modifiedCount !== 1) {
        await rollbackBookedSeats(reservedLegs);
        const recorded = await recordPaidBookingForReconciliation(
          booking,
          parameters,
          paidAt,
          redis,
          'Không thể giữ ghế do có giao dịch đồng thời sau khi VNPay thu tiền',
        );
        return sendVnpayIpnResult(
          res,
          recorded ? '00' : '02',
          recorded ? 'Confirm success' : 'Order already processed',
        );
      }
      reservedLegs.push({ flightId: flight._id, seats });
    }

    const payment = await Booking.updateOne(
      {
        _id: booking._id,
        bookingStatus: booking.bookingStatus,
        paymentStatus: booking.paymentStatus,
        'pricing.currency': 'VND',
        'pricing.total': booking.pricing.total,
      },
      {
        $set: {
          paymentMethod: 'vnpay',
          bankCode: getVnpayBankCode(parameters),
          bookingStatus: 'confirmed',
          paymentStatus: 'paid',
          paidAt,
        },
        $unset: { vnpayPaymentUrl: 1, failedAt: 1 },
      },
    );
    if (payment.modifiedCount !== 1) {
      await rollbackBookedSeats(reservedLegs);
      logVnpayReconciliation(booking, 'Booking thay đổi trạng thái trong lúc xác nhận');
      return sendVnpayIpnResult(res, '02', 'Order already processed');
    }

    await releaseBookingSeats(booking, redis);
    return sendVnpayIpnResult(res, '00', 'Confirm success');
  } catch (error) {
    await rollbackBookedSeats(reservedLegs);
    console.error('Không thể xử lý VNPay IPN:', error.message);
    return sendVnpayIpnResult(res, '99', 'Internal error');
  } finally {
    if (redis?.isReady && paymentLockKey && paymentLockToken) {
      try {
        await redis.eval(
          `if redis.call("GET", KEYS[1]) == ARGV[1] then
             return redis.call("DEL", KEYS[1])
           end
           return 0`,
          {
            keys: [paymentLockKey],
            arguments: [paymentLockToken],
          },
        );
      } catch (error) {
        console.error('Không thể giải phóng khóa thanh toán VNPay:', error.message);
      }
    }
  }
}

module.exports = {
  getPaymentInfo,
  payDemo,
  createVnpayPayment,
  handleVnpayIpn,
  handleVnpayReturn,
};
