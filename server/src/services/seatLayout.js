function createDefaultSeats() {
  const seats = [];

  for (let row = 1; row <= 9; row += 1) {
    for (const letter of ['A', 'B', 'C', 'D', 'E', 'F']) {
      seats.push({
        seatNumber: `${row}${letter}`,
        cabinClass: row <= 6 ? 'economy' : 'premium_economy',
        extraPrice: row <= 6 ? 0 : 150_000,
        status: 'available',
      });
    }
  }

  return seats;
}

module.exports = { createDefaultSeats };
