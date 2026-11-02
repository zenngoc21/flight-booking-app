require('dotenv').config();

const mongoose = require('mongoose');
const Booking = require('../models/Booking');

async function removeBookingExpiryTtl() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error('Thiếu biến môi trường MONGODB_URI');
  }

  await mongoose.connect(uri);

  try {
    let indexes;

    try {
      indexes = await Booking.collection.indexes();
    } catch (error) {
      if (error.codeName === 'NamespaceNotFound') {
        console.log('Chưa có collection bookings; không cần di trú TTL.');
        return;
      }

      throw error;
    }

    const ttlIndex = indexes.find(
      (index) =>
        index.name === 'expiresAt_1' &&
        index.expireAfterSeconds !== undefined
    );

    if (!ttlIndex) {
      console.log('Không tìm thấy TTL index trên booking; không cần di trú.');
      return;
    }

    await Booking.collection.dropIndex(ttlIndex.name);
    console.log('Đã xóa TTL index; booking sẽ không bị MongoDB tự xóa.');
  } finally {
    await mongoose.disconnect();
  }
}

removeBookingExpiryTtl().catch((error) => {
  console.error('Không thể di trú TTL index booking:', error.message);
  process.exitCode = 1;
});
