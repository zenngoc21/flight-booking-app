jest.mock('../src/models/Booking', () => ({
  findOne: jest.fn(),
  findById: jest.fn(),
  updateOne: jest.fn(),
}));
jest.mock('../src/models/Flight', () => ({
  findOne: jest.fn(),
  updateOne: jest.fn(),
}));
jest.mock('../src/config/redis', () => ({
  getRedisClient: jest.fn(),
}));

const Booking = require('../src/models/Booking');
const Flight = require('../src/models/Flight');
const { getRedisClient } = require('../src/config/redis');
const {
  createVnpayPayment,
  handleVnpayIpn,
  handleVnpayReturn,
} = require('../src/controllers/paymentController');
const {
  isValidSignature,
  signParameters,
} = require('../src/services/vnpayService');

const BOOKING_ID = '507f1f77bcf86cd799439020';
const FLIGHT_ID = '507f1f77bcf86cd799439011';
const USER_ID = '507f1f77bcf86cd799439010';

function createResponse() {
  return {
    body: null,
    statusCode: 200,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
    send(body) {
      this.body = body;
      return this;
    },
    redirect(status, url) {
      this.statusCode = status;
      this.redirectUrl = url;
      return this;
    },
  };
}

function signedParameters(overrides = {}) {
  const parameters = {
    vnp_TmnCode: 'TESTCODE',
    vnp_TxnRef: BOOKING_ID,
    vnp_Amount: '250000000',
    vnp_CurrCode: 'VND',
    vnp_ResponseCode: '00',
    vnp_TransactionStatus: '00',
    vnp_BankCode: 'NCB',
    ...overrides,
  };
  return {
    ...parameters,
    vnp_SecureHash: signParameters(parameters, 'test-secret'),
  };
}

