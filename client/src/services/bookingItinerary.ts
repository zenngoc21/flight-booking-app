export interface ItineraryFlight {
  _id?: string;
  flightNumber?: string;
  airline?: { name?: string; code?: string };
  origin?: { code?: string; city?: string };
  destination?: { code?: string; city?: string };
  departureAt?: string;
  arrivalAt?: string;
}

interface BookingItinerarySource {
  flight: ItineraryFlight | null;
  seats?: string[];
  returnFlight?: ItineraryFlight | null;
  returnSeats?: string[];
  legs?: {
    flight: ItineraryFlight | string | null;
    seats?: string[];
  }[];
}

export interface BookingItineraryLeg {
  flight: ItineraryFlight;
  seats: string[];
}

export function getBookingItinerary(
  booking: BookingItinerarySource,
): BookingItineraryLeg[] {
  const populatedLegs = booking.legs
    ?.filter(
      (leg): leg is { flight: ItineraryFlight; seats?: string[] } =>
        typeof leg.flight === 'object' && leg.flight !== null,
    )
    .map((leg) => ({ flight: leg.flight, seats: leg.seats ?? [] }));

  if (populatedLegs?.length) {
    return populatedLegs;
  }

  return [
    ...(booking.flight
      ? [{ flight: booking.flight, seats: booking.seats ?? [] }]
      : []),
    ...(booking.returnFlight
      ? [{ flight: booking.returnFlight, seats: booking.returnSeats ?? [] }]
      : []),
  ];
}
