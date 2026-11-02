const Flight = require('../models/Flight');
const Airport = require('../models/Airport');
const { searchFlightSchema } = require('../validators/schemas');
const { getRedisClient } = require('../config/redis');
const { isValidSeatNumber } = require('../validators/seatNumbers');

class SeatHoldConflictError extends Error {}


async function searchAirports(req, res, next) {
  try {
    const q = String(req.query.q || '').trim();
    if (q.length < 1) return res.json({ count: 0, data: [] });
    const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    let airports = await Airport.find({ status: 'active', $or: [
      { code: regex }, { city: regex }, { airport: regex }, { country: regex },
    ] }).select('code city airport country').sort({ city: 1 }).limit(8).lean();
    if (!airports.length) {
      const flights = await Flight.find({ $or: [
        { 'origin.code': regex }, { 'origin.city': regex }, { 'origin.airport': regex },
        { 'destination.code': regex }, { 'destination.city': regex }, { 'destination.airport': regex },
      ] }).select('origin destination').limit(100).lean();
      const byCode = new Map();
      for (const flight of flights) for (const airport of [flight.origin, flight.destination]) {
        if (airport?.code && regex.test(`${airport.code} ${airport.city} ${airport.airport || ''}`)) byCode.set(airport.code, { code: airport.code, city: airport.city, airport: airport.airport || '', country: '' });
      }
      airports = [...byCode.values()].slice(0, 8);
    }
    return res.json({ count: airports.length, data: airports });
  } catch (error) { next(error); }
}

async function searchFlights(req, res, next) {
  try {
    const query = searchFlightSchema.parse(req.query);

    if (query.from === query.to) {
      return res.status(400).json({
        message: 'Điểm đi và điểm đến không được trùng nhau',
      });
    }

    // Kiểm tra ngày lịch thực tế, tránh ngày như 2026-02-31.
    const [year, month, day] = query.date.split('-').map(Number);
    const requestedDate = new Date(Date.UTC(year, month - 1, day));

    if (
      requestedDate.getUTCFullYear() !== year ||
      requestedDate.getUTCMonth() !== month - 1 ||
      requestedDate.getUTCDate() !== day
    ) {
      return res.status(400).json({
        message: 'Ngày bay không hợp lệ',
      });
    }

    const start = new Date(`${query.date}T00:00:00.000Z`);
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

    const filter = {
      'origin.code': query.from,
      'destination.code': query.to,
      departureAt: { $gte: start, $lt: end },
      status: 'scheduled',
      seats: {
        $elemMatch: {
          status: 'available',
          cabinClass: query.cabinClass,
        },
      },
    };

    if (query.airlines?.length) {
      filter['airline.code'] = { $in: query.airlines };
    }

    if (query.stops === 'direct') {
      filter.stops = 0;
    }

    if (query.maxPrice !== undefined) {
      filter.basePrice = { $lte: query.maxPrice };
    }

    let sort = { departureAt: 1 };

    if (query.sort === 'cheapest') {
      sort = { basePrice: 1, departureAt: 1 };
    } else if (query.sort === 'fastest') {
      sort = { arrivalAt: 1 };
    }

    // Cache kết quả tìm kiếm trong 60 giây.
    const redis = getRedisClient();
    const cacheKey = `flight-search:v2:${JSON.stringify({
      ...query,
      date: query.date,
    })}`;

    if (redis) {
      try {
        const cached = await redis.get(cacheKey);

        if (cached) {
          return res.json({
            source: 'cache',
            ...JSON.parse(cached),
          });
        }
      } catch (error) {
        console.error('Redis cache read failed:', error.message);
      }
    }

    const flights = await Flight.find(filter)
      .sort(sort)
      .select('-seats')
      .limit(100)
      .lean();

    const result = {
      count: flights.length,
      data: flights,
    };

    if (redis) {
      try {
        await redis.setEx(cacheKey, 60, JSON.stringify(result));
      } catch (error) {
        console.error('Redis cache write failed:', error.message);
      }
    }

    return res.json({
      source: 'database',
      ...result,
    });
  } catch (error) {
    next(error);
  }
}

async function getFlightById(req, res, next) {
  try {
    const flight = await Flight.findById(req.params.id).select('-seats');

    if (!flight) {
      return res.status(404).json({
        message: 'Không tìm thấy chuyến bay',
      });
    }

    return res.json({ data: flight });
  } catch (error) {
    next(error);
  }
}

