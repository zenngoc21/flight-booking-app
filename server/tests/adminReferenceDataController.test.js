jest.mock('../src/models/Airline', () => ({
  bulkWrite: jest.fn(),
  find: jest.fn(),
}));

jest.mock('../src/models/Airport', () => ({
  bulkWrite: jest.fn(),
  find: jest.fn(),
}));

jest.mock('../src/models/Flight', () => ({
  aggregate: jest.fn(),
  countDocuments: jest.fn(),
}));

const Airline = require('../src/models/Airline');
const Airport = require('../src/models/Airport');
const Flight = require('../src/models/Flight');
const {
  getAirlines,
  getAirports,
} = require('../src/controllers/adminReferenceDataController');

function createResponse() {
  return {
    json: jest.fn(),
  };
}

describe('admin reference data', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates missing airline references from existing flights before listing', async () => {
    Flight.aggregate.mockResolvedValue([
      { _id: 'VN', name: 'Vietnam Airlines', logoUrl: '' },
    ]);
    Flight.countDocuments.mockResolvedValue(3);
    Airline.find.mockReturnValue({
      sort: () => ({
        lean: async () => [
          { _id: 'airline-id', code: 'VN', name: 'Vietnam Airlines' },
        ],
      }),
    });

    const response = createResponse();
    const next = jest.fn();

    await getAirlines({}, response, next);

    expect(next).not.toHaveBeenCalled();
    expect(Airline.bulkWrite).toHaveBeenCalledWith([
      {
        updateOne: {
          filter: { code: 'VN' },
          update: {
            $setOnInsert: {
              code: 'VN',
              name: 'Vietnam Airlines',
              logoUrl: '',
              status: 'active',
            },
          },
          upsert: true,
        },
      },
    ]);
    expect(response.json).toHaveBeenCalledWith({
      success: true,
      data: [
        {
          _id: 'airline-id',
          code: 'VN',
          name: 'Vietnam Airlines',
          flightCount: 3,
        },
      ],
    });
  });

  it('creates missing airport references from existing flights before listing', async () => {
    Flight.aggregate.mockResolvedValue([
      { _id: 'SGN', city: 'Ho Chi Minh City', airport: 'Tan Son Nhat' },
    ]);
    Flight.countDocuments.mockResolvedValue(2);
    Airport.find.mockReturnValue({
      sort: () => ({
        lean: async () => [
          {
            _id: 'airport-id',
            code: 'SGN',
            city: 'Ho Chi Minh City',
            airport: 'Tan Son Nhat',
          },
        ],
      }),
    });

    const response = createResponse();
    const next = jest.fn();

    await getAirports({}, response, next);

    expect(next).not.toHaveBeenCalled();
    expect(Airport.bulkWrite).toHaveBeenCalledWith([
      {
        updateOne: {
          filter: { code: 'SGN' },
          update: {
            $setOnInsert: {
              code: 'SGN',
              city: 'Ho Chi Minh City',
              airport: 'Tan Son Nhat',
              country: '',
              status: 'active',
            },
          },
          upsert: true,
        },
      },
    ]);
    expect(response.json).toHaveBeenCalledWith({
      success: true,
      data: [
        {
          _id: 'airport-id',
          code: 'SGN',
          city: 'Ho Chi Minh City',
          airport: 'Tan Son Nhat',
          flightCount: 2,
        },
      ],
    });
  });
});
