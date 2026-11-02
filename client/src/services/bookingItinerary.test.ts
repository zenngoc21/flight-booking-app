import { describe, expect, it } from 'vitest';
import { getBookingItinerary } from './bookingItinerary';

describe('getBookingItinerary', () => {
  it('uses every populated leg of a multi-city booking', () => {
    const itinerary = getBookingItinerary({
      flight: null,
      legs: [
        {
          flight: {
            flightNumber: 'FB101',
            airline: { name: 'Air One', code: 'A1' },
            origin: { code: 'SGN' },
            destination: { code: 'HKG' },
          },
          seats: ['12A'],
        },
        {
          flight: {
            flightNumber: 'FB202',
            airline: { name: 'Air Two', code: 'A2' },
            origin: { code: 'HKG' },
            destination: { code: 'SIN' },
          },
          seats: ['14C'],
        },
      ],
    });

    expect(itinerary.map(({ flight, seats }) => [flight.flightNumber, seats])).toEqual([
      ['FB101', ['12A']],
      ['FB202', ['14C']],
    ]);
  });

  it('preserves the legacy one-way and round-trip booking shape', () => {
    const itinerary = getBookingItinerary({
      flight: { flightNumber: 'FB101' },
      seats: ['12A'],
      returnFlight: { flightNumber: 'FB202' },
      returnSeats: ['14C'],
    });

    expect(itinerary.map(({ flight, seats }) => [flight.flightNumber, seats])).toEqual([
      ['FB101', ['12A']],
      ['FB202', ['14C']],
    ]);
  });
});
