jest.mock('../src/models/Flight', () => ({
  findById: jest.fn(),
}));
jest.mock('../src/config/redis', () => ({
  getRedisClient: jest.fn(),
}));

const Flight = require('../src/models/Flight');
const { getRedisClient } = require('../src/config/redis');
const { holdSeats } = require('../src/controllers/flightController');

const USER_ID = '507f1f77bcf86cd799439010';
const FLIGHT_ID = '507f1f77bcf86cd799439011';

function createResponse() {
  const res = {
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
  return res;
}

describe('seat hold renewal', () => {
  let redis;

  beforeEach(() => {
    jest.clearAllMocks();
    Flight.findById.mockResolvedValue({
      status: 'scheduled',
      seats: [
        { seatNumber: '1A', status: 'available' },
        { seatNumber: '1B', status: 'available' },
      ],
    });
    redis = {
      isReady: true,
      eval: jest.fn().mockResolvedValue(1),
    };
    getRedisClient.mockReturnValue(redis);
  });

  it('renews seats already held by the same user', async () => {
    const res = createResponse();
    await holdSeats({
      params: { id: FLIGHT_ID },
      body: { seatNumbers: ['1A', '1B'] },
      user: { _id: USER_ID },
    }, res, (error) => { throw error; });

    expect(res.statusCode).toBe(200);
    expect(res.body.expiresInSeconds).toBe(600);
    expect(redis.eval).toHaveBeenCalledTimes(2);
    expect(redis.eval.mock.calls[0][1].arguments).toEqual([USER_ID, '600']);
  });

  it('does not renew a seat held by another user', async () => {
    redis.eval
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(1);

    const res = createResponse();
    await holdSeats({
      params: { id: FLIGHT_ID },
      body: { seatNumbers: ['1A', '1B'] },
      user: { _id: USER_ID },
    }, res, (error) => { throw error; });

    expect(res.statusCode).toBe(409);
    expect(res.body.message).toMatch(/đang được người khác giữ/);
    expect(redis.eval).toHaveBeenCalledTimes(3);
  });

  it('treats a string contention result as a conflict', async () => {
    redis.eval.mockResolvedValueOnce('0');

    const res = createResponse();
    await holdSeats({
      params: { id: FLIGHT_ID },
      body: { seatNumbers: ['1A'] },
      user: { _id: USER_ID },
    }, res, (error) => { throw error; });

    expect(res.statusCode).toBe(409);
    expect(res.body.message).toMatch(/đang được người khác giữ/);
  });

  it('passes Redis execution failures to the server error handler', async () => {
    const redisError = new Error('Redis connection lost');
    redis.eval.mockRejectedValueOnce(redisError);
    const next = jest.fn();

    const res = createResponse();
    await holdSeats({
      params: { id: FLIGHT_ID },
      body: { seatNumbers: ['1A'] },
      user: { _id: USER_ID },
    }, res, next);

    expect(next).toHaveBeenCalledWith(redisError);
    expect(res.statusCode).toBe(200);
  });
});
