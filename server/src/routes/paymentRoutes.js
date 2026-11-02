
const express = require('express');
const {
  getPaymentInfo,
  payDemo,
  createVnpayPayment,
  handleVnpayIpn,
  handleVnpayReturn,
} = require('../controllers/paymentController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/vnpay/ipn', handleVnpayIpn);
router.get('/vnpay/return', handleVnpayReturn);

router.use(requireAuth);

router.get('/:bookingId', getPaymentInfo);
router.post('/vnpay/:bookingId', createVnpayPayment);
router.post('/demo/:bookingId', payDemo);

module.exports = router;
