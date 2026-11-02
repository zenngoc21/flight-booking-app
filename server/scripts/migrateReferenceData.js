require('dotenv').config();
const mongoose = require('mongoose');

const Flight = require('../src/models/Flight');
const Airline = require('../src/models/Airline');
const Airport = require('../src/models/Airport');

async function migrateReferenceData() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('Thiếu biến môi trường MONGODB_URI');
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Đã kết nối MongoDB');

    const flights = await Flight.find({})
      .select('airline origin destination')
      .lean();

    const airlineMap = new Map();
    const airportMap = new Map();

    for (const flight of flights) {
      // Thu thập hãng bay
      const airline = flight.airline;

      if (airline?.code) {
        const code = airline.code.trim().toUpperCase();

        airlineMap.set(code, {
          code,
          name: airline.name || code,
          logoUrl: airline.logoUrl || '',
          status: 'active',
        });
      }

      // Thu thập sân bay đi và đến
      for (const airport of [flight.origin, flight.destination]) {
        if (!airport?.code) continue;

        const code = airport.code.trim().toUpperCase();

        if (!airportMap.has(code)) {
          airportMap.set(code, {
            code,
            city: airport.city || '',
            airport: airport.airport || '',
            country: '',
            status: 'active',
          });
        }
      }
    }

    // Upsert hãng bay; chạy lại script không tạo bản ghi trùng
    for (const airline of airlineMap.values()) {
      await Airline.updateOne(
        { code: airline.code },
        { $setOnInsert: airline },
        { upsert: true }
      );
    }

    // Upsert sân bay
    for (const airport of airportMap.values()) {
      await Airport.updateOne(
        { code: airport.code },
        { $setOnInsert: airport },
        { upsert: true }
      );
    }

    console.log(`Đã xử lý ${airlineMap.size} hãng bay`);
    console.log(`Đã xử lý ${airportMap.size} sân bay`);
    console.log('Migration hoàn tất');
  } catch (error) {
    console.error('Migration thất bại:', error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

migrateReferenceData();