import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router";
import NavBar from "./components/layouts/NavBar";
import { Footer } from "./components/layouts/Footer";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";
import HomePage from "./pages/HomePage";
import { FleetPage } from "./pages/FleetPage";
import VehicleDetailPage from "./pages/VehicleDetailPage";
import CheckoutPage from "./pages/CheckoutPage";
import BookingConfirmationPage from "./pages/BookingConfirmationPage";
import PaymentPage from "./pages/PaymentPage";
import AuthPage from "./pages/AuthPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import MyBookingsPage from "./pages/MyBookingsPage";
import BookingDetailsPage from "./pages/BookingDetailsPage";
import { AdminRoute } from "./components/admin/AdminRoute";
import { AdminLayout } from "./components/admin/AdminLayout";
import { AdminOverviewPage } from "./pages/admin/AdminOverviewPage";
import { AdminBookingsPage } from "./pages/admin/AdminBookingsPage";
import { AdminBookingDetailPage } from "./pages/admin/AdminBookingDetailPage";
import { AdminFleetPage } from "./pages/admin/AdminFleetPage";
import { AdminCompaniesPage } from "./pages/admin/AdminCompaniesPage";
import { AdminCustomersPage } from "./pages/admin/AdminCustomersPage";
import { AdminPaymentsPage } from "./pages/admin/AdminPaymentsPage";

/**
 * Public site chrome: shared navbar on top and footer at the bottom. Admin
 * routes intentionally render OUTSIDE this shell so the dashboard's own
 * topbar/sidebar are not buried under the consumer-facing navigation.
 */
function PublicShell() {
  return (
    <div className="flex min-h-screen flex-col">
      <NavBar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<PublicShell />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/FleetPage" element={<FleetPage />} />
            <Route path="/fleet" element={<FleetPage />} />
            <Route path="/cars/:vehicleId" element={<VehicleDetailPage />} />
            <Route path="/vehicles/:vehicleId" element={<VehicleDetailPage />} />
            <Route
              path="/checkout/:vehicleId"
              element={
                <ProtectedRoute>
                  <CheckoutPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/payment/:bookingId"
              element={
                <ProtectedRoute>
                  <PaymentPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/booking-confirmed/:vehicleId"
              element={
                <ProtectedRoute>
                  <BookingConfirmationPage />
                </ProtectedRoute>
              }
            />
            <Route path="/login" element={<AuthPage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
            <Route
              path="/my-bookings"
              element={
                <ProtectedRoute>
                  <MyBookingsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-bookings/:bookingId"
              element={
                <ProtectedRoute>
                  <BookingDetailsPage />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>

          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminLayout />
              </AdminRoute>
            }
          >
            <Route index element={<AdminOverviewPage />} />
            <Route path="bookings" element={<AdminBookingsPage />} />
            <Route path="bookings/:bookingId" element={<AdminBookingDetailPage />} />
            <Route path="companies" element={<AdminCompaniesPage />} />
            <Route path="vehicles" element={<AdminFleetPage />} />
            <Route path="customers" element={<AdminCustomersPage />} />
            <Route path="payments" element={<AdminPaymentsPage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
