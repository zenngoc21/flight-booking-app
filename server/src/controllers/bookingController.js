const crypto = require('crypto');
const Flight = require('../models/Flight');
const Booking = require('../models/Booking');
const { getRedisClient } = require('../config/redis');
const { createBookingSchema } = require('../validators/schemas');
const { calculateBookingPrice } = require('../services/pricingService');

async function createBooking(req, res, next) {
  try {
    const data = createBookingSchema.parse(req.body);

    const legs = data.legs || [
      {
        flightId: data.flightId,
        seats: data.seats,
        checkedBagCount: data.checkedBagCount,
      },
      ...(data.returnFlightId
        ? [{
            flightId: data.returnFlightId,
            seats: data.returnSeats || [],
            checkedBagCount:
              data.returnCheckedBagCount ?? data.checkedBagCount,
          }]
        : []),
    ];

    if (legs.some((leg) => new Set(leg.seats).size !== leg.seats.length)) {
      return res.status(400).json({
        message: 'Không được chọn trùng ghế',
      });
    }

    if (new Set(legs.map((leg) => leg.flightId)).size !== legs.length) {
      return res.status(400).json({
        message: 'Chuyến bay chiều đi và chiều về phải khác nhau',
      });
    }

    const redis = getRedisClient();

    if (!redis || !redis.isReady) {
      return res.status(503).json({
        message: 'Dịch vụ giữ ghế tạm thời không khả dụng',
      });
    }

    const flights = await Promise.all(legs.map((leg) => Flight.findOne({
      _id: leg.flightId,
      status: 'scheduled',
      departureAt: { $gt: new Date() },
    })));

    if (flights.some((flight) => !flight)) {
      return res.status(404).json({
        message: 'Một chuyến bay không tồn tại hoặc đã khởi hành',
      });
    }

    for (let index = 1; index < flights.length; index += 1) {
      const previous = flights[index - 1];
      const current = flights[index];
      const isRoundTrip = !data.legs && flights.length === 2;
      const routeMatches = isRoundTrip
        ? previous.origin.code === current.destination.code &&
          previous.destination.code === current.origin.code
        : previous.destination.code === current.origin.code;

      if (!routeMatches || new Date(current.departureAt) <= new Date(previous.arrivalAt)) {
        return res.status(400).json({
          message: isRoundTrip
            ? 'Lịch trình chiều về không khớp với chiều đi'
            : `Chặng ${index + 1} không nối tiếp hợp lệ với chặng trước`,
        });
      }
    }

    const legPrices = [];
    const checkedBagCounts = legs.map((leg) => leg.checkedBagCount || 0);

    for (let index = 0; index < legs.length; index += 1) {
      const { flightId, seats } = legs[index];
      const flight = flights[index];
      const requestedCabinClass = legs[index].cabinClass || data.cabinClass;
      const selectedSeats = [];

      for (const seatNumber of seats) {
        const seat = flight.seats.find((item) => item.seatNumber === seatNumber);

        if (
          !seat ||
          seat.status !== 'available' ||
          (requestedCabinClass && seat.cabinClass !== requestedCabinClass)
        ) {
          return res.status(409).json({
            message: `Ghế ${seatNumber} trên chuyến ${flight.flightNumber} không còn khả dụng hoặc không thuộc hạng đã chọn`,
          });
        }

        const holder = await redis.get(`seat-hold:${flightId}:${seatNumber}`);
        if (holder !== req.user._id.toString()) {
          return res.status(409).json({
            message: `Bạn chưa giữ ghế ${seatNumber} trên chuyến ${flight.flightNumber} hoặc thời gian giữ ghế đã hết`,
          });
        }

        selectedSeats.push(seat);
      }

      legPrices.push(calculateBookingPrice({
        basePrice: flight.basePrice,
        passengerCount: data.passengers.length,
        passengerTypes: data.passengers.map((passenger) => passenger.passengerType || 'adult'),
        seatPrices: selectedSeats.map((seat) => seat.extraPrice),
        checkedBagCount: checkedBagCounts[index],
        protectionEnabled: data.protectionEnabled,
      }));
    }

    const outboundPrice = legPrices[0];
    const returnPrice = legPrices[1] || null;
    const pricing = {
      baseFare: outboundPrice.baseFare + (returnPrice?.baseFare || 0),
      seatFee: outboundPrice.seatFee + (returnPrice?.seatFee || 0),
      baggageFee: outboundPrice.baggageFee + (returnPrice?.baggageFee || 0),
      protectionFee: outboundPrice.protectionFee + (returnPrice?.protectionFee || 0),
      total: outboundPrice.total + (returnPrice?.total || 0),
      currency: outboundPrice.currency,
      outbound: outboundPrice,
      return: returnPrice,
      legs: legPrices,
    };

    const booking = await Booking.create({
      bookingCode: `FB${crypto.randomBytes(5).toString('hex').toUpperCase()}`,
      user: req.user._id,
      flight: flights[0]._id,
      returnFlight: flights[1]?._id || null,
      legs: legs.map((leg, index) => ({
        flight: flights[index]._id,
        seats: leg.seats,
        baggage: {
          checkedBagCount: checkedBagCounts[index],
          checkedBagPrice: 300000,
        },
        pricing: legPrices[index],
      })),
      passengers: data.passengers,
      seats: legs[0].seats,
      returnSeats: legs[1]?.seats || [],
      baggage: {
        outbound: {
          checkedBagCount: checkedBagCounts[0],
          checkedBagPrice: 300000,
        },
        return: {
          checkedBagCount: checkedBagCounts[1],
          checkedBagPrice: 300000,
        },
      },
      protection: {
        enabled: data.protectionEnabled,
        price: pricing.protectionFee,
      },
      pricing,
      paymentStatus: 'pending',
      bookingStatus: 'pending',
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });

    return res.status(201).json({
      message: 'Tạo booking thành công. Vui lòng thanh toán trong 10 phút.',
      data: {
        id: booking._id,
        bookingCode: booking.bookingCode,
        bookingStatus: booking.bookingStatus,
        paymentStatus: booking.paymentStatus,
        expiresAt: booking.expiresAt,
        pricing: booking.pricing,
        seats: booking.seats,
        returnSeats: booking.returnSeats,
        legs: booking.legs,
      },
    });
  } catch (error) {
    next(error);
  }
}


async function getMyBookings(req, res, next) {
  try {
    const now = new Date();

    // Không để booking chờ thanh toán tồn tại quá thời hạn.
    // Cập nhật trạng thái thay vì xóa booking.
    await Booking.updateMany(
      {
        user: req.user._id,
        bookingStatus: 'pending',
        expiresAt: { $lte: now },
      },
      {
        $set: { bookingStatus: 'expired' },
      },
    );

    const bookings = await Booking.find({
      user: req.user._id,
    })
      .populate({
        path: 'flight',
        select:
          'flightNumber airline origin destination departureAt arrivalAt basePrice currency status',
      })
      .populate({
        path: 'returnFlight',
        select:
          'flightNumber airline origin destination departureAt arrivalAt basePrice currency status',
      })
      .populate({
        path: 'legs.flight',
        select:
          'flightNumber airline origin destination departureAt arrivalAt basePrice currency status',
      })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    return res.json({
      count: bookings.length,
      data: bookings,
    });
  } catch (error) {
    next(error);
  }
}


module.exports = { createBooking, getMyBookings };