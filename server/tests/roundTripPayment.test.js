jest.mock('../src/models/Booking', () => ({
  findOne: jest.fn(),
  updateOne: jest.fn(),
}));
jest.mock('../src/models/Flight', () => ({
  findOne: jest.fn(),
  updateOne: jest.fn(),
}));
jest.mock('../src/config/redis', () => ({
  getRedisClient: jest.fn(),
}));

const Booking = require('../src/models/Booking');
const Flight = require('../src/models/Flight');
const { getRedisClient } = require('../src/config/redis');
const { payDemo } = require('../src/controllers/paymentController');

const USER_ID = '507f1f77bcf86cd799439010';
const BOOKING_ID = '507f1f77bcf86cd799439020';
const OUTBOUND_ID = '507f1f77bcf86cd799439011';
const RETURN_ID = '507f1f77bcf86cd799439012';

function createFlight(id, flightNumber, seatNumber) {
  return {
    _id: id,
    flightNumber,
    status: 'scheduled',
    departureAt: new Date(Date.now() + 60 * 60 * 1000),
    seats: [{ seatNumber, status: 'available' }],
  };
}

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

describe('round-trip demo payment', () => {
  let booking;
  let redis;

  beforeEach(() => {
    jest.clearAllMocks();

    booking = {
      _id: BOOKING_ID,
      user: USER_ID,
      flight: OUTBOUND_ID,
      seats: ['1A'],
      returnFlight: RETURN_ID,
      returnSeats: ['2A'],
      bookingStatus: 'pending',
      paymentStatus: 'pending',
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      bookingCode: 'FBROUNDTRIP',
      pricing: { total: 2500000, currency: 'VND' },
    };

    redis = {
      isReady: true,
      get: jest.fn().mockResolvedValue(USER_ID),
      set: jest.fn().mockResolvedValue('OK'),
      eval: jest.fn().mockResolvedValue(1),
    };

    Booking.findOne.mockResolvedValue(booking);
    Booking.updateOne.mockResolvedValue({ modifiedCount: 1 });
    getRedisClient.mockReturnValue(redis);
  });

  it('confirms one booking only after both legs reserve their seats', async () => {
    Flight.findOne
      .mockResolvedValueOnce(createFlight(OUTBOUND_ID, 'OUT100', '1A'))
      .mockResolvedValueOnce(createFlight(RETURN_ID, 'RET200', '2A'));
    Flight.updateOne
      .mockResolvedValueOnce({ modifiedCount: 1 })
      .mockResolvedValueOnce({ modifiedCount: 1 });

    const res = createResponse();
    await payDemo({
      params: { bookingId: BOOKING_ID },
      body: { outcome: 'success' },
      user: { _id: USER_ID },
    }, res, (error) => { throw error; });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.paymentStatus).toBe('paid');
    expect(res.body.data.bookingStatus).toBe('confirmed');
    expect(Flight.updateOne).toHaveBeenCalledTimes(2);
    expect(Booking.updateOne).toHaveBeenCalledTimes(1);
    expect(redis.eval).toHaveBeenCalledTimes(3);
  });

  it('rolls back the outbound reservation when the return leg cannot be reserved', async () => {
    Flight.findOne
      .mockResolvedValueOnce(createFlight(OUTBOUND_ID, 'OUT100', '1A'))
      .mockResolvedValueOnce(createFlight(RETURN_ID, 'RET200', '2A'));
    Flight.updateOne
      .mockResolvedValueOnce({ modifiedCount: 1 })
      .mockResolvedValueOnce({ modifiedCount: 0 })
      .mockResolvedValueOnce({ modifiedCount: 1 });

    const res = createResponse();
    await payDemo({
      params: { bookingId: BOOKING_ID },
      body: { outcome: 'success' },
      user: { _id: USER_ID },
    }, res, (error) => { throw error; });

    expect(res.statusCode).toBe(409);
    expect(Booking.updateOne).not.toHaveBeenCalled();
    expect(Flight.updateOne).toHaveBeenCalledTimes(3);
    expect(Flight.updateOne.mock.calls[2][0]._id).toBe(OUTBOUND_ID);
  });

  it('fails the shared booking and releases both legs when demo payment fails', async () => {
    const res = createResponse();
    await payDemo({
      params: { bookingId: BOOKING_ID },
      body: { outcome: 'failure' },
      user: { _id: USER_ID },
    }, res, (error) => { throw error; });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.paymentStatus).toBe('failed');
    expect(res.body.data.bookingStatus).toBe('cancelled');
    expect(Booking.updateOne).toHaveBeenCalledTimes(1);
    expect(redis.eval).toHaveBeenCalledTimes(3);
  });

  it('does not process a booking while another payment request owns its lock', async () => {
    redis.set.mockResolvedValue(null);

    const res = createResponse();
    await payDemo({
      params: { bookingId: BOOKING_ID },
      body: { outcome: 'success' },
      user: { _id: USER_ID },
    }, res, (error) => { throw error; });

    expect(res.statusCode).toBe(409);
    expect(Flight.findOne).not.toHaveBeenCalled();
    expect(Flight.updateOne).not.toHaveBeenCalled();
    expect(Booking.updateOne).not.toHaveBeenCalled();
  });
});
