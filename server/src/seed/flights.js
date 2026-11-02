
require('dotenv').config();

const Flight = require('../models/Flight');
const connectDatabase = require('../config/database');
const { createDefaultSeats } = require('../services/seatLayout');

const routes = [
  {
    from: { code: 'SGN', city: 'TP. Hồ Chí Minh', airport: 'Tân Sơn Nhất' },
    to: { code: 'HAN', city: 'Hà Nội', airport: 'Nội Bài' },
    airlines: [
      { name: 'Vietnam Airlines', code: 'VN' },
      { name: 'VietJet Air', code: 'VJ' },
    ],
    durationHours: 2,
    price: 1800000,
  },
  {
    from: { code: 'SGN', city: 'TP. Hồ Chí Minh', airport: 'Tân Sơn Nhất' },
    to: { code: 'HKG', city: 'Hong Kong', airport: 'Hong Kong International' },
    airlines: [
      { name: 'Vietnam Airlines', code: 'VN' },
      { name: 'VietJet Air', code: 'VJ' },
    ],
    durationHours: 3,
    price: 3500000,
  },
  {
    from: { code: 'HAN', city: 'Hà Nội', airport: 'Nội Bài' },
    to: { code: 'DAD', city: 'Đà Nẵng', airport: 'Đà Nẵng' },
    airlines: [
      { name: 'Vietnam Airlines', code: 'VN' },
      { name: 'Bamboo Airways', code: 'QH' },
    ],
    durationHours: 1.5,
    price: 1200000,
  },
  {
    from: { code: 'SGN', city: 'TP. Hồ Chí Minh', airport: 'Tân Sơn Nhất' },
    to: { code: 'BKK', city: 'Bangkok', airport: 'Suvarnabhumi' },
    airlines: [
      { name: 'Vietnam Airlines', code: 'VN' },
      { name: 'VietJet Air', code: 'VJ' },
    ],
    durationHours: 1.75,
    price: 2800000,
  },
];

function buildFlights() {
  const flights = [];
  const now = new Date();

  for (let dayOffset = 1; dayOffset <= 14; dayOffset++) {
    for (let routeIndex = 0; routeIndex < routes.length; routeIndex++) {
      const route = routes[routeIndex];

      for (let airlineIndex = 0; airlineIndex < route.airlines.length; airlineIndex++) {
        const airline = route.airlines[airlineIndex];
        const departureAt = new Date(
          Date.UTC(
            now.getUTCFullYear(),
            now.getUTCMonth(),
            now.getUTCDate() + dayOffset,
            2 + airlineIndex * 5 + routeIndex,
            0,
            0
          )
        );

        const arrivalAt = new Date(
          departureAt.getTime() + route.durationHours * 60 * 60 * 1000
        );

        flights.push({
          flightNumber: `${airline.code}${100 + routeIndex * 20 + airlineIndex}`,
          airline: {
            name: airline.name,
            code: airline.code,
            logoUrl: '',
          },
          origin: route.from,
          destination: route.to,
          departureAt,
          arrivalAt,
          basePrice: route.price + airlineIndex * 250000,
          currency: 'VND',
          stops: 0,
          baggageAllowanceKg: 7,
          amenities: ['Điều hòa', 'Hành lý xách tay'],
          seats: createDefaultSeats(),
          status: 'scheduled',
        });
      }
    }
  }

  return flights;
}

async function seedFlights() {
  try {
    await connectDatabase();
    const result = await Flight.updateMany(
  {
    $or: [
      { seats: { $exists: false } },
      { seats: { $size: 0 } },
    ],
  },
  {
    $set: { seats: createDefaultSeats() },
  }
);

console.log(`Đã bổ sung ghế cho ${result.modifiedCount} chuyến bay.`);
    const flights = buildFlights();
    let insertedOrUpdated = 0;

    for (const flight of flights) {
      await Flight.updateOne(
        {
          flightNumber: flight.flightNumber,
          departureAt: flight.departureAt,
        },
        { $setOnInsert: flight },
        { upsert: true }
      );

      insertedOrUpdated++;
    }

    console.log(`Đã xử lý ${insertedOrUpdated} chuyến bay mẫu.`);
    console.log('Các tuyến mẫu: SGN-HAN, SGN-HKG, HAN-DAD, SGN-BKK.');
  } catch (error) {
    console.error('Không thể tạo dữ liệu chuyến bay:', error.message);
    process.exitCode = 1;
  } finally {
    const mongoose = require('mongoose');
    await mongoose.disconnect();
  }
}

seedFlights();
