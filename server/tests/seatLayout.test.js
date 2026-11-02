const { createDefaultSeats } = require('../src/services/seatLayout');

describe('default flight seat layout', () => {
  it('creates a unique 9-row layout with reservable seats', () => {
    const seats = createDefaultSeats();

    expect(seats).toHaveLength(54);
    expect(new Set(seats.map((seat) => seat.seatNumber)).size).toBe(54);
    expect(seats.every((seat) => seat.status === 'available')).toBe(true);
    expect(seats.find((seat) => seat.seatNumber === '1A')).toMatchObject({
      cabinClass: 'economy',
      extraPrice: 0,
    });
    expect(seats.find((seat) => seat.seatNumber === '7A')).toMatchObject({
      cabinClass: 'premium_economy',
      extraPrice: 150_000,
    });
  });
});
