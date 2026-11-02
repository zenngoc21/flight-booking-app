const mongoose = require('mongoose');

const seatSchema = new mongoose.Schema(
  {
    seatNumber: {
      type: String,
      required: true,
      trim: true,
    },

    cabinClass: {
      type: String,
      enum: ['economy', 'premium_economy', 'business', 'first'],
      default: 'economy',
    },

    // Phụ phí ghế do server quản lý.
    extraPrice: {
      type: Number,
      min: 0,
      default: 0,
    },

    status: {
      type: String,
      enum: ['available', 'booked'],
      default: 'available',
    },
  },
  { _id: false }
);

const flightSchema = new mongoose.Schema(
  {
    flightNumber: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },

    airline: {
      name: { type: String, required: true },
      code: { type: String, required: true, uppercase: true },
      logoUrl: { type: String, default: '' },
    },

    origin: {
      code: { type: String, required: true, uppercase: true },
      city: { type: String, required: true },
      airport: { type: String, default: '' },
    },

    destination: {
      code: { type: String, required: true, uppercase: true },
      city: { type: String, required: true },
      airport: { type: String, default: '' },
    },

    departureAt: {
      type: Date,
      required: true,
      index: true,
    },

    arrivalAt: {
      type: Date,
      required: true,
    },

    basePrice: {
      type: Number,
      required: true,
      min: 0,
    },

    currency: {
      type: String,
      default: 'VND',
      uppercase: true,
    },

    stops: {
      type: Number,
      min: 0,
      default: 0,
    },

    baggageAllowanceKg: {
      type: Number,
      min: 0,
      default: 7,
    },

    amenities: [{ type: String }],

    seats: [seatSchema],

    status: {
      type: String,
      enum: ['scheduled', 'cancelled', 'completed'],
      default: 'scheduled',
      index: true,
    },
  },
  { timestamps: true }
);

flightSchema.index({
  'origin.code': 1,
  'destination.code': 1,
  departureAt: 1,
});

module.exports = mongoose.model('Flight', flightSchema);