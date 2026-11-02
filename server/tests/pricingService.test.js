const { calculateBookingPrice } = require('../src/services/pricingService');

describe('booking price calculation', () => {
  it('applies the child fare to each flight leg', () => {
    const pricing = calculateBookingPrice({
      basePrice: 1_000_000,
      passengerCount: 2,
      passengerTypes: ['adult', 'child'],
      seatPrices: [0, 0],
      checkedBagCount: 0,
      protectionEnabled: false,
    });

    expect(pricing.baseFare).toBe(1_750_000);
    expect(pricing.total).toBe(1_750_000);
  });

  it('charges an infant fare without requiring a seat fee', () => {
    const pricing = calculateBookingPrice({
      basePrice: 1_000_000,
      passengerCount: 2,
      passengerTypes: ['adult', 'infant'],
      seatPrices: [0],
      checkedBagCount: 0,
      protectionEnabled: false,
    });

    expect(pricing.baseFare).toBe(1_100_000);
    expect(pricing.seatFee).toBe(0);
    expect(pricing.total).toBe(1_100_000);
  });
});
