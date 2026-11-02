const express = require('express');
const {
  createBooking,
  getMyBookings,
} = require('../controllers/bookingController');
const { requireAuth } = require('../middleware/auth');
const { checkBookingStatus } = require('../middleware/bookingStatus');

const router = express.Router();

router.use(requireAuth);

router.post('/', checkBookingStatus, createBooking);
router.get('/my', getMyBookings);

module.exports = router;