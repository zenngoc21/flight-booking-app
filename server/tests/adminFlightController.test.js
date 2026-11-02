jest.mock('../src/models/Flight', () => ({
  create: jest.fn(),
}));

const Flight = require('../src/models/Flight');
const { createFlight } = require('../src/controllers/adminFlightController');

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

describe('admin flight creation', () => {
  it('provides a default seat layout when the form omits seat data', async () => {
    const flight = { _id: 'flight-id' };
    Flight.create.mockResolvedValue(flight);
    const res = createResponse();

    await createFlight({
      body: {
        flightNumber: 'VN123',
        airline: { name: 'Airline', code: 'VN' },
        origin: { code: 'SGN', city: 'Ho Chi Minh City' },
        destination: { code: 'HAN', city: 'Hanoi' },
        departureAt: '2027-01-01T10:00:00.000Z',
        arrivalAt: '2027-01-01T12:00:00.000Z',
        basePrice: 1_000_000,
      },
    }, res, (error) => {
      throw error;
    });

    const createdFlight = Flight.create.mock.calls[0][0];
    expect(res.statusCode).toBe(201);
    expect(createdFlight.seats).toHaveLength(54);
    expect(createdFlight.seats[0]).toMatchObject({
      seatNumber: '1A',
      status: 'available',
    });
  });
});
