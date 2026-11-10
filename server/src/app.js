
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const authRoutes = require('./routes/authRoutes');
const flightRoutes = require('./routes/flightRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const adminRoutes = require('./routes/adminRoutes');
const aiRoutes = require('./routes/aiRoutes');
const {
  notFound,
  errorHandler,
} = require('./middleware/errorHandler');

const app = express();

// Security
app.use(helmet());

// CORS: Mobile App + Admin Portal
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  ...(process.env.CLIENT_URL
    ? process.env.CLIENT_URL.split(',').map((item) => item.trim())
    : []),
];

function isPrivateNetworkDevOrigin(origin) {
  if (process.env.NODE_ENV === 'production') {
    return false;
  }

  try {
    const url = new URL(origin);
    if (url.protocol !== 'http:') {
      return false;
    }

    const supportedPorts = new Set(['5173', '8081', '8082', '19006']);
    if (!supportedPorts.has(url.port)) {
      return false;
    }

    const hostname = url.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return true;
    }

    const octets = hostname.split('.').map(Number);
    if (
      octets.length !== 4 ||
      octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)
    ) {
      return false;
    }

    return (
      octets[0] === 10 ||
      (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) ||
      (octets[0] === 192 && octets[1] === 168)
    );
  } catch {
    return false;
  }
}

app.use(
  cors({
    origin(origin, callback) {
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        isPrivateNetworkDevOrigin(origin)
      ) {
        return callback(null, true);
      }

      return callback(null, false);
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

// Request middleware
app.use(express.json({ limit: '100kb' }));
app.use(morgan('dev'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'flight-booking-api',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/flights', flightRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/public', require('./routes/publicRoutes'));
// Admin API
app.use('/api/admin', adminRoutes);
app.use('/api/ai', aiRoutes);
// Error handlers - always last
app.use(notFound);
app.use(errorHandler);

module.exports = app;