async function holdSeats(req, res, next) {
  try {
    const { seatNumbers } = req.body;

    if (
      !Array.isArray(seatNumbers) ||
      seatNumbers.length < 1 ||
      seatNumbers.length > 9 ||
      seatNumbers.some((seat) => !isValidSeatNumber(seat)) ||
      new Set(seatNumbers).size !== seatNumbers.length
    ) {
      return res.status(400).json({
        message: 'Danh sách ghế không hợp lệ',
      });
    }

    const redis = getRedisClient();

    if (!redis || !redis.isReady) {
      return res.status(503).json({
        message: 'Dịch vụ giữ ghế tạm thời không khả dụng',
      });
    }

    const flight = await Flight.findById(req.params.id);

    if (!flight || flight.status !== 'scheduled') {
      return res.status(404).json({
        message: 'Không tìm thấy chuyến bay khả dụng',
      });
    }

    for (const seatNumber of seatNumbers) {
      const seat = flight.seats.find(
        (item) => item.seatNumber === seatNumber
      );

      if (!seat || seat.status !== 'available') {
        return res.status(409).json({
          message: `Ghế ${seatNumber} không khả dụng`,
        });
      }
    }

    const acquiredKeys = [];
    const userId = req.user._id.toString();

    try {
      for (const seatNumber of seatNumbers) {
        const key = `seat-hold:${req.params.id}:${seatNumber}`;

        const result = await redis.eval(
          `local holder = redis.call("GET", KEYS[1])
           if not holder then
             redis.call("SET", KEYS[1], ARGV[1], "EX", ARGV[2])
             return 2
           end
           if holder == ARGV[1] then
             redis.call("EXPIRE", KEYS[1], ARGV[2])
             return 1
           end
           return 0`,
          {
            keys: [key],
            arguments: [userId, '600'],
          }
        );

        const resultCode = Number(result);

        if (resultCode === 0) {
          throw new SeatHoldConflictError(
            `Ghế ${seatNumber} đang được người khác giữ`
          );
        }

        if (resultCode === 2) {
          acquiredKeys.push(key);
        } else if (resultCode !== 1) {
          throw new Error('Redis trả về kết quả giữ ghế không hợp lệ');
        }
      }
    } catch (error) {
      // Chỉ giải phóng khóa do chính request này tạo.
      for (const key of acquiredKeys) {
        try {
          await redis.eval(
            `if redis.call("GET", KEYS[1]) == ARGV[1] then
               return redis.call("DEL", KEYS[1])
             end
             return 0`,
            {
              keys: [key],
              arguments: [userId],
            }
          );
        } catch (cleanupError) {
          console.error('Không thể hoàn tác giữ ghế:', cleanupError.message);
        }
      }

      if (error instanceof SeatHoldConflictError) {
        return res.status(409).json({ message: error.message });
      }

      return next(error);
    }

    return res.json({
      message: 'Giữ ghế thành công trong 10 phút',
      expiresInSeconds: 600,
      seatNumbers,
    });
  } catch (error) {
    next(error);
  }
}

async function releaseSeats(req, res, next) {
  try {
    const redis = getRedisClient();

    if (!redis || !redis.isReady) {
      return res.status(503).json({
        message: 'Dịch vụ giữ ghế tạm thời không khả dụng',
      });
    }

    const { seatNumbers } = req.body;

    if (!Array.isArray(seatNumbers) || seatNumbers.length > 9) {
      return res.status(400).json({
        message: 'Danh sách ghế không hợp lệ',
      });
    }

    const userId = req.user._id.toString();

    for (const seatNumber of new Set(seatNumbers)) {
      const key = `seat-hold:${req.params.id}:${seatNumber}`;

      // Dùng Lua để kiểm tra chủ sở hữu và xóa khóa nguyên tử.
      await redis.eval(
        `if redis.call("GET", KEYS[1]) == ARGV[1] then
           return redis.call("DEL", KEYS[1])
         else
           return 0
         end`,
        {
          keys: [key],
          arguments: [userId],
        }
      );
    }

    return res.json({ message: 'Đã xử lý yêu cầu nhả ghế' });
  } catch (error) {
    next(error);
  }
}

async function getFlightSeats(req, res, next) {
  try {
    const flight = await Flight.findById(req.params.id)
      .select('seats status departureAt');

    if (!flight) {
      return res.status(404).json({
        message: 'Không tìm thấy chuyến bay',
      });
    }

    if (flight.status !== 'scheduled') {
      return res.status(400).json({
        message: 'Chuyến bay không còn khả dụng',
      });
    }

    const redis = getRedisClient();
    let heldSeatNumbers = new Set();

    if (flight.seats.length > 0 && redis && redis.isReady) {
      try {
        const keys = flight.seats.map(
          (seat) => `seat-hold:${flight._id}:${seat.seatNumber}`
        );
        const holders = await redis.mGet(keys);

        heldSeatNumbers = new Set(
          flight.seats
            .filter((_, index) => holders[index] !== null)
            .map((seat) => seat.seatNumber)
        );
      } catch (error) {
        console.error(
          'Không thể kiểm tra trạng thái giữ ghế:',
          error.message
        );

        return res.status(503).json({
          message: 'Không thể kiểm tra trạng thái giữ ghế',
        });
      }
    }

    const seats = flight.seats.map((seat) => ({
      seatNumber: seat.seatNumber,
      cabinClass: seat.cabinClass,
      extraPrice: seat.extraPrice,
      status: seat.status,
      held: heldSeatNumbers.has(seat.seatNumber),
    }));

    return res.json({
      flightId: flight._id,
      count: seats.length,
      data: seats,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  searchFlights,
  searchAirports,
  getFlightById,
  holdSeats,
  releaseSeats,
  getFlightSeats,
};