const Airline = require('../models/Airline');
const Airport = require('../models/Airport');
const Flight = require('../models/Flight');

async function syncAirlinesFromFlights() {
  const airlines = await Flight.aggregate([
    {
      $match: {
        'airline.code': { $type: 'string' },
        'airline.name': { $type: 'string' },
      },
    },
    {
      $project: {
        code: { $toUpper: { $trim: { input: '$airline.code' } } },
        name: { $trim: { input: '$airline.name' } },
        logoUrl: { $ifNull: ['$airline.logoUrl', ''] },
      },
    },
    { $match: { code: { $ne: '' }, name: { $ne: '' } } },
    {
      $group: {
        _id: '$code',
        name: { $first: '$name' },
        logoUrl: { $first: '$logoUrl' },
      },
    },
  ]);

  if (airlines.length > 0) {
    await Airline.bulkWrite(
      airlines.map(({ _id: code, name, logoUrl }) => ({
        updateOne: {
          filter: { code },
          update: { $setOnInsert: { code, name, logoUrl, status: 'active' } },
          upsert: true,
        },
      }))
    );
  }
}

async function syncAirportsFromFlights() {
  const airports = await Flight.aggregate([
    {
      $project: {
        locations: [
          {
            code: '$origin.code',
            city: '$origin.city',
            airport: '$origin.airport',
          },
          {
            code: '$destination.code',
            city: '$destination.city',
            airport: '$destination.airport',
          },
        ],
      },
    },
    { $unwind: '$locations' },
    {
      $match: {
        'locations.code': { $type: 'string' },
        'locations.city': { $type: 'string' },
      },
    },
    {
      $project: {
        code: { $toUpper: { $trim: { input: '$locations.code' } } },
        city: { $trim: { input: '$locations.city' } },
        airport: {
          $let: {
            vars: {
              airportName: {
                $trim: { input: { $ifNull: ['$locations.airport', ''] } },
              },
            },
            in: {
              $cond: [
                { $eq: ['$$airportName', ''] },
                { $trim: { input: '$locations.city' } },
                '$$airportName',
              ],
            },
          },
        },
      },
    },
    { $match: { code: { $ne: '' }, city: { $ne: '' } } },
    {
      $group: {
        _id: '$code',
        city: { $first: '$city' },
        airport: { $first: '$airport' },
      },
    },
  ]);

  if (airports.length > 0) {
    await Airport.bulkWrite(
      airports.map(({ _id: code, city, airport }) => ({
        updateOne: {
          filter: { code },
          update: {
            $setOnInsert: {
              code,
              city,
              airport,
              country: '',
              status: 'active',
            },
          },
          upsert: true,
        },
      }))
    );
  }
}

// ==================== AIRLINES ====================

// GET /api/admin/airlines
async function getAirlines(req, res, next) {
  try {
    await syncAirlinesFromFlights();
    const airlines = await Airline.find().sort({ code: 1 }).lean();

    const data = await Promise.all(
      airlines.map(async (airline) => {
        const flightCount = await Flight.countDocuments({
          'airline.code': airline.code,
        });

        return {
          ...airline,
          flightCount,
        };
      })
    );

    return res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

// POST /api/admin/airlines
async function createAirline(req, res, next) {
  try {
    const { name, code, logoUrl = '', status = 'active' } = req.body;

    if (!name?.trim() || !code?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Tên hãng và mã hãng là bắt buộc.',
      });
    }

    const normalizedCode = code.trim().toUpperCase();

    const existing = await Airline.findOne({ code: normalizedCode });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'Mã hãng hàng không đã tồn tại.',
      });
    }

    const airline = await Airline.create({
      name: name.trim(),
      code: normalizedCode,
      logoUrl,
      status,
    });

    return res.status(201).json({
      success: true,
      data: airline,
    });
  } catch (error) {
    next(error);
  }
}

// PUT /api/admin/airlines/:id
async function updateAirline(req, res, next) {
  try {
    const { name, code, logoUrl, status } = req.body;

    const airline = await Airline.findById(req.params.id);
    if (!airline) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy hãng hàng không.',
      });
    }

    const oldCode = airline.code;
    const newCode =
      code !== undefined ? code.trim().toUpperCase() : oldCode;

    if (newCode !== oldCode) {
      const duplicate = await Airline.findOne({
        code: newCode,
        _id: { $ne: airline._id },
      });

      if (duplicate) {
        return res.status(409).json({
          success: false,
          message: 'Mã hãng hàng không đã được sử dụng.',
        });
      }
    }

    if (name !== undefined) airline.name = name.trim();
    if (code !== undefined) airline.code = newCode;
    if (logoUrl !== undefined) airline.logoUrl = logoUrl;
    if (status !== undefined) airline.status = status;

    await airline.save();

    // Đồng bộ dữ liệu nhúng trong các chuyến bay hiện có.
    if (newCode !== oldCode || name !== undefined || logoUrl !== undefined) {
      const flightUpdate = {
        'airline.code': newCode,
      };

      if (name !== undefined) {
        flightUpdate['airline.name'] = name.trim();
      }

      if (logoUrl !== undefined) {
        flightUpdate['airline.logoUrl'] = logoUrl;
      }

      await Flight.updateMany(
        { 'airline.code': oldCode },
        { $set: flightUpdate }
      );
    }

    return res.json({
      success: true,
      data: airline,
    });
  } catch (error) {
    next(error);
  }
}

// DELETE /api/admin/airlines/:id
async function deleteAirline(req, res, next) {
  try {
    const airline = await Airline.findById(req.params.id);

    if (!airline) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy hãng hàng không.',
      });
    }

    const flightExists = await Flight.exists({
      'airline.code': airline.code,
    });

    if (flightExists) {
      return res.status(409).json({
        success: false,
        message: 'Không thể xóa hãng đang được sử dụng bởi chuyến bay.',
      });
    }

    await airline.deleteOne();

    return res.json({
      success: true,
      message: 'Đã xóa hãng hàng không.',
    });
  } catch (error) {
    next(error);
  }
}

// ==================== AIRPORTS ====================

// GET /api/admin/airports
async function getAirports(req, res, next) {
  try {
    await syncAirportsFromFlights();
    const airports = await Airport.find().sort({ code: 1 }).lean();

    const data = await Promise.all(
      airports.map(async (airport) => {
        const flightCount = await Flight.countDocuments({
          $or: [
            { 'origin.code': airport.code },
            { 'destination.code': airport.code },
          ],
        });

        return {
          ...airport,
          flightCount,
        };
      })
    );

    return res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

// POST /api/admin/airports
async function createAirport(req, res, next) {
  try {
    const {
      code,
      city,
      airport,
      country = '',
      status = 'active',
    } = req.body;

    if (!code?.trim() || !city?.trim() || !airport?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Mã sân bay, thành phố và tên sân bay là bắt buộc.',
      });
    }

    const normalizedCode = code.trim().toUpperCase();

    const existing = await Airport.findOne({ code: normalizedCode });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'Mã sân bay đã tồn tại.',
      });
    }

    const newAirport = await Airport.create({
      code: normalizedCode,
      city: city.trim(),
      airport: airport.trim(),
      country,
      status,
    });

    return res.status(201).json({
      success: true,
      data: newAirport,
    });
  } catch (error) {
    next(error);
  }
}

// PUT /api/admin/airports/:id
async function updateAirport(req, res, next) {
  try {
    const { code, city, airport, country, status } = req.body;

    const airportDoc = await Airport.findById(req.params.id);
    if (!airportDoc) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy sân bay.',
      });
    }

    const oldCode = airportDoc.code;
    const newCode =
      code !== undefined ? code.trim().toUpperCase() : oldCode;

    if (newCode !== oldCode) {
      const duplicate = await Airport.findOne({
        code: newCode,
        _id: { $ne: airportDoc._id },
      });

      if (duplicate) {
        return res.status(409).json({
          success: false,
          message: 'Mã sân bay đã được sử dụng.',
        });
      }
    }

    if (code !== undefined) airportDoc.code = newCode;
    if (city !== undefined) airportDoc.city = city.trim();
    if (airport !== undefined) airportDoc.airport = airport.trim();
    if (country !== undefined) airportDoc.country = country;
    if (status !== undefined) airportDoc.status = status;

    await airportDoc.save();

    // Đồng bộ thông tin sân bay trong chuyến bay hiện có.
    const updates = {};

    if (code !== undefined) {
      updates['origin.code'] = newCode;
      updates['destination.code'] = newCode;
    }
    if (city !== undefined) {
      updates['origin.city'] = city.trim();
      updates['destination.city'] = city.trim();
    }
    if (airport !== undefined) {
      updates['origin.airport'] = airport.trim();
      updates['destination.airport'] = airport.trim();
    }

    if (Object.keys(updates).length > 0) {
      await Flight.updateMany(
        {
          $or: [
            { 'origin.code': oldCode },
            { 'destination.code': oldCode },
          ],
        },
        [
          {
            $set: {
              ...(code !== undefined && {
                'origin.code': {
                  $cond: [
                    { $eq: ['$origin.code', oldCode] },
                    newCode,
                    '$origin.code',
                  ],
                },
                'destination.code': {
                  $cond: [
                    { $eq: ['$destination.code', oldCode] },
                    newCode,
                    '$destination.code',
                  ],
                },
              }),
              ...(city !== undefined && {
                'origin.city': {
                  $cond: [
                    { $eq: ['$origin.code', oldCode] },
                    city.trim(),
                    '$origin.city',
                  ],
                },
                'destination.city': {
                  $cond: [
                    { $eq: ['$destination.code', oldCode] },
                    city.trim(),
                    '$destination.city',
                  ],
                },
              }),
              ...(airport !== undefined && {
                'origin.airport': {
                  $cond: [
                    { $eq: ['$origin.code', oldCode] },
                    airport.trim(),
                    '$origin.airport',
                  ],
                },
                'destination.airport': {
                  $cond: [
                    { $eq: ['$destination.code', oldCode] },
                    airport.trim(),
                    '$destination.airport',
                  ],
                },
              }),
            },
          },
        ]
      );
    }

    return res.json({
      success: true,
      data: airportDoc,
    });
  } catch (error) {
    next(error);
  }
}

// DELETE /api/admin/airports/:id
async function deleteAirport(req, res, next) {
  try {
    const airport = await Airport.findById(req.params.id);

    if (!airport) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy sân bay.',
      });
    }

    const flightExists = await Flight.exists({
      $or: [
        { 'origin.code': airport.code },
        { 'destination.code': airport.code },
      ],
    });

    if (flightExists) {
      return res.status(409).json({
        success: false,
        message: 'Không thể xóa sân bay đang được chuyến bay sử dụng.',
      });
    }

    await airport.deleteOne();

    return res.json({
      success: true,
      message: 'Đã xóa sân bay.',
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getAirlines,
  createAirline,
  updateAirline,
  deleteAirline,
  getAirports,
  createAirport,
  updateAirport,
  deleteAirport,
};