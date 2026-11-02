const mongoose = require('mongoose');
const Booking = require('../models/Booking');

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// GET /api/admin/bookings
async function getBookings(req, res, next) {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(
      100,
      Math.max(1, Number.parseInt(req.query.limit, 10) || 10)
    );

    const filter = {};

    if (req.query.search) {
      filter.bookingCode = {
        $regex: escapeRegex(String(req.query.search).trim()),
        $options: 'i',
      };
    }

    const allowedBookingStatuses = [
      'pending',
      'confirmed',
      'cancelled',
      'expired',
    ];

    const allowedPaymentStatuses = [
      'pending',
      'paid',
      'failed',
      'refunded',
    ];

    if (
      req.query.bookingStatus &&
      allowedBookingStatuses.includes(req.query.bookingStatus)
    ) {
      filter.bookingStatus = req.query.bookingStatus;
    }

    if (
      req.query.paymentStatus &&
      allowedPaymentStatuses.includes(req.query.paymentStatus)
    ) {
      filter.paymentStatus = req.query.paymentStatus;
    }

    // Đồng bộ các booking đã hết hạn thanh toán.
    await Booking.updateMany(
      {
        bookingStatus: 'pending',
        expiresAt: { $lte: new Date() },
      },
      {
        $set: { bookingStatus: 'expired' },
      }
    );

    const [bookings, total] = await Promise.all([
      Booking.find(filter)
        .populate('user', 'fullName email phone')
        .populate(
          'flight',
          'flightNumber airline origin destination departureAt arrivalAt status'
        )
        .populate(
          'returnFlight',
          'flightNumber airline origin destination departureAt arrivalAt status'
        )
        .populate({
          path: 'legs.flight',
          select: 'flightNumber airline origin destination departureAt arrivalAt status',
        })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),

      Booking.countDocuments(filter),
    ]);

    return res.json({
      data: bookings,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
}

// GET /api/admin/bookings/:id
async function getBookingDetail(req, res, next) {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: 'ID booking không hợp lệ',
      });
    }

    const booking = await Booking.findById(id)
      .populate('user', 'fullName email phone')
      .populate(
        'flight',
        'flightNumber airline origin destination departureAt arrivalAt basePrice currency status'
      )
      .populate(
        'returnFlight',
        'flightNumber airline origin destination departureAt arrivalAt basePrice currency status'
      )
      .populate({
        path: 'legs.flight',
        select: 'flightNumber airline origin destination departureAt arrivalAt basePrice currency status',
      })
      .lean();

    if (!booking) {
      return res.status(404).json({
        message: 'Không tìm thấy booking',
      });
    }

    return res.json({
      data: booking,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getBookings,
  getBookingDetail,
};