const SEAT_NUMBER_PATTERN = /^[1-9]\d{0,1}[A-F]$/;

function isValidSeatNumber(seatNumber) {
  return (
    typeof seatNumber === 'string' &&
    SEAT_NUMBER_PATTERN.test(seatNumber)
  );
}

function areValidSeatNumbers(seats) {
  if (!Array.isArray(seats)) {
    return false;
  }

  const seatNumbers = seats.map((seat) => seat?.seatNumber);

  return (
    seatNumbers.every(isValidSeatNumber) &&
    new Set(seatNumbers).size === seatNumbers.length
  );
}

module.exports = {
  isValidSeatNumber,
  areValidSeatNumbers,
};
