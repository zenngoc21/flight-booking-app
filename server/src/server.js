require('dotenv').config();

const app = require('./app');
const connectDatabase = require('./config/database');
const { connectRedis } = require('./config/redis');
const { startBookingExpiryJob } = require('./jobs/bookingExpiryJob');
const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
      throw new Error('JWT_SECRET phải có ít nhất 32 ký tự');
    }

    await connectDatabase();

    // Redis chưa sẵn sàng thì vẫn cho phép chạy API không phụ thuộc Redis.
    // Những API giữ ghế sẽ trả về 503 cho đến khi Redis hoạt động.
    try {
      await connectRedis();
    } catch (error) {
      console.error('Không thể kết nối Redis:', error.message);
    }

    // Chỉ chạy job sau khi MongoDB đã kết nối thành công.
    startBookingExpiryJob();

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server đang chạy tại http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Không thể khởi động server:', error.message);
    process.exit(1);
  }
}

startServer();