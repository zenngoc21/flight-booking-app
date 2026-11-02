const express = require('express');

const {
  adminLogin,
  getAdminProfile,
} = require('../controllers/adminAuthController');

const {
  getDashboard,
} = require('../controllers/adminDashboardController');

const {
  getFlights,
  getFlightDetail,
  createFlight,
  updateFlight,
  deleteFlight,
} = require('../controllers/adminFlightController');
const {
  getBookings,
  getBookingDetail,
} = require('../controllers/adminBookingController');
const {
  getCustomers,
  getCustomerDetail,
  getCustomerBookings,
} = require('../controllers/adminCustomerController');

const { requireAdmin } = require('../middleware/adminAuth');
const {
  getAirlines,
  createAirline,
  updateAirline,
  deleteAirline,
  getAirports,
  createAirport,
  updateAirport,
  deleteAirport,
} = require('../controllers/adminReferenceDataController');
const {
  getSettings,
  updateSettings,
} = require('../controllers/adminSettingController');


const router = express.Router();

// Đăng nhập không cần token.
router.post('/login', adminLogin);

// Các API bên dưới bắt buộc phải đăng nhập Admin.
router.use(requireAdmin);

router.get('/me', getAdminProfile);
router.get('/dashboard', getDashboard);

// Quản lý hãng hàng không.
router.get('/airlines', getAirlines);
router.post('/airlines', createAirline);
router.put('/airlines/:id', updateAirline);
router.delete('/airlines/:id', deleteAirline);

// Quản lý sân bay.
router.get('/airports', getAirports);
router.post('/airports', createAirport);
router.put('/airports/:id', updateAirport);
router.delete('/airports/:id', deleteAirport);

// Quản lý chuyến bay.
router.get('/flights', getFlights);
router.get('/flights/:id', getFlightDetail);
router.post('/flights', createFlight);
router.put('/flights/:id', updateFlight);
router.delete('/flights/:id', deleteFlight);

// Quản lý đặt vé.
router.get('/bookings', getBookings);
router.get('/bookings/:id', getBookingDetail);


// Quản lý khách hàng.
router.get('/customers', getCustomers);
router.get('/customers/:id', getCustomerDetail);
router.get('/customers/:id/bookings', getCustomerBookings);
router.get('/settings', getSettings);
router.put('/settings', updateSettings);

module.exports = router;