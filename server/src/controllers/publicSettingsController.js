const Setting = require('../models/Setting');

exports.getPublicSettings = async (req, res, next) => {
  try {
    const settings = await Setting.findOne({ key: 'general' }).lean();

    return res.json({
      success: true,
      data: {
        siteName: settings?.siteName || 'Flight Booking',
        supportEmail: settings?.supportEmail || '',
        supportPhone: settings?.supportPhone || '',
        currency: settings?.currency || 'VND',
        timezone: settings?.timezone || 'Asia/Ho_Chi_Minh',
        bookingEnabled: settings?.bookingEnabled !== false,
        maintenanceMode: settings?.maintenanceMode === true,
        cancellationPolicy: settings?.cancellationPolicy || '',
      },
    });
  } catch (error) {
    return next(error);
  }
};