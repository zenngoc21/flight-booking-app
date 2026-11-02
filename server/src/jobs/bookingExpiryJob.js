
const Booking = require('../models/Booking');
const { getRedisClient } = require('../config/redis');

async function releaseExpiredLocks(booking, redis) {
  if (!redis || !redis.isReady) return;

  const userId = booking.user.toString();
  const legs = Array.isArray(booking.legs) && booking.legs.length > 0
    ? booking.legs.map((leg) => ({
        flightId: leg.flight,
        seats: leg.seats || [],
      }))
    : [
        { flightId: booking.flight, seats: booking.seats },
        ...(booking.returnFlight
          ? [{ flightId: booking.returnFlight, seats: booking.returnSeats || [] }]
          : []),
      ];

  for (const { flightId: flightValue, seats } of legs) {
    const flightId = flightValue?._id
      ? flightValue._id.toString()
      : flightValue.toString();

    for (const seatNumber of seats) {
      const key = `seat-hold:${flightId}:${seatNumber}`;

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
      } catch (error) {
        console.error('Không thể giải phóng ghế:', error.message);
      }
    }
  }
}

async function expirePendingBookings() {
  try {
    const now = new Date();

    const expiredBookings = await Booking.find({
      bookingStatus: 'pending',
      paymentStatus: 'pending',
      expiresAt: { $lte: now },
    }).limit(100);

    const redis = getRedisClient();

    for (const booking of expiredBookings) {
      // Cập nhật có điều kiện để tránh ghi đè booking đã thanh toán.
      const result = await Booking.updateOne(
        {
          _id: booking._id,
          bookingStatus: 'pending',
          paymentStatus: 'pending',
          expiresAt: { $lte: now },
        },
        {
          $set: {
            bookingStatus: 'expired',
            paymentStatus: 'failed',
            failedAt: now,
          },
        }
      );

      if (result.modifiedCount === 1) {
        await releaseExpiredLocks(booking, redis);
        console.log(`Booking ${booking.bookingCode} đã hết hạn.`);
      }
    }
  } catch (error) {
    console.error('Booking expiry job error:', error.message);
  }
}

function startBookingExpiryJob() {
  // Chạy ngay khi server khởi động.
  expirePendingBookings();

  // Kiểm tra mỗi 15 giây.
  return setInterval(expirePendingBookings, 15000);
}

module.exports = {
  expirePendingBookings,
  startBookingExpiryJob,
};
