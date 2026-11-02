const mongoose = require('mongoose');
const Flight = require('../models/Flight');
const { areValidSeatNumbers } = require('../validators/seatNumbers');
const { createDefaultSeats } = require('../services/seatLayout');

const allowedStatuses = ['scheduled', 'cancelled', 'completed'];

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

// GET /api/admin/flights
async function getFlights(req, res, next) {
  try {
    const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(
      Math.max(Number.parseInt(req.query.limit, 10) || 10, 1),
      100
    );

    const filter = {};

    if (req.query.search) {
      const keyword = req.query.search.trim();
      const safeKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      filter.$or = [
        { flightNumber: { $regex: safeKeyword, $options: 'i' } },
        { 'airline.name': { $regex: safeKeyword, $options: 'i' } },
        { 'origin.code': { $regex: safeKeyword, $options: 'i' } },
        { 'destination.code': { $regex: safeKeyword, $options: 'i' } },
      ];
    }

    if (req.query.status && allowedStatuses.includes(req.query.status)) {
      filter.status = req.query.status;
    }

    if (req.query.from) {
      filter['origin.code'] = req.query.from.trim().toUpperCase();
    }

    if (req.query.to) {
      filter['destination.code'] = req.query.to.trim().toUpperCase();
    }

    if (req.query.date) {
      const start = new Date(`${req.query.date}T00:00:00.000Z`);

      if (Number.isNaN(start.getTime())) {
        return res.status(400).json({
          message: 'Ngày tìm kiếm không hợp lệ',
        });
      }

      const end = new Date(start);
      end.setUTCDate(end.getUTCDate() + 1);

      filter.departureAt = { $gte: start, $lt: end };
    }

    const [flights, total] = await Promise.all([
      Flight.find(filter)
        .sort({ departureAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),

      Flight.countDocuments(filter),
    ]);

    return res.json({
      data: flights,
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

// GET /api/admin/flights/:id
async function getFlightDetail(req, res, next) {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: 'ID chuyến bay không hợp lệ',
      });
    }

    const flight = await Flight.findById(req.params.id);

    if (!flight) {
      return res.status(404).json({
        message: 'Không tìm thấy chuyến bay',
      });
    }

    return res.json({ data: flight });
  } catch (error) {
    next(error);
  }
}

// POST /api/admin/flights
async function createFlight(req, res, next) {
  try {
    const {
      flightNumber,
      airline,
      origin,
      destination,
      departureAt,
      arrivalAt,
      basePrice,
      currency,
      stops,
      baggageAllowanceKg,
      amenities,
      seats,
      status,
    } = req.body;

    if (
      !flightNumber ||
      !airline?.name ||
      !airline?.code ||
      !origin?.code ||
      !origin?.city ||
      !destination?.code ||
      !destination?.city ||
      !departureAt ||
      !arrivalAt ||
      basePrice === undefined
    ) {
      return res.status(400).json({
        message: 'Vui lòng nhập đầy đủ thông tin chuyến bay bắt buộc',
      });
    }

    if (new Date(arrivalAt) <= new Date(departureAt)) {
      return res.status(400).json({
        message: 'Thời gian đến phải sau thời gian khởi hành',
      });
    }

    if (status && !allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: 'Trạng thái chuyến bay không hợp lệ',
      });
    }

    if (
      seats !== undefined &&
      (!areValidSeatNumbers(seats) || seats.length === 0)
    ) {
      return res.status(400).json({
        message: 'Chuyến bay cần ít nhất một ghế hợp lệ, không trùng nhau',
      });
    }

    const flight = await Flight.create({
      flightNumber,
      airline,
      origin,
      destination,
      departureAt,
      arrivalAt,
      basePrice,
      currency,
      stops,
      baggageAllowanceKg,
      amenities,
      seats: seats ?? createDefaultSeats(),
      status,
    });

    return res.status(201).json({
      message: 'Tạo chuyến bay thành công',
      data: flight,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: 'Dữ liệu chuyến bay bị trùng',
      });
    }

    next(error);
  }
}

// PUT /api/admin/flights/:id
async function updateFlight(req, res, next) {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: 'ID chuyến bay không hợp lệ',
      });
    }

    const allowedFields = [
      'flightNumber',
      'airline',
      'origin',
      'destination',
      'departureAt',
      'arrivalAt',
      'basePrice',
      'currency',
      'stops',
      'baggageAllowanceKg',
      'amenities',
      'seats',
      'status',
    ];

    const updates = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (
      updates.seats !== undefined &&
      (!areValidSeatNumbers(updates.seats) || updates.seats.length === 0)
    ) {
      return res.status(400).json({
        message: 'Chuyến bay cần ít nhất một ghế hợp lệ, không trùng nhau',
      });
    }

    if (
      updates.status &&
      !allowedStatuses.includes(updates.status)
    ) {
      return res.status(400).json({
        message: 'Trạng thái chuyến bay không hợp lệ',
      });
    }

    const currentFlight = await Flight.findById(req.params.id);

    if (!currentFlight) {
      return res.status(404).json({
        message: 'Không tìm thấy chuyến bay',
      });
    }

    // Không cho phép sửa hoặc xóa ghế đã có người đặt.
    if (updates.seats !== undefined) {
      const submittedSeats = new Map(
        updates.seats.map((seat) => [seat.seatNumber, seat])
      );

      const bookedSeats = currentFlight.seats.filter(
        (seat) => seat.status === 'booked'
      );

      for (const bookedSeat of bookedSeats) {
        const submittedSeat = submittedSeats.get(bookedSeat.seatNumber);

        if (
          !submittedSeat ||
          submittedSeat.status !== 'booked' ||
          submittedSeat.cabinClass !== bookedSeat.cabinClass ||
          Number(submittedSeat.extraPrice) !== bookedSeat.extraPrice
        ) {
          return res.status(409).json({
            message: `Không thể sửa hoặc xóa ghế ${bookedSeat.seatNumber} vì ghế đã được đặt`,
          });
        }
      }
    }

    const departureAt =
      updates.departureAt || currentFlight.departureAt;

    const arrivalAt =
      updates.arrivalAt || currentFlight.arrivalAt;

    if (new Date(arrivalAt) <= new Date(departureAt)) {
      return res.status(400).json({
        message: 'Thời gian đến phải sau thời gian khởi hành',
      });
    }

    const flight = await Flight.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      {
        new: true,
        runValidators: true,
      }
    );

    return res.json({
      message: 'Cập nhật chuyến bay thành công',
      data: flight,
    });
  } catch (error) {
    next(error);
  }
}

// DELETE /api/admin/flights/:id
async function deleteFlight(req, res, next) {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: 'ID chuyến bay không hợp lệ',
      });
    }

    const flight = await Flight.findById(req.params.id);

    if (!flight) {
      return res.status(404).json({
        message: 'Không tìm thấy chuyến bay',
      });
    }

    // Không xóa chuyến bay đã có booking để tránh mất dữ liệu lịch sử.
    const Booking = require('../models/Booking');
    const hasBooking = await Booking.exists({
      flight: flight._id,
    });

    if (hasBooking) {
      return res.status(409).json({
        message: 'Chuyến bay đã có đặt vé. Hãy chuyển trạng thái thay vì xóa.',
      });
    }

    await flight.deleteOne();

    return res.json({
      message: 'Xóa chuyến bay thành công',
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getFlights,
  getFlightDetail,
  createFlight,
  updateFlight,
  deleteFlight,
};