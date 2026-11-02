import { describe, expect, it } from 'vitest';
import { getRemainingSeconds } from './bookingTime';

describe('getRemainingSeconds', () => {
  it('returns the remaining whole seconds', () => {
    expect(getRemainingSeconds('2026-11-01T10:00:10.000Z', Date.UTC(2026, 10, 1, 10)))
      .toBe(10);
  });

  it('does not return a negative value after expiry', () => {
    expect(getRemainingSeconds('2026-11-01T10:00:00.000Z', Date.UTC(2026, 10, 1, 10, 0, 1)))
      .toBe(0);
  });

  it('treats an invalid expiry date as expired', () => {
    expect(getRemainingSeconds('not-a-date', Date.now())).toBe(0);
  });
});
