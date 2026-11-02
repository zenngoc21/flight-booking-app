jest.mock('../src/models/Booking', () => ({
  create: jest.fn(),
}));
jest.mock('../src/models/Flight', () => ({
  findOne: jest.fn(),
}));
jest.mock('../src/config/redis', () => ({
  getRedisClient: jest.fn(),
}));

const Booking = require('../src/models/Booking');
const Flight = require('../src/models/Flight');
const { getRedisClient } = require('../src/config/redis');
const { createBooking } = require('../src/controllers/bookingController');

const USER_ID = '507f1f77bcf86cd799439010';
const OUTBOUND_ID = '507f1f77bcf86cd799439011';
const RETURN_ID = '507f1f77bcf86cd799439012';

function createFlight({
  id,
  origin,
  destination,
  flightNumber,
  departureOffset,
  arrivalOffset,
  basePrice,
  seatNumber,
  extraPrice,
}) {
  return {
    _id: id,
    origin: { code: origin },
    destination: { code: destination },
    flightNumber,
    departureAt: new Date(Date.now() + departureOffset),
    arrivalAt: new Date(Date.now() + arrivalOffset),
    basePrice,
    seats: [{ seatNumber, status: 'available', extraPrice }],
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

describe('round-trip booking creation', () => {
  let redis;
  const passenger = {
    firstName: 'An',
    lastName: 'Nguyen',
    gender: 'other',
    passengerType: 'adult',
    email: 'an@example.com',
    phone: '0901234567',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    redis = {
      isReady: true,
      get: jest.fn().mockResolvedValue(USER_ID),
    };
    getRedisClient.mockReturnValue(redis);

    Flight.findOne
      .mockResolvedValueOnce(createFlight({
        id: OUTBOUND_ID,
        origin: 'SGN',
        destination: 'HKG',
        flightNumber: 'OUT100',
        departureOffset: 60 * 60 * 1000,
        arrivalOffset: 2 * 60 * 60 * 1000,
        basePrice: 1_000_000,
        seatNumber: '1A',
        extraPrice: 100_000,
      }))
      .mockResolvedValueOnce(createFlight({
        id: RETURN_ID,
        origin: 'HKG',
        destination: 'SGN',
        flightNumber: 'RET200',
        departureOffset: 3 * 60 * 60 * 1000,
        arrivalOffset: 4 * 60 * 60 * 1000,
        basePrice: 2_000_000,
        seatNumber: '2A',
        extraPrice: 200_000,
      }));

    Booking.create.mockImplementation(async (document) => ({
      ...document,
      _id: 'booking-id',
      bookingCode: 'FBROUNDTRIP',
    }));
  });

  it('creates one booking with held seats and server-calculated totals for both legs', async () => {
    const res = createResponse();
    const req = {
      user: { _id: USER_ID },
      body: {
        flightId: OUTBOUND_ID,
        seats: ['1A'],
        returnFlightId: RETURN_ID,
        returnSeats: ['2A'],
        passengers: [passenger],
        checkedBagCount: 1,
        returnCheckedBagCount: 2,
        protectionEnabled: true,
      },
    };

    await createBooking(req, res, (error) => { throw error; });

    expect(res.statusCode).toBe(201);
    expect(Booking.create).toHaveBeenCalledTimes(1);
    expect(Booking.create).toHaveBeenCalledWith(expect.objectContaining({
      flight: OUTBOUND_ID,
      returnFlight: RETURN_ID,
      seats: ['1A'],
      returnSeats: ['2A'],
      baggage: {
        outbound: { checkedBagCount: 1, checkedBagPrice: 300_000 },
        return: { checkedBagCount: 2, checkedBagPrice: 300_000 },
      },
      bookingStatus: 'pending',
      paymentStatus: 'pending',
      pricing: expect.objectContaining({
        baseFare: 3_000_000,
        seatFee: 300_000,
        baggageFee: 900_000,
        protectionFee: 60_000,
        total: 4_260_000,
        outbound: expect.objectContaining({
          total: 1_420_000,
        }),
        return: expect.objectContaining({
          baggageFee: 600_000,
          total: 2_840_000,
        }),
      }),
    }));
    expect(redis.get).toHaveBeenCalledTimes(2);
  });

  it('rejects a held return seat that is owned by another user', async () => {
    redis.get
      .mockResolvedValueOnce(USER_ID)
      .mockResolvedValueOnce('another-user');

    const res = createResponse();
    await createBooking({
      user: { _id: USER_ID },
      body: {
        flightId: OUTBOUND_ID,
        seats: ['1A'],
        returnFlightId: RETURN_ID,
        returnSeats: ['2A'],
        passengers: [passenger],
        checkedBagCount: 0,
        protectionEnabled: false,
      },
    }, res, (error) => { throw error; });

    expect(res.statusCode).toBe(409);
    expect(Booking.create).not.toHaveBeenCalled();
  });

  it('creates a single booking covering multiple connected flight legs', async () => {
    Flight.findOne
      .mockReset()
      .mockResolvedValueOnce(createFlight({
        id: OUTBOUND_ID,
        origin: 'SGN',
        destination: 'HKG',
        flightNumber: 'LEG100',
        departureOffset: 60 * 60 * 1000,
        arrivalOffset: 2 * 60 * 60 * 1000,
        basePrice: 1_000_000,
        seatNumber: '1A',
        extraPrice: 50_000,
      }))
      .mockResolvedValueOnce(createFlight({
        id: RETURN_ID,
        origin: 'HKG',
        destination: 'SIN',
        flightNumber: 'LEG200',
        departureOffset: 3 * 60 * 60 * 1000,
        arrivalOffset: 4 * 60 * 60 * 1000,
        basePrice: 1_500_000,
        seatNumber: '2A',
        extraPrice: 0,
      }));

    const res = createResponse();
    await createBooking({
      user: { _id: USER_ID },
      body: {
        legs: [
          { flightId: OUTBOUND_ID, seats: ['1A'], checkedBagCount: 0 },
          { flightId: RETURN_ID, seats: ['2A'], checkedBagCount: 1 },
        ],
        passengers: [passenger],
        protectionEnabled: false,
      },
    }, res, (error) => { throw error; });

    expect(res.statusCode).toBe(201);
    expect(Booking.create).toHaveBeenCalledWith(expect.objectContaining({
      flight: OUTBOUND_ID,
      legs: expect.arrayContaining([
        expect.objectContaining({ flight: OUTBOUND_ID, seats: ['1A'] }),
        expect.objectContaining({ flight: RETURN_ID, seats: ['2A'] }),
      ]),
      pricing: expect.objectContaining({
        total: 2_850_000,
        legs: expect.arrayContaining([
          expect.objectContaining({ total: 1_050_000 }),
          expect.objectContaining({ total: 1_800_000 }),
        ]),
      }),
    }));
    expect(redis.get).toHaveBeenCalledTimes(2);
  });

  it('rejects a multi-city itinerary whose legs do not connect', async () => {
    Flight.findOne
      .mockReset()
      .mockResolvedValueOnce(createFlight({
        id: OUTBOUND_ID,
        origin: 'SGN',
        destination: 'HKG',
        flightNumber: 'LEG100',
        departureOffset: 60 * 60 * 1000,
        arrivalOffset: 2 * 60 * 60 * 1000,
        basePrice: 1_000_000,
        seatNumber: '1A',
        extraPrice: 0,
      }))
      .mockResolvedValueOnce(createFlight({
        id: RETURN_ID,
        origin: 'SIN',
        destination: 'NRT',
        flightNumber: 'LEG200',
        departureOffset: 3 * 60 * 60 * 1000,
        arrivalOffset: 4 * 60 * 60 * 1000,
        basePrice: 1_000_000,
        seatNumber: '2A',
        extraPrice: 0,
      }));

    const res = createResponse();
    await createBooking({
      user: { _id: USER_ID },
      body: {
        legs: [
          { flightId: OUTBOUND_ID, seats: ['1A'] },
          { flightId: RETURN_ID, seats: ['2A'] },
        ],
        passengers: [passenger],
        protectionEnabled: false,
      },
    }, res, (error) => { throw error; });

    expect(res.statusCode).toBe(400);
    expect(Booking.create).not.toHaveBeenCalled();
  });
});
