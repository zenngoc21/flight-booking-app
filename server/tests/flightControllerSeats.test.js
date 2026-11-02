jest.mock('../src/models/Flight', () => ({
  find: jest.fn(),
  findById: jest.fn(),
}));
jest.mock('../src/models/Airport', () => ({}));
jest.mock('../src/config/redis', () => ({
  getRedisClient: jest.fn(),
}));

const Flight = require('../src/models/Flight');
const { getRedisClient } = require('../src/config/redis');
const { getFlightSeats } = require('../src/controllers/flightController');

function createResponse() {
  return {
    statusCode: 200,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

describe('flight seat lookup', () => {
  it('only searches flights that have available inventory', async () => {
    const lean = jest.fn().mockResolvedValue([]);
    const limit = jest.fn().mockReturnValue({ lean });
    const select = jest.fn().mockReturnValue({ limit });
    const sort = jest.fn().mockReturnValue({ select });
    Flight.find.mockReturnValue({ sort });
    getRedisClient.mockReturnValue(null);
    const res = createResponse();

    await require('../src/controllers/flightController').searchFlights({
      query: {
        from: 'SGN',
        to: 'HKG',
        date: '2027-01-01',
        cabinClass: 'business',
        airlines: 'VN,VJ',
      },
    }, res, (error) => {
      throw error;
    });

    expect(Flight.find).toHaveBeenCalledWith(expect.objectContaining({
      seats: {
        $elemMatch: { status: 'available', cabinClass: 'business' },
      },
      'airline.code': { $in: ['VN', 'VJ'] },
    }));
    expect(res.statusCode).toBe(200);
  });

  it('returns an empty seat list without issuing an invalid empty Redis MGET', async () => {
    const flight = {
      _id: '507f1f77bcf86cd799439011',
      seats: [],
      status: 'scheduled',
    };
    Flight.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue(flight),
    });
    const redis = { isReady: true, mGet: jest.fn() };
    getRedisClient.mockReturnValue(redis);
    const res = createResponse();

    await getFlightSeats({ params: { id: flight._id } }, res, (error) => {
      throw error;
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toEqual([]);
    expect(redis.mGet).not.toHaveBeenCalled();
  });
});
