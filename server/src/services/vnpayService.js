const crypto = require('crypto');

const DEFAULT_GATEWAY_URL = 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';

function getVnpayConfig() {
  const { VNPAY_TMN_CODE, VNPAY_HASH_SECRET } = process.env;
  const missing = [
    !VNPAY_TMN_CODE && 'VNPAY_TMN_CODE',
    !VNPAY_HASH_SECRET && 'VNPAY_HASH_SECRET',
    !process.env.VNPAY_RETURN_URL && 'VNPAY_RETURN_URL',
    !process.env.VNPAY_IPN_URL && 'VNPAY_IPN_URL',
  ].filter(Boolean);

  if (missing.length) {
    const error = new Error(`Thiếu cấu hình VNPay: ${missing.join(', ')}`);
    error.status = 503;
    throw error;
  }

  return {
    tmnCode: VNPAY_TMN_CODE,
    hashSecret: VNPAY_HASH_SECRET,
    gatewayUrl: process.env.VNPAY_URL || DEFAULT_GATEWAY_URL,
    returnUrl: process.env.VNPAY_RETURN_URL,
    clientReturnUrl:
      process.env.VNPAY_CLIENT_RETURN_URL || 'client://booking/payment',
    webReturnUrl: process.env.VNPAY_WEB_RETURN_URL,
    orderType: process.env.VNPAY_ORDER_TYPE || 'other',
    locale: process.env.VNPAY_LOCALE || 'vn',
  };
}

function encodeQueryValue(value) {
  return encodeURIComponent(String(value)).replace(/%20/g, '+');
}

function buildCanonicalQuery(parameters) {
  return Object.keys(parameters)
    .filter((key) => key !== 'vnp_SecureHash' && key !== 'vnp_SecureHashType')
    .sort()
    .map((key) => `${key}=${encodeQueryValue(parameters[key])}`)
    .join('&');
}

function signParameters(parameters, secret) {
  return crypto
    .createHmac('sha512', secret)
    .update(buildCanonicalQuery(parameters), 'utf8')
    .digest('hex');
}

function isValidSignature(parameters, secret) {
  const providedSignature = parameters.vnp_SecureHash;
  if (
    typeof providedSignature !== 'string' ||
    !/^[a-f\d]{128}$/i.test(providedSignature)
  ) {
    return false;
  }

  const expectedSignature = signParameters(parameters, secret);
  return crypto.timingSafeEqual(
    Buffer.from(providedSignature.toLowerCase(), 'hex'),
    Buffer.from(expectedSignature, 'hex'),
  );
}

function isPrivateNetworkHost(hostname) {
  if (hostname === 'localhost' || hostname === '127.0.0.1') return true;
  const octets = hostname.split('.').map(Number);
  if (
    octets.length === 4 &&
    octets.every((octet) => Number.isInteger(octet) && octet >= 0 && octet <= 255)
  ) {
    return (
      octets[0] === 10 ||
      (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) ||
      (octets[0] === 192 && octets[1] === 168)
    );
  }
  return hostname === '[::1]' || hostname.startsWith('[fc') || hostname.startsWith('[fd');
}

function validateClientReturnUrl(value) {
  const config = getVnpayConfig();
  const input = value || config.clientReturnUrl;
  let target;
  let allowedReturnUrls;
  try {
    target = new URL(input);
    allowedReturnUrls = [
      config.clientReturnUrl,
      config.webReturnUrl,
    ].filter(Boolean).map((url) => new URL(url).toString());
  } catch {
    const error = new Error('Địa chỉ quay lại ứng dụng không hợp lệ');
    error.status = 400;
    throw error;
  }

  if (allowedReturnUrls.includes(target.toString())) return target.toString();
  if (process.env.NODE_ENV === 'production') {
    const error = new Error('Địa chỉ quay lại phải trùng cấu hình VNPay của server');
    error.status = 400;
    throw error;
  }

  const path = target.pathname.replace(/\/+$/, '');
  const isExpoGo =
    ['exp:', 'exps:'].includes(target.protocol) &&
    /\/--\/booking\/payment$/.test(path) &&
    (
      isPrivateNetworkHost(target.hostname) ||
      target.hostname === 'exp.host' ||
      target.hostname.endsWith('.expo.dev')
    );
  const isCustomAppScheme =
    target.protocol === 'client:' &&
    target.hostname === 'booking' &&
    target.pathname === '/payment';
  const isLocalWeb =
    ['http:', 'https:'].includes(target.protocol) &&
    isPrivateNetworkHost(target.hostname) &&
    (path === '/booking/payment' || /\/--\/booking\/payment$/.test(path));

  if (!isExpoGo && !isCustomAppScheme && !isLocalWeb) {
    const error = new Error('Địa chỉ quay lại không thuộc ứng dụng');
    error.status = 400;
    throw error;
  }
  return target.toString();
}

function formatVnpayDate(date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}${values.month}${values.day}${values.hour}${values.minute}${values.second}`;
}

function parseVnpayDate(value) {
  if (typeof value !== 'string' || !/^\d{14}$/.test(value)) return null;

  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(4, 6));
  const day = Number(value.slice(6, 8));
  const hour = Number(value.slice(8, 10));
  const minute = Number(value.slice(10, 12));
  const second = Number(value.slice(12, 14));
  const localTime = Date.UTC(year, month - 1, day, hour, minute, second);
  const check = new Date(localTime);

  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day ||
    check.getUTCHours() !== hour ||
    check.getUTCMinutes() !== minute ||
    check.getUTCSeconds() !== second
  ) {
    return null;
  }

  return new Date(localTime - 7 * 60 * 60 * 1000);
}

function createPaymentUrl({ booking, ipAddress }) {
  const config = getVnpayConfig();
  const amount = Number(booking.pricing?.total);
  if (
    !Number.isSafeInteger(amount) ||
    !Number.isSafeInteger(amount * 100) ||
    amount <= 0 ||
    booking.pricing?.currency !== 'VND'
  ) {
    const error = new Error('Booking có số tiền hoặc loại tiền không hợp lệ cho VNPay');
    error.status = 400;
    throw error;
  }

  const now = new Date();
  const expiresAt = new Date(booking.expiresAt);
  if (!Number.isFinite(expiresAt.getTime()) || expiresAt <= now) {
    const error = new Error('Booking đã hết thời hạn thanh toán');
    error.status = 410;
    throw error;
  }

  const parameters = {
    vnp_Version: '2.1.0',
    vnp_Command: 'pay',
    vnp_TmnCode: config.tmnCode,
    vnp_Amount: String(amount * 100),
    vnp_CurrCode: 'VND',
    vnp_TxnRef: booking._id.toString(),
    vnp_OrderInfo: `Thanh toan booking ${booking.bookingCode}`,
    vnp_OrderType: config.orderType,
    vnp_Locale: config.locale,
    vnp_ReturnUrl: config.returnUrl,
    vnp_IpAddr: ipAddress || '127.0.0.1',
    vnp_CreateDate: formatVnpayDate(now),
    vnp_ExpireDate: formatVnpayDate(expiresAt),
  };
  const query = buildCanonicalQuery(parameters);
  const secureHash = signParameters(parameters, config.hashSecret);

  return `${config.gatewayUrl}?${query}&vnp_SecureHash=${secureHash}`;
}

function getClientReturnUrl(parameters, clientReturnUrl) {
  const target = new URL(clientReturnUrl || getVnpayConfig().clientReturnUrl);
  target.searchParams.set('bookingId', String(parameters.vnp_TxnRef || ''));
  target.searchParams.set(
    'gatewayStatus',
    parameters.vnp_ResponseCode === '00' &&
      parameters.vnp_TransactionStatus === '00'
      ? 'success'
      : 'failed',
  );
  return target.toString();
}

module.exports = {
  buildCanonicalQuery,
  createPaymentUrl,
  getClientReturnUrl,
  getVnpayConfig,
  isValidSignature,
  formatVnpayDate,
  parseVnpayDate,
  signParameters,
  validateClientReturnUrl,
};
