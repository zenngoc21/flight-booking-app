const mongoose = require('mongoose');
const Flight = require('../models/Flight');
const Booking = require('../models/Booking');
const User = require('../models/User');

async function getDashboard(req, res, next) {
  try {
    const now = new Date();

    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const startOfTomorrow = new Date(startOfDay);
    startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

    const [
      revenueResult,
      todayFlights,
      ticketsResult,
      customerCount,
      recentBookings,
      revenueChart,
      airlineLoad,
    ] = await Promise.all([
      // Chỉ tính doanh thu từ các booking đã thanh toán.
      Booking.aggregate([
        {
          $match: {
            paymentStatus: 'paid',
            bookingStatus: { $ne: 'cancelled' },
          },
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$pricing.total' },
          },
        },
      ]),

      Flight.countDocuments({
        departureAt: {
          $gte: startOfDay,
          $lt: startOfTomorrow,
        },
      }),

      Booking.aggregate([
        {
          $match: {
            paymentStatus: 'paid',
            bookingStatus: { $ne: 'cancelled' },
          },
        },
        {
          $group: {
            _id: null,
            totalTickets: { $sum: { $size: '$passengers' } },
          },
        },
      ]),

      User.countDocuments({ role: 'user' }),

      Booking.find()
        .sort({ createdAt: -1 })
        .limit(8)
        .populate('user', 'fullName email')
        .populate('flight', 'flightNumber origin destination departureAt')
        .lean(),

      // Doanh thu 7 ngày gần nhất.
      Booking.aggregate([
        {
          $match: {
            paymentStatus: 'paid',
            bookingStatus: { $ne: 'cancelled' },
            createdAt: {
              $gte: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000),
            },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$createdAt',
              },
            },
            revenue: { $sum: '$pricing.total' },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      // Tỷ lệ số ghế đã bán trên tổng số ghế đã cấu hình.
      Flight.aggregate([
        {
          $project: {
            airline: '$airline.name',
            totalSeats: { $size: { $ifNull: ['$seats', []] } },
            bookedSeats: {
              $size: {
                $filter: {
                  input: { $ifNull: ['$seats', []] },
                  as: 'seat',
                  cond: { $eq: ['$$seat.status', 'booked'] },
                },
              },
            },
          },
        },
        {
          $group: {
            _id: '$airline',
            totalSeats: { $sum: '$totalSeats' },
            bookedSeats: { $sum: '$bookedSeats' },
          },
        },
        {
          $project: {
            airline: '$_id',
            totalSeats: 1,
            bookedSeats: 1,
            loadFactor: {
              $cond: [
                { $gt: ['$totalSeats', 0] },
                {
                  $multiply: [
                    { $divide: ['$bookedSeats', '$totalSeats'] },
                    100,
                  ],
                },
                0,
              ],
            },
          },
        },
      ]),
    ]);

    return res.json({
      data: {
        overview: {
          totalRevenue: revenueResult[0]?.totalRevenue || 0,
          todayFlights,
          ticketsSold: ticketsResult[0]?.totalTickets || 0,
          totalCustomers: customerCount,
        },
        revenueChart,
        airlineLoad,
        recentBookings,
      },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { getDashboard };