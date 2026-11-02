import { Navigate, Route, Routes } from 'react-router-dom';

import ProtectedRoute from './components/common/ProtectedRoute';
import AdminLayout from './components/layout/AdminLayout';

import LoginPage from './features/auth/LoginPage';
import DashboardPage from './features/dashboard/DashboardPage';
import FlightsPage from './features/flights/FlightsPage';
import BookingsPage from './features/bookings/BookingsPage';
import AircraftPage from './features/aircraft/AircraftPage';
import CustomersPage from './features/customers/CustomersPage';
import AirlinesPage from './features/reference-data/AirlinesPage';
import AirportsPage from './features/reference-data/AirportsPage';
import SettingsPage from './features/settings/SettingsPage';


export default function App() {
  return (
    <Routes>
      {/* Trang đăng nhập */}
      <Route path="/login" element={<LoginPage />} />

      {/* Các trang cần đăng nhập */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AdminLayout />}>
          <Route
            path="/dashboard"
            element={<DashboardPage />}
          />

          <Route
  path="/flights"
  element={<FlightsPage />}
/>

          <Route path="/bookings" element={<BookingsPage />} />

          <Route path="/aircraft" element={<AircraftPage />} />

          <Route path="/customers" element={<CustomersPage />} />

          <Route path="/airlines" element={<AirlinesPage />} />

          <Route path="/airports" element={<AirportsPage />} />

          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Route>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />

    </Routes>
  );
}