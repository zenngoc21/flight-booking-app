const {
  areValidSeatNumbers,
  isValidSeatNumber,
} = require('../src/validators/seatNumbers');

describe('seat number validation', () => {
  it('accepts seat numbers supported by the mobile seat map', () => {
    expect(isValidSeatNumber('1A')).toBe(true);
    expect(isValidSeatNumber('99F')).toBe(true);
    expect(areValidSeatNumbers([{ seatNumber: '1A' }, { seatNumber: '10F' }]))
      .toBe(true);
  });

  it('rejects unsupported formats and duplicate seats', () => {
    expect(isValidSeatNumber('A1')).toBe(false);
    expect(isValidSeatNumber('100A')).toBe(false);
    expect(areValidSeatNumbers([{ seatNumber: '1A' }, { seatNumber: '1A' }]))
      .toBe(false);
    expect(areValidSeatNumbers([{ seatNumber: 'A1' }])).toBe(false);
    expect(areValidSeatNumbers(null)).toBe(false);
  });
});
