const Setting = require('../models/Setting');

exports.checkBookingStatus = async (req, res, next) => {
  try {
    const settings = await Setting.findOne({ key: 'general' }).lean();

    if (settings?.maintenanceMode) {
      return res.status(503).json({
        success: false,
        code: 'MAINTENANCE_MODE',
        message: 'Hệ thống đang bảo trì. Vui lòng quay lại sau.',
      });
    }

    if (settings?.bookingEnabled === false) {
      return res.status(403).json({
        success: false,
        code: 'BOOKING_DISABLED',
        message: 'Hiện tại hệ thống chưa nhận đặt vé mới.',
      });
    }

    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Không thể kiểm tra trạng thái đặt vé.',
    });
  }
};