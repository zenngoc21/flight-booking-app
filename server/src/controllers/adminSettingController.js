const Setting = require('../models/Setting');

const DEFAULT_SETTINGS = {
  key: 'general',
  siteName: 'Flight Booking',
  supportEmail: '',
  supportPhone: '',
  currency: 'VND',
  timezone: 'Asia/Ho_Chi_Minh',
  bookingEnabled: true,
  maintenanceMode: false,
  cancellationPolicy: '',
};

const EDITABLE_FIELDS = [
  'siteName',
  'supportEmail',
  'supportPhone',
  'currency',
  'timezone',
  'bookingEnabled',
  'maintenanceMode',
  'cancellationPolicy',
];

function validateSettingsUpdates(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return 'Dữ liệu cài đặt không hợp lệ.';
  }

  const unknownFields = Object.keys(body).filter(
    (field) => !EDITABLE_FIELDS.includes(field)
  );
  if (unknownFields.length > 0) {
    return `Trường cài đặt không được hỗ trợ: ${unknownFields.join(', ')}`;
  }

  if (
    body.siteName !== undefined &&
    (typeof body.siteName !== 'string' || !body.siteName.trim())
  ) {
    return 'Tên hệ thống không được để trống.';
  }

  for (const field of ['supportEmail', 'supportPhone', 'cancellationPolicy']) {
    if (body[field] !== undefined && typeof body[field] !== 'string') {
      return `Trường ${field} phải là chuỗi.`;
    }
  }

  if (
    body.supportEmail &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.supportEmail.trim())
  ) {
    return 'Email hỗ trợ không hợp lệ.';
  }

  if (
    body.currency !== undefined &&
    !['VND', 'USD'].includes(body.currency)
  ) {
    return 'Đơn vị tiền tệ chỉ hỗ trợ VND hoặc USD.';
  }

  if (
    body.timezone !== undefined &&
    !['Asia/Ho_Chi_Minh', 'UTC'].includes(body.timezone)
  ) {
    return 'Múi giờ không được hỗ trợ.';
  }

  for (const field of ['bookingEnabled', 'maintenanceMode']) {
    if (body[field] !== undefined && typeof body[field] !== 'boolean') {
      return `Trường ${field} phải là true hoặc false.`;
    }
  }

  return null;
}

exports.getSettings = async (req, res, next) => {
  try {
    const settings = await Setting.findOneAndUpdate(
      { key: 'general' },
      { $setOnInsert: DEFAULT_SETTINGS },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    return res.json({ success: true, data: settings });
  } catch (error) {
    return next(error);
  }
};

exports.updateSettings = async (req, res, next) => {
  try {
    const validationError = validateSettingsUpdates(req.body);
    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    const updates = {};

    for (const field of EDITABLE_FIELDS) {
      if (req.body[field] !== undefined) {
        updates[field] =
          typeof req.body[field] === 'string'
            ? req.body[field].trim()
            : req.body[field];
      }
    }

    const settings = await Setting.findOneAndUpdate(
      { key: 'general' },
      {
        $set: updates,
        $setOnInsert: { key: 'general' },
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );

    return res.json({
      success: true,
      message: 'Cập nhật cài đặt thành công',
      data: settings,
    });
  } catch (error) {
    return next(error);
  }
};