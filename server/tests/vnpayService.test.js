const {
  createPaymentUrl,
  formatVnpayDate,
  isValidSignature,
  parseVnpayDate,
  signParameters,
  validateClientReturnUrl,
} = require('../src/services/vnpayService');

describe('VNPay service', () => {
  const savedEnvironment = {};

  beforeAll(() => {
    for (const key of [
      'VNPAY_TMN_CODE',
      'VNPAY_HASH_SECRET',
      'VNPAY_RETURN_URL',
      'VNPAY_IPN_URL',
      'VNPAY_WEB_RETURN_URL',
      'NODE_ENV',
    ]) {
      savedEnvironment[key] = process.env[key];
    }
  });

  beforeEach(() => {
    process.env.VNPAY_TMN_CODE = 'TESTCODE';
    process.env.VNPAY_HASH_SECRET = 'test-secret';
    process.env.VNPAY_RETURN_URL = 'https://api.example.test/api/payments/vnpay/return';
    process.env.VNPAY_IPN_URL = 'https://api.example.test/api/payments/vnpay/ipn';
  });

  afterAll(() => {
    for (const [key, value] of Object.entries(savedEnvironment)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it('creates a signed Sandbox payment URL with amount in xu', () => {
    const url = new URL(createPaymentUrl({
      booking: {
        _id: '507f1f77bcf86cd799439020',
        bookingCode: 'FB12345678',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        pricing: { total: 1250000, currency: 'VND' },
      },
      ipAddress: '192.168.1.10',
    }));
    const parameters = Object.fromEntries(url.searchParams.entries());

    expect(url.origin).toBe('https://sandbox.vnpayment.vn');
    expect(url.pathname).toBe('/paymentv2/vpcpay.html');
    expect(parameters.vnp_TmnCode).toBe('TESTCODE');
    expect(parameters.vnp_Amount).toBe('125000000');
    expect(parameters.vnp_TxnRef).toBe('507f1f77bcf86cd799439020');
    expect(parameters.vnp_IpAddr).toBe('192.168.1.10');
    expect(isValidSignature(parameters, 'test-secret')).toBe(true);
  });

  it('canonicalizes and verifies callback signatures without trusting a modified amount', () => {
    const parameters = {
      vnp_Amount: '100000',
      vnp_OrderInfo: 'Thanh toan booking A B',
      vnp_TmnCode: 'TESTCODE',
      vnp_TxnRef: '507f1f77bcf86cd799439020',
    };
    const callback = {
      ...parameters,
      vnp_SecureHash: signParameters(parameters, 'test-secret'),
    };

    expect(isValidSignature(callback, 'test-secret')).toBe(true);
    expect(isValidSignature({ ...callback, vnp_Amount: '200000' }, 'test-secret')).toBe(false);
  });

  it('parses VNPay timestamps as Vietnam local time and rejects invalid dates', () => {
    expect(parseVnpayDate('20260102123456').toISOString()).toBe(
      '2026-01-02T05:34:56.000Z',
    );
    expect(parseVnpayDate('20260230123456')).toBeNull();
    expect(parseVnpayDate('not-a-date')).toBeNull();
    expect(formatVnpayDate(new Date('2026-01-02T05:34:56.000Z'))).toBe(
      '20260102123456',
    );
  });

  it('rejects non-VND or expired bookings', () => {
    expect(() => createPaymentUrl({
      booking: {
        _id: '507f1f77bcf86cd799439020',
        bookingCode: 'FB12345678',
        expiresAt: new Date(Date.now() + 60_000),
        pricing: { total: 100, currency: 'USD' },
      },
      ipAddress: '127.0.0.1',
    })).toThrow(/loại tiền không hợp lệ/);

    expect(() => createPaymentUrl({
      booking: {
        _id: '507f1f77bcf86cd799439020',
        bookingCode: 'FB12345678',
        expiresAt: new Date(Date.now() - 1000),
        pricing: { total: 100, currency: 'VND' },
      },
      ipAddress: '127.0.0.1',
    })).toThrow(/hết thời hạn/);
  });

  it('accepts Expo Go callbacks in development and rejects arbitrary redirect targets', () => {
    expect(
      validateClientReturnUrl('exp://192.168.1.10:8081/--/booking/payment'),
    ).toBe('exp://192.168.1.10:8081/--/booking/payment');
    expect(
      validateClientReturnUrl('exp://192.168.1.10:8081/booking/payment'),
    ).toBe('exp://192.168.1.10:8081/booking/payment');
    expect(
      validateClientReturnUrl('exp://abc123.exp.direct/--/booking/payment'),
    ).toBe('exp://abc123.exp.direct/--/booking/payment');
    expect(
      validateClientReturnUrl('exps://abc123.expo.io/--/booking/payment'),
    ).toBe('exps://abc123.expo.io/--/booking/payment');
    expect(
      validateClientReturnUrl('exp://u.expo.dev/--/booking/payment'),
    ).toBe('exp://u.expo.dev/--/booking/payment');
    expect(
      validateClientReturnUrl('http://localhost:8081/booking/payment'),
    ).toBe('http://localhost:8081/booking/payment');
    expect(() =>
      validateClientReturnUrl('exp://attacker.example/--/booking/payment'),
    ).toThrow(/không thuộc ứng dụng/);
    expect(() => validateClientReturnUrl('https://attacker.example/steal')).toThrow(
      /không thuộc ứng dụng/,
    );
  });

  it('only accepts the explicitly configured web return URL in production', () => {
    process.env.NODE_ENV = 'production';
    process.env.VNPAY_WEB_RETURN_URL =
      'https://flight.example.test/booking/payment';

    expect(
      validateClientReturnUrl('https://flight.example.test/booking/payment'),
    ).toBe('https://flight.example.test/booking/payment');
    expect(() =>
      validateClientReturnUrl('https://attacker.example/booking/payment'),
    ).toThrow(/phải trùng cấu hình/);
  });
});
