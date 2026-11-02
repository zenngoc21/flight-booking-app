# Flight Booking App — Client implementation notes

## Added client flows
- Search one-way, round-trip, or 2–4 connected flight legs, with cabin-class and airline filters; select and hold seats in each leg before one shared booking checkout.
- Passenger counts and forms support adults, children, and infants. Infants do not receive seats; demo pricing is 10% of the adult base fare, limited to one infant per adult.
- Payment success screen validates the paid + confirmed state from `GET /api/bookings/my` before displaying a confirmed ticket.
- Payment failed screen and payment flow navigation. The existing backend endpoint is a **demo payment simulator**, not a live card processor.
- E-ticket detail with a real QR code generated on-device. The QR is a booking reference payload; it is not an airline boarding pass or check-in authorization.
- Minimal offline ticket cache in SecureStore (up to five tickets); sensitive card/passport data is not cached.
- Booking detail screen, Flight Tracker screen, and Notifications screen based on current booking API data.
- Redux Toolkit + Redux Persist wired into the app for non-sensitive UI preferences. Auth tokens remain in the existing auth storage service.
- NativeWind v4 basic Tailwind/Babel/CSS configuration.
- Seat numbers use the shared `1A`–`99F` format in admin, server, and mobile so the seat map and hold-seat API stay compatible.
- New bookings store the itinerary in `legs`, while legacy `flight`, `returnFlight`, `seats`, and `returnSeats` fields remain available for existing one-way and round-trip records.
- Root layout QueryClientProvider order fixed: hooks that use React Query are rendered inside the provider tree.

## Backend/API limits that remain
The current backend does not expose customer cancellation/change/refund APIs, airline live status/gate APIs, push-notification delivery/read state, a real payment provider webhook, or a production PDF/email e-ticket endpoint. The client intentionally does not fake these operations. The tracker labels its status as estimated from scheduled departure time, not live airline data.

## Setup
1. Copy `client/.env.example` to `client/.env` and set `EXPO_PUBLIC_API_URL` to your computer's LAN IPv4 address and backend port (default `5000`). Do not use `localhost` from a physical phone.
2. Copy `server/.env.example` to `server/.env`, set a unique `JWT_SECRET`, MongoDB, Redis and optional SMTP settings.
3. From `client`, run `npm install` to install the added QR package and reconcile `package-lock.json`, then `npx expo start --clear`.
4. Ensure phone and computer use the same Wi-Fi and allow the backend port through Windows Firewall.

## Production checklist
- Integrate a PCI-compliant payment provider and verify signed provider webhooks on the server. Never collect/store raw card data in this app.
- Generate signed, verifiable boarding/booking QR tokens server-side and coordinate with airline/check-in systems.
- Add backend APIs for cancellation, change, refund, notifications, live flight status, and PDF/email delivery.
- Add device tests, API integration tests, and run Android/iOS builds with the Expo SDK versions installed on your machine.
