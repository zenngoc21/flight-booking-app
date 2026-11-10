
const Flight = require('../models/Flight');

async function searchFlightsForAI({
  from,
  to,
  date,
  maxPrice = null,
  sort = 'best',
  cabinClass = 'economy',
}) {
  // Dùng cùng quy ước ngày UTC với API tìm kiếm chuyến bay hiện tại.
  const start = new Date(`${date}T00:00:00.000Z`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

  const filter = {
    'origin.code': from.toUpperCase(),
    'destination.code': to.toUpperCase(),
    departureAt: {
      $gte: start,
      $lt: end,
    },
    status: 'scheduled',

    // Chỉ lấy chuyến còn ghế trống ở hạng ghế được yêu cầu.
    seats: {
      $elemMatch: {
        status: 'available',
        cabinClass,
      },
    },
  };

  if (maxPrice !== null) {
    filter.basePrice = {
      $lte: maxPrice,
    };
  }

  // Lấy tối đa 100 kết quả trước khi sắp xếp.
  const flights = await Flight.find(filter)
    .select(
      'flightNumber airline origin destination departureAt arrivalAt basePrice currency stops baggageAllowanceKg'
    )
    .limit(100)
    .lean();

  // Sắp xếp chính xác theo tiêu chí được yêu cầu.
  flights.sort((a, b) => {
    if (sort === 'cheapest') {
      return (
        a.basePrice - b.basePrice ||
        new Date(a.departureAt) - new Date(b.departureAt)
      );
    }

    if (sort === 'fastest') {
      const durationA =
        new Date(a.arrivalAt).getTime() -
        new Date(a.departureAt).getTime();

      const durationB =
        new Date(b.arrivalAt).getTime() -
        new Date(b.departureAt).getTime();

      return durationA - durationB;
    }

    // best: ưu tiên giá thấp, sau đó giờ khởi hành.
    return (
      a.basePrice - b.basePrice ||
      new Date(a.departureAt) - new Date(b.departureAt)
    );
  });

  return flights.slice(0, 5).map((flight) => {
    const departure = new Date(flight.departureAt);
    const arrival = new Date(flight.arrivalAt);

    return {
      id: flight._id.toString(),
      flightNumber: flight.flightNumber,
      airline: flight.airline?.name || 'Chưa cập nhật',
      origin: flight.origin,
      destination: flight.destination,
      departureAt: flight.departureAt,
      arrivalAt: flight.arrivalAt,
      durationMinutes: Math.round(
        (arrival.getTime() - departure.getTime()) / 60000
      ),
      price: flight.basePrice,
      currency: flight.currency || 'VND',
      stops: flight.stops,
      baggageAllowanceKg: flight.baggageAllowanceKg,
    };
  });
}

module.exports = {
  searchFlightsForAI,
};
