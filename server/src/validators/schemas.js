const { z } = require('zod');

const emailSchema = z.string().trim().email().max(254);

const registerSchema = z.object({
  fullName: z.string().trim().min(2).max(100),
  email: emailSchema,
  password: z.string().min(8).max(72),
  phone: z.string().trim().max(20).optional().default(''),
});

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(8).max(72),
});

const searchFlightSchema = z.object({
  from: z.string().trim().length(3).transform((v) => v.toUpperCase()),
  to: z.string().trim().length(3).transform((v) => v.toUpperCase()),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  sort: z.enum(['best', 'cheapest', 'fastest']).default('best'),
  stops: z.enum(['any', 'direct']).default('any'),
  maxPrice: z.coerce.number().positive().optional(),
  cabinClass: z.enum(['economy', 'premium_economy', 'business', 'first']).default('economy'),
  airlines: z.string().trim().optional().transform((value) =>
    value
      ? [...new Set(value.split(',').map((code) => code.trim().toUpperCase()).filter(Boolean))]
      : undefined
  ),
});

const passengerSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  gender: z.enum(['male', 'female', 'other']),
  passengerType: z.enum(['adult', 'child', 'infant']).default('adult'),
  email: emailSchema,
  phone: z.string().trim().min(6).max(20),
});

const bookingLegSchema = z.object({
  flightId: z.string().regex(/^[a-fA-F0-9]{24}$/),
  seats: z.array(z.string().trim().min(1).max(5)).max(9),
  cabinClass: z.enum(['economy', 'premium_economy', 'business', 'first']).optional(),
  checkedBagCount: z.number().int().min(0).max(9).default(0),
});

const createBookingSchema = z.object({
  flightId: z.string().regex(/^[a-fA-F0-9]{24}$/).optional(),
  returnFlightId: z.string().regex(/^[a-fA-F0-9]{24}$/).optional(),
  legs: z.array(bookingLegSchema).min(2).max(4).optional(),
  passengers: z.array(passengerSchema).min(1).max(9),
  seats: z.array(z.string().trim().min(1).max(5)).max(9).optional(),
  returnSeats: z.array(z.string().trim().min(1).max(5)).max(9).optional(),
  checkedBagCount: z.number().int().min(0).max(9).default(0),
  returnCheckedBagCount: z.number().int().min(0).max(9).optional(),
  protectionEnabled: z.boolean().default(false),
  cabinClass: z.enum(['economy', 'premium_economy', 'business', 'first']).optional(),
}).superRefine((booking, context) => {
  const seatedPassengerCount = booking.passengers.filter(
    (passenger) => passenger.passengerType !== 'infant',
  ).length;
  const adultCount = booking.passengers.filter(
    (passenger) => passenger.passengerType === 'adult',
  ).length;
  const infantCount = booking.passengers.length - seatedPassengerCount;

  if (adultCount === 0 || infantCount > adultCount) {
    context.addIssue({
      code: 'custom',
      message: 'Cần ít nhất một người lớn và mỗi người lớn chỉ được đi cùng tối đa một trẻ sơ sinh',
      path: ['passengers'],
    });
  }

  if (booking.legs) {
    if (booking.flightId || booking.returnFlightId || booking.seats || booking.returnSeats) {
      context.addIssue({
        code: 'custom',
        message: 'Không trộn danh sách chặng với trường chuyến bay một chiều/khứ hồi',
        path: ['legs'],
      });
    }

    booking.legs.forEach((leg, index) => {
      if (leg.seats.length !== seatedPassengerCount) {
        context.addIssue({
          code: 'custom',
          message: 'Mỗi chặng cần một ghế cho từng người lớn và trẻ em',
          path: ['legs', index, 'seats'],
        });
      }
    });
  } else {
    if (!booking.flightId || !booking.seats) {
      context.addIssue({
        code: 'custom',
        message: 'Cần cung cấp chuyến bay và danh sách ghế',
        path: ['flightId'],
      });
    } else if (booking.seats.length !== seatedPassengerCount) {
      context.addIssue({
        code: 'custom',
        message: 'Mỗi người lớn và trẻ em cần có một ghế trên từng chặng',
        path: ['seats'],
      });
    }
  }

  if (Boolean(booking.returnFlightId) !== Boolean(booking.returnSeats)) {
    context.addIssue({
      code: 'custom',
      message: 'Chuyến bay chiều về và danh sách ghế chiều về phải được cung cấp cùng nhau',
      path: ['returnFlightId'],
    });
  }

  if (!booking.returnFlightId && booking.returnCheckedBagCount !== undefined) {
    context.addIssue({
      code: 'custom',
      message: 'Không thể chọn hành lý chiều về cho booking một chiều',
      path: ['returnCheckedBagCount'],
    });
  }
});

module.exports = {
  registerSchema,
  loginSchema,
  searchFlightSchema,
  bookingLegSchema,
  createBookingSchema,
};