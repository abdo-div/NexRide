import { lazy, Suspense, type ReactNode } from "react";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router";
import { LoaderCircle } from "lucide-react";
import NavBar from "./components/layouts/NavBar";
import { Footer } from "./components/layouts/Footer";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";
import HomePage from "./pages/HomePage";
import { AdminRoute } from "./components/admin/AdminRoute";
import { AdminLayout } from "./components/admin/AdminLayout";
import { CompanyRoute } from "./components/company/CompanyRoute";
import { CompanyLayout } from "./components/company/CompanyLayout";

// Only the landing page is needed for the initial public load. Browsing, auth,
// booking, checkout and payment screens are separate chunks so a first-time
// visitor never downloads the booking/payment code.
const FleetPage = lazy(() => import("./pages/FleetPage"));
const VehicleDetailPage = lazy(() => import("./pages/VehicleDetailPage"));
const CheckoutPage = lazy(() => import("./pages/CheckoutPage"));
const BookingConfirmationPage = lazy(() =>
  import("./pages/BookingConfirmationPage"),
);
const PaymentPage = lazy(() => import("./pages/PaymentPage"));
const AuthPage = lazy(() => import("./pages/AuthPage"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage"));
const MyBookingsPage = lazy(() => import("./pages/MyBookingsPage"));
const BookingDetailsPage = lazy(() => import("./pages/BookingDetailsPage"));

const AdminOverviewPage = lazy(() =>
  import("./pages/admin/AdminOverviewPage").then((module) => ({
    default: module.AdminOverviewPage,
  })),
);
const AdminBookingsPage = lazy(() =>
  import("./pages/admin/AdminBookingsPage").then((module) => ({
    default: module.AdminBookingsPage,
  })),
);
const AdminBookingDetailPage = lazy(() =>
  import("./pages/admin/AdminBookingDetailPage").then((module) => ({
    default: module.AdminBookingDetailPage,
  })),
);
const AdminFleetPage = lazy(() =>
  import("./pages/admin/AdminFleetPage").then((module) => ({
    default: module.AdminFleetPage,
  })),
);
const AdminCompaniesPage = lazy(() =>
  import("./pages/admin/AdminCompaniesPage").then((module) => ({
    default: module.AdminCompaniesPage,
  })),
);
const AdminCustomersPage = lazy(() =>
  import("./pages/admin/AdminCustomersPage").then((module) => ({
    default: module.AdminCustomersPage,
  })),
);
const AdminPaymentsPage = lazy(() =>
  import("./pages/admin/AdminPaymentsPage").then((module) => ({
    default: module.AdminPaymentsPage,
  })),
);
const AdminCommissionsPage = lazy(() =>
  import("./pages/admin/AdminCommissionsPage").then((module) => ({
    default: module.AdminCommissionsPage,
  })),
);
const AdminMaintenancePage = lazy(() =>
  import("./pages/admin/AdminMaintenancePage").then((module) => ({
    default: module.AdminMaintenancePage,
  })),
);
const AdminReportsPage = lazy(() =>
  import("./pages/admin/AdminReportsPage").then((module) => ({
    default: module.AdminReportsPage,
  })),
);
const AdminSettingsPage = lazy(() =>
  import("./pages/admin/AdminSettingsPage").then((module) => ({
    default: module.AdminSettingsPage,
  })),
);
const CompanyDashboardPage = lazy(() =>
  import("./pages/company/CompanyDashboardPage").then((module) => ({
    default: module.CompanyDashboardPage,
  })),
);
const CompanyBookingsPage = lazy(() =>
  import("./pages/company/CompanyBookingsPage").then((module) => ({
    default: module.CompanyBookingsPage,
  })),
);
const CompanyFleetPage = lazy(() =>
  import("./pages/company/CompanyFleetPage").then((module) => ({
    default: module.CompanyFleetPage,
  })),
);
const CompanyVehiclePage = lazy(() =>
  import("./pages/company/CompanyVehiclePage").then((module) => ({
    default: module.CompanyVehiclePage,
  })),
);
const CompanyVehicleEditPage = lazy(() =>
  import("./pages/company/CompanyVehicleEditPage").then((module) => ({
    default: module.CompanyVehicleEditPage,
  })),
);

function RouteLoadingFallback() {
  return (
    <div
      className="flex min-h-[60vh] items-center justify-center"
      role="status"
      aria-label="Loading page"
    >
      <LoaderCircle className="h-8 w-8 animate-spin text-[#2563EB]" />
    </div>
  );
}

/**
 * Gives a single lazily loaded route its own Suspense boundary. The fallback is
 * identical to the admin one, so navigating between public pages keeps the same
 * loading treatment instead of flashing a blank screen.
 */
function LazyRoute({ children }: { children: ReactNode }) {
  return <Suspense fallback={<RouteLoadingFallback />}>{children}</Suspense>;
}

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
            <Route
              path="/FleetPage"
              element={
                <LazyRoute>
                  <FleetPage />
                </LazyRoute>
              }
            />
            <Route
              path="/fleet"
              element={
                <LazyRoute>
                  <FleetPage />
                </LazyRoute>
              }
            />
            <Route
              path="/cars/:vehicleId"
              element={
                <LazyRoute>
                  <VehicleDetailPage />
                </LazyRoute>
              }
            />
            <Route
              path="/vehicles/:vehicleId"
              element={
                <LazyRoute>
                  <VehicleDetailPage />
                </LazyRoute>
              }
            />
            <Route
              path="/checkout/:vehicleId"
              element={
                <ProtectedRoute>
                  <LazyRoute>
                    <CheckoutPage />
                  </LazyRoute>
                </ProtectedRoute>
              }
            />
            <Route
              path="/payment/:bookingId"
              element={
                <ProtectedRoute>
                  <LazyRoute>
                    <PaymentPage />
                  </LazyRoute>
                </ProtectedRoute>
              }
            />
            <Route
              path="/booking-confirmed/:vehicleId"
              element={
                <ProtectedRoute>
                  <LazyRoute>
                    <BookingConfirmationPage />
                  </LazyRoute>
                </ProtectedRoute>
              }
            />
            <Route
              path="/login"
              element={
                <LazyRoute>
                  <AuthPage />
                </LazyRoute>
              }
            />
            <Route
              path="/auth"
              element={
                <LazyRoute>
                  <AuthPage />
                </LazyRoute>
              }
            />
            <Route
              path="/reset-password/:token"
              element={
                <LazyRoute>
                  <ResetPasswordPage />
                </LazyRoute>
              }
            />
            <Route
              path="/my-bookings"
              element={
                <ProtectedRoute>
                  <LazyRoute>
                    <MyBookingsPage />
                  </LazyRoute>
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-bookings/:bookingId"
              element={
                <ProtectedRoute>
                  <LazyRoute>
                    <BookingDetailsPage />
                  </LazyRoute>
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>

          <Route
            path="/admin"
            element={
              <Suspense fallback={<RouteLoadingFallback />}>
                <AdminRoute>
                  <AdminLayout />
                </AdminRoute>
              </Suspense>
            }
          >
            <Route index element={<AdminOverviewPage />} />
            <Route path="bookings" element={<AdminBookingsPage />} />
            <Route path="bookings/:bookingId" element={<AdminBookingDetailPage />} />
            <Route path="companies" element={<AdminCompaniesPage />} />
            <Route path="vehicles" element={<AdminFleetPage />} />
            <Route path="customers" element={<AdminCustomersPage />} />
            <Route path="payments" element={<AdminPaymentsPage />} />
            <Route path="commissions" element={<AdminCommissionsPage />} />
            <Route path="maintenance" element={<AdminMaintenancePage />} />
            <Route path="reports" element={<AdminReportsPage />} />
            <Route path="settings" element={<AdminSettingsPage />} />
          </Route>

          <Route
            path="/company"
            element={
              <Suspense fallback={<RouteLoadingFallback />}>
                <CompanyRoute>
                  <CompanyLayout />
                </CompanyRoute>
              </Suspense>
            }
          >
            <Route index element={<CompanyDashboardPage />} />
            <Route path="bookings" element={<CompanyBookingsPage />} />
            <Route path="fleet" element={<CompanyFleetPage />} />
            <Route path="fleet/:vehicleId" element={<CompanyVehiclePage />} />
            <Route path="fleet/:vehicleId/edit" element={<CompanyVehicleEditPage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
