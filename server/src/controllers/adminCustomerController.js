const mongoose = require('mongoose');
const User = require('../models/User');
const Booking = require('../models/Booking');

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// GET /api/admin/customers
// Danh sách khách hàng, tìm kiếm và phân trang.
async function getCustomers(req, res, next) {
  try {
    const page = Math.max(
      1,
      Number.parseInt(req.query.page, 10) || 1
    );

    const limit = Math.min(
      100,
      Math.max(1, Number.parseInt(req.query.limit, 10) || 10)
    );

    const filter = { role: 'user' };

    const search = String(req.query.search || '').trim();

    if (search) {
      const regex = new RegExp(escapeRegex(search), 'i');

      filter.$or = [
        { fullName: regex },
        { email: regex },
        { phone: regex },
      ];
    }

    const [customers, total] = await Promise.all([
      User.find(filter)
        .select('fullName email phone role createdAt updatedAt')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),

      User.countDocuments(filter),
    ]);

    // Thống kê số booking của từng khách hàng trong trang hiện tại.
    const customerIds = customers.map((customer) => customer._id);

    const bookingCounts = await Booking.aggregate([
      {
        $match: {
          user: { $in: customerIds },
        },
      },
      {
        $group: {
          _id: '$user',
          bookingCount: { $sum: 1 },
        },
      },
    ]);

    const countMap = new Map(
      bookingCounts.map((item) => [
        String(item._id),
        item.bookingCount,
      ])
    );

    const data = customers.map((customer) => ({
      ...customer,
      bookingCount: countMap.get(String(customer._id)) || 0,
    }));

    return res.json({
      data,
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

// GET /api/admin/customers/:id
// Chi tiết một khách hàng.
async function getCustomerDetail(req, res, next) {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: 'ID khách hàng không hợp lệ',
      });
    }

    const customer = await User.findOne({
      _id: id,
      role: 'user',
    })
      .select('fullName email phone role createdAt updatedAt')
      .lean();

    if (!customer) {
      return res.status(404).json({
        message: 'Không tìm thấy khách hàng',
      });
    }

    const bookingCount = await Booking.countDocuments({
      user: customer._id,
    });

    return res.json({
      data: {
        ...customer,
        bookingCount,
      },
    });
  } catch (error) {
    next(error);
  }
}

// GET /api/admin/customers/:id/bookings
// Lịch sử đặt vé của khách hàng.
async function getCustomerBookings(req, res, next) {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: 'ID khách hàng không hợp lệ',
      });
    }

    const customer = await User.findOne({
      _id: id,
      role: 'user',
    })
      .select('_id')
      .lean();

    if (!customer) {
      return res.status(404).json({
        message: 'Không tìm thấy khách hàng',
      });
    }

    const page = Math.max(
      1,
      Number.parseInt(req.query.page, 10) || 1
    );

    const limit = Math.min(
      100,
      Math.max(1, Number.parseInt(req.query.limit, 10) || 10)
    );

    const filter = { user: customer._id };

    const [bookings, total] = await Promise.all([
      Booking.find(filter)
        .populate(
          'flight',
          'flightNumber airline origin destination departureAt arrivalAt status'
        )
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

module.exports = {
  getCustomers,
  getCustomerDetail,
  getCustomerBookings,
};