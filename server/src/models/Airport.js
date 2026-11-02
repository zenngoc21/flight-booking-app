const mongoose = require('mongoose');

const airportSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      unique: true,
    },

    city: {
      type: String,
      required: true,
      trim: true,
    },

    airport: {
      type: String,
      required: true,
      trim: true,
    },

    country: {
      type: String,
      default: '',
      trim: true,
    },

    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Airport', airportSchema);