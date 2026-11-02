jest.mock('../src/models/Setting', () => ({
  findOneAndUpdate: jest.fn(),
}));

const Setting = require('../src/models/Setting');
const {
  getSettings,
  updateSettings,
} = require('../src/controllers/adminSettingController');

function createResponse() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };
}

describe('admin settings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('initializes project defaults when settings do not exist', async () => {
    const settings = { siteName: 'Flight Booking', currency: 'VND' };
    Setting.findOneAndUpdate.mockResolvedValue(settings);
    const response = createResponse();
    const next = jest.fn();

    await getSettings({}, response, next);

    expect(Setting.findOneAndUpdate).toHaveBeenCalledWith(
      { key: 'general' },
      {
        $setOnInsert: expect.objectContaining({
          key: 'general',
          siteName: 'Flight Booking',
          currency: 'VND',
          bookingEnabled: true,
          maintenanceMode: false,
        }),
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    expect(response.json).toHaveBeenCalledWith({
      success: true,
      data: settings,
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('updates settings without conflicting insert defaults', async () => {
    const settings = {
      siteName: 'Skyhaven',
      bookingEnabled: false,
      currency: 'VND',
    };
    Setting.findOneAndUpdate.mockResolvedValue(settings);
    const response = createResponse();
    const next = jest.fn();

    await updateSettings(
      {
        body: {
          siteName: '  Skyhaven  ',
          bookingEnabled: false,
        },
      },
      response,
      next
    );

    expect(Setting.findOneAndUpdate).toHaveBeenCalledWith(
      { key: 'general' },
      {
        $set: { siteName: 'Skyhaven', bookingEnabled: false },
        $setOnInsert: { key: 'general' },
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );
    expect(response.json).toHaveBeenCalledWith({
      success: true,
      message: 'Cập nhật cài đặt thành công',
      data: settings,
    });
    expect(next).not.toHaveBeenCalled();
  });

  it.each([
    [{ siteName: '   ' }, 'Tên hệ thống không được để trống.'],
    [{ supportEmail: 'not-an-email' }, 'Email hỗ trợ không hợp lệ.'],
    [{ currency: 'EUR' }, 'Đơn vị tiền tệ chỉ hỗ trợ VND hoặc USD.'],
    [{ bookingEnabled: 'false' }, 'Trường bookingEnabled phải là true hoặc false.'],
    [{ unknownField: true }, 'Trường cài đặt không được hỗ trợ: unknownField'],
  ])('rejects invalid settings updates', async (body, expectedMessage) => {
    const response = createResponse();
    const next = jest.fn();

    await updateSettings({ body }, response, next);

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({
      success: false,
      message: expectedMessage,
    });
    expect(Setting.findOneAndUpdate).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });
});