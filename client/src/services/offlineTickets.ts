import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import type { BookingHistoryItem } from './api';
const INDEX_KEY = 'offlineTickets.index.v1';
const ticketKey = (id: string) => `offlineTicket.${id}`;
async function getItem(key: string): Promise<string | null> { return Platform.OS === 'web' ? window.localStorage.getItem(key) : SecureStore.getItemAsync(key); }
async function setItem(key: string, value: string): Promise<void> { if (Platform.OS === 'web') window.localStorage.setItem(key, value); else await SecureStore.setItemAsync(key, value); }
async function deleteItem(key: string): Promise<void> { if (Platform.OS === 'web') window.localStorage.removeItem(key); else await SecureStore.deleteItemAsync(key); }
/** Cache minimal ticket data only. Do not store payment card, access token, or passport data here. */
export async function cacheOfflineTicket(booking: BookingHistoryItem): Promise<void> {
  const compact = {
    _id: booking._id, bookingCode: booking.bookingCode,
    bookingStatus: booking.bookingStatus, paymentStatus: booking.paymentStatus,
    seats: booking.seats, returnSeats: booking.returnSeats,
    createdAt: booking.createdAt, expiresAt: booking.expiresAt,
    pricing: booking.pricing,
    flight: booking.flight ? { _id: booking.flight._id, flightNumber: booking.flight.flightNumber,
      airline: { name: booking.flight.airline.name, code: booking.flight.airline.code },
      origin: booking.flight.origin, destination: booking.flight.destination,
      departureAt: booking.flight.departureAt, arrivalAt: booking.flight.arrivalAt } : null,
    returnFlight: booking.returnFlight ? {
      _id: booking.returnFlight._id,
      flightNumber: booking.returnFlight.flightNumber,
      airline: { name: booking.returnFlight.airline.name, code: booking.returnFlight.airline.code },
      origin: booking.returnFlight.origin,
      destination: booking.returnFlight.destination,
      departureAt: booking.returnFlight.departureAt,
      arrivalAt: booking.returnFlight.arrivalAt,
    } : null,
    passengers: booking.passengers.map(p => ({ firstName: p.firstName, lastName: p.lastName })),
  };
  // One ticket per SecureStore entry avoids one oversized multi-ticket value.
  await setItem(ticketKey(booking._id), JSON.stringify(compact));
  let oldIds: string[] = [];
  try { oldIds = JSON.parse((await getItem(INDEX_KEY)) || '[]'); } catch { oldIds = []; }
  const ids = [booking._id, ...oldIds.filter(id => id !== booking._id)].slice(0, 5);
  await setItem(INDEX_KEY, JSON.stringify(ids));
  for (const id of oldIds) if (!ids.includes(id)) await deleteItem(ticketKey(id));
}
export async function getOfflineTickets(): Promise<any[]> {
  let ids: string[] = []; try { ids = JSON.parse((await getItem(INDEX_KEY)) || '[]'); } catch { return []; }
  const rows = await Promise.all(ids.map(async id => { try { const value = await getItem(ticketKey(id)); return value ? JSON.parse(value) : null; } catch { return null; } }));
  return rows.filter(Boolean);
}
export async function getOfflineTicket(id: string): Promise<any | null> {
  try { const value = await getItem(ticketKey(id)); return value ? JSON.parse(value) : null; } catch { return null; }
}
