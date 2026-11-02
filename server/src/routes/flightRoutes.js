const express = require('express');
const {
  searchFlights,
  searchAirports,
  getFlightById,
  getFlightSeats,
  holdSeats,
  releaseSeats,
} = require('../controllers/flightController');
const { requireAuth } = require('../middleware/auth');
const { checkBookingStatus } = require('../middleware/bookingStatus');
const router = express.Router();

router.get('/search', searchFlights);
router.get('/airports/search', searchAirports);

router.post('/:id/hold-seats', requireAuth, checkBookingStatus, holdSeats);
router.delete('/:id/hold-seats', requireAuth, releaseSeats);
router.get('/:id/seats', getFlightSeats);
router.get('/:id', getFlightById);

module.exports = router;