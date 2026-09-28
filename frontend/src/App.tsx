import { BrowserRouter, Routes, Route, Navigate } from "react-router";
import NavBar from "./components/layouts/NavBar";
import { Footer } from "./components/layouts/Footer";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";
import HomePage from "./pages/HomePage";
import { FleetPage } from "./pages/FleetPage";
import VehicleDetailPage from "./pages/VehicleDetailPage";
import CheckoutPage from "./pages/CheckoutPage";
import BookingConfirmationPage from "./pages/BookingConfirmationPage";
import AuthPage from "./pages/AuthPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="flex min-h-screen flex-col">
          <NavBar />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/FleetPage" element={<FleetPage />} />
              <Route path="/fleet" element={<FleetPage />} />
              <Route path="/cars/:vehicleId" element={<VehicleDetailPage />} />
              <Route
                path="/checkout/:vehicleId"
                element={
                  <ProtectedRoute>
                    <CheckoutPage />
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
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