describe('VNPay IPN', () => {
  let booking;
  let redis;

  beforeEach(() => {
    process.env.VNPAY_TMN_CODE = 'TESTCODE';
    process.env.VNPAY_HASH_SECRET = 'test-secret';
    process.env.VNPAY_RETURN_URL = 'https://api.example.test/api/payments/vnpay/return';
    process.env.VNPAY_IPN_URL = 'https://api.example.test/api/payments/vnpay/ipn';
    jest.clearAllMocks();

    booking = {
      _id: BOOKING_ID,
      bookingCode: 'FB12345678',
      user: USER_ID,
      flight: FLIGHT_ID,
      seats: ['1A'],
      returnFlight: null,
      bookingStatus: 'pending',
      paymentStatus: 'pending',
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      pricing: { total: 2500000, currency: 'VND' },
    };
    redis = {
      isReady: true,
      get: jest.fn().mockResolvedValue(USER_ID),
      set: jest.fn().mockResolvedValue('OK'),
      eval: jest.fn().mockResolvedValue(1),
    };
    getRedisClient.mockReturnValue(redis);
    Booking.findById.mockResolvedValue(booking);
    Booking.updateOne.mockResolvedValue({ modifiedCount: 1 });
    Flight.findOne.mockResolvedValue({
      _id: FLIGHT_ID,
      flightNumber: 'VN100',
      seats: [{ seatNumber: '1A', status: 'available' }],
    });
    Flight.updateOne.mockResolvedValue({ modifiedCount: 1 });
  });

  it('creates and stores a signed payment URL for the authenticated booking', async () => {
    Booking.findOne.mockReturnValue({
      select: jest.fn().mockResolvedValue(booking),
    });
    const res = createResponse();
    await createVnpayPayment({
      params: { bookingId: BOOKING_ID },
      user: { _id: USER_ID },
      ip: '192.168.1.10',
      body: {
        clientReturnUrl: 'exp://192.168.1.10:8081/--/booking/payment',
      },
    }, res, (error) => { throw error; });

    const paymentUrl = new URL(res.body.data.paymentUrl);
    const parameters = Object.fromEntries(paymentUrl.searchParams.entries());
    expect(res.statusCode).toBe(200);
    expect(isValidSignature(parameters, 'test-secret')).toBe(true);
    expect(Booking.updateOne).toHaveBeenCalledWith(
      expect.objectContaining({
        _id: BOOKING_ID,
        user: USER_ID,
        bookingStatus: 'pending',
        paymentStatus: 'pending',
        vnpayPaymentUrl: { $exists: false },
      }),
      expect.objectContaining({
        $set: expect.objectContaining({
          paymentMethod: 'vnpay',
          bankCode: 'VNPAY',
          vnpayClientReturnUrl:
            'exp://192.168.1.10:8081/--/booking/payment',
        }),
      }),
    );
  });

  it('confirms the booking only after a signed, matching successful IPN', async () => {
    const res = createResponse();
    await handleVnpayIpn({ query: signedParameters() }, res);

    expect(res.body).toEqual({ RspCode: '00', Message: 'Confirm success' });
    expect(Flight.updateOne).toHaveBeenCalledTimes(1);
    expect(Booking.updateOne).toHaveBeenCalledWith(
      expect.objectContaining({
        _id: BOOKING_ID,
        bookingStatus: 'pending',
        paymentStatus: 'pending',
        'pricing.currency': 'VND',
        'pricing.total': 2500000,
      }),
      expect.objectContaining({
        $set: expect.objectContaining({
          paymentMethod: 'vnpay',
          bookingStatus: 'confirmed',
          paymentStatus: 'paid',
        }),
      }),
    );
    expect(redis.eval).toHaveBeenCalledTimes(2);
  });

  it('marks a verified failed transaction as failed and releases its holds', async () => {
    const res = createResponse();
    await handleVnpayIpn({
      query: signedParameters({
        vnp_ResponseCode: '24',
        vnp_TransactionStatus: '02',
      }),
    }, res);

    expect(res.body.RspCode).toBe('00');
    expect(Booking.updateOne).toHaveBeenCalledWith(
      expect.objectContaining({
        _id: BOOKING_ID,
        bookingStatus: 'pending',
        paymentStatus: 'pending',
      }),
      expect.objectContaining({
        $set: expect.objectContaining({
          paymentStatus: 'failed',
          bookingStatus: 'cancelled',
        }),
      }),
    );
    expect(redis.eval).toHaveBeenCalledTimes(2);
  });

  it('verifies the signed return and redirects to the originating app URL', async () => {
    const clientReturnUrl =
      'exp://192.168.1.10:8081/--/booking/payment';
    Booking.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue({
        ...booking,
        vnpayClientReturnUrl: clientReturnUrl,
      }),
    });
    const res = createResponse();
    await handleVnpayReturn({
      query: signedParameters(),
    }, res, (error) => { throw error; });

    expect(res.statusCode).toBe(303);
    expect(res.redirectUrl).toContain(`${clientReturnUrl}?`);
    expect(res.redirectUrl).toContain(`bookingId=${BOOKING_ID}`);
    expect(res.redirectUrl).toContain('gatewayStatus=success');
  });

  it('rejects a bad signature without looking up or changing a booking', async () => {
    const res = createResponse();
    await handleVnpayIpn({
      query: { ...signedParameters(), vnp_Amount: '1' },
    }, res);

    expect(res.body.RspCode).toBe('97');
    expect(Booking.findById).not.toHaveBeenCalled();
    expect(Booking.updateOne).not.toHaveBeenCalled();
  });

  it('rejects a correctly signed amount that differs from the stored booking total', async () => {
    const res = createResponse();
    await handleVnpayIpn({
      query: signedParameters({ vnp_Amount: '1' }),
    }, res);

    expect(res.body.RspCode).toBe('04');
    expect(Booking.updateOne).not.toHaveBeenCalled();
  });

  it('does not confirm or leave seats booked when a seat reservation fails', async () => {
    Flight.updateOne.mockResolvedValue({ modifiedCount: 0 });
    const res = createResponse();
    await handleVnpayIpn({ query: signedParameters() }, res);

    expect(res.body.RspCode).toBe('99');
    expect(Booking.updateOne).not.toHaveBeenCalled();
  });
});
