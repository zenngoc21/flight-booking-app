const Booking = require('../src/models/Booking');

describe('Booking expiry', () => {
  it('does not automatically delete bookings after their payment deadline', () => {
    const ttlIndexes = Booking.schema
      .indexes()
      .filter(([, options]) => options.expireAfterSeconds !== undefined);

    expect(ttlIndexes).toHaveLength(0);
  });
});
