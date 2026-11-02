const mongoose = require('mongoose');

const passengerSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    gender: { type: String, enum: ['male', 'female', 'other'], required: true },
    passengerType: { type: String, enum: ['adult', 'child'], default: 'adult' },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    phone: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const legPricingSchema = new mongoose.Schema(
  {
    baseFare: { type: Number, required: true, min: 0 },
    seatFee: { type: Number, required: true, min: 0 },
    baggageFee: { type: Number, required: true, min: 0 },
    protectionFee: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const bookingLegSchema = new mongoose.Schema(
  {
    flight: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Flight',
      required: true,
    },
    seats: [{ type: String }],
    baggage: {
      checkedBagCount: { type: Number, min: 0, default: 0 },
      checkedBagPrice: { type: Number, min: 0, default: 0 },
    },
    pricing: { type: legPricingSchema, required: true },
  },
  { _id: false }
);

const bookingSchema = new mongoose.Schema(
  {
    bookingCode: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    flight: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Flight',
      required: true,
    },

    returnFlight: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Flight',
      default: null,
    },

    legs: [bookingLegSchema],

    passengers: {
      type: [passengerSchema],
      required: true,
      validate: {
        validator: (value) => value.length > 0 && value.length <= 9,
        message: 'Số hành khách phải từ 1 đến 9',
      },
    },

    seats: [{ type: String }],

    returnSeats: [{ type: String }],

    baggage: {
      outbound: {
        checkedBagCount: { type: Number, min: 0, default: 0 },
        checkedBagPrice: { type: Number, min: 0, default: 0 },
      },
      return: {
        checkedBagCount: { type: Number, min: 0, default: 0 },
        checkedBagPrice: { type: Number, min: 0, default: 0 },
      },
    },

    protection: {
      enabled: { type: Boolean, default: false },
      price: { type: Number, min: 0, default: 0 },
    },

    pricing: {
      baseFare: { type: Number, required: true, min: 0 },
      seatFee: { type: Number, required: true, min: 0 },
      baggageFee: { type: Number, required: true, min: 0 },
      protectionFee: { type: Number, required: true, min: 0 },
      total: { type: Number, required: true, min: 0 },
      currency: { type: String, default: 'VND' },
      outbound: { type: legPricingSchema, default: null },
      return: { type: legPricingSchema, default: null },
      legs: [legPricingSchema],
    },

    paymentMethod: { type: String, enum: ['bank_transfer', 'card', 'wallet', 'vnpay'], default: 'bank_transfer' },
    bankCode: { type: String, default: 'VCB', trim: true },
    vnpayPaymentUrl: { type: String, select: false },
    vnpayClientReturnUrl: { type: String, select: false },

    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending',
    },

    bookingStatus: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled', 'expired'],
      default: 'pending',
    },

   expiresAt: {
  type: Date,
  default: () => new Date(Date.now() + 10 * 60 * 1000),
  index: true,
},
paidAt: {
  type: Date,
  default: null,
},
failedAt: {
  type: Date,
  default: null,
},
  },
  { timestamps: true }
);

module.exports = mongoose.model('Booking', bookingSchema);