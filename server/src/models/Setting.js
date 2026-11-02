const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      default: 'general',
    },
    siteName: {
      type: String,
      default: 'Flight Booking',
      trim: true,
    },
    supportEmail: {
      type: String,
      default: '',
      trim: true,
    },
    supportPhone: {
      type: String,
      default: '',
      trim: true,
    },
    currency: {
      type: String,
      enum: ['VND', 'USD'],
      default: 'VND',
    },
    timezone: {
      type: String,
      default: 'Asia/Ho_Chi_Minh',
    },
    bookingEnabled: {
      type: Boolean,
      default: true,
    },
    maintenanceMode: {
      type: Boolean,
      default: false,
    },
    cancellationPolicy: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Setting', settingSchema);