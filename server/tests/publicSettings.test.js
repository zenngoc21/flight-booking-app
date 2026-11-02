jest.mock('../src/models/Setting', () => ({
  findOne: jest.fn(),
}));

const Setting = require('../src/models/Setting');
const {
  getPublicSettings,
} = require('../src/controllers/publicSettingsController');
const {
  checkBookingStatus,
} = require('../src/middleware/bookingStatus');

function createResponse() {
  const response = {
    statusCode: 200,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json: jest.fn(),
  };
  return response;
}

describe('public settings and booking status', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('exposes settings required by the client without admin-only data', async () => {
    const savedSettings = {
      siteName: 'Skyhaven',
      supportEmail: 'help@example.com',
      supportPhone: '0123456789',
      currency: 'USD',
      timezone: 'UTC',
      bookingEnabled: false,
      maintenanceMode: true,
      cancellationPolicy: 'Contact support to cancel.',
      secretField: 'not public',
    };
    Setting.findOne.mockReturnValue({
      lean: async () => savedSettings,
    });

    const response = createResponse();
    const next = jest.fn();

    await getPublicSettings({}, response, next);

    expect(response.json).toHaveBeenCalledWith({
      success: true,
      data: {
        siteName: 'Skyhaven',
        supportEmail: 'help@example.com',
        supportPhone: '0123456789',
        currency: 'USD',
        timezone: 'UTC',
        bookingEnabled: false,
        maintenanceMode: true,
        cancellationPolicy: 'Contact support to cancel.',
      },
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns project defaults when settings have not been saved yet', async () => {
    Setting.findOne.mockReturnValue({
      lean: async () => null,
    });
    const response = createResponse();
    const next = jest.fn();

    await getPublicSettings({}, response, next);

    expect(response.json).toHaveBeenCalledWith({
      success: true,
      data: {
        siteName: 'Flight Booking',
        supportEmail: '',
        supportPhone: '',
        currency: 'VND',
        timezone: 'Asia/Ho_Chi_Minh',
        bookingEnabled: true,
        maintenanceMode: false,
        cancellationPolicy: '',
      },
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('blocks booking while the system is in maintenance mode', async () => {
    Setting.findOne.mockReturnValue({
      lean: async () => ({ maintenanceMode: true, bookingEnabled: true }),
    });
    const response = createResponse();
    const next = jest.fn();

    await checkBookingStatus({}, response, next);

    expect(response.statusCode).toBe(503);
    expect(response.json).toHaveBeenCalledWith({
      success: false,
      code: 'MAINTENANCE_MODE',
      message: 'Hệ thống đang bảo trì. Vui lòng quay lại sau.',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('blocks booking when the admin disables new bookings', async () => {
    Setting.findOne.mockReturnValue({
      lean: async () => ({ maintenanceMode: false, bookingEnabled: false }),
    });
    const response = createResponse();
    const next = jest.fn();

    await checkBookingStatus({}, response, next);

    expect(response.statusCode).toBe(403);
    expect(response.json).toHaveBeenCalledWith({
      success: false,
      code: 'BOOKING_DISABLED',
      message: 'Hiện tại hệ thống chưa nhận đặt vé mới.',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('allows booking when settings permit it', async () => {
    Setting.findOne.mockReturnValue({
      lean: async () => ({ maintenanceMode: false, bookingEnabled: true }),
    });
    const next = jest.fn();

    await checkBookingStatus({}, createResponse(), next);

    expect(next).toHaveBeenCalledTimes(1);
  });
});
