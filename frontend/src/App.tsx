import { BrowserRouter, Routes, Route } from "react-router";
import NavBar from "./components/layouts/NavBar";
import { Footer } from "./components/layouts/Footer";
import HomePage from "./pages/HomePage";
import { FleetPage } from "./pages/FleetPage";
import VehicleDetailPage from "./pages/VehicleDetailPage";
import CheckoutPage from "./pages/CheckoutPage";
import BookingConfirmationPage from "./pages/BookingConfirmationPage";

function App() {
  return (
    <BrowserRouter>
      <div className="flex min-h-screen flex-col">
        <NavBar />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/FleetPage" element={<FleetPage />} />
            <Route path="/fleet" element={<FleetPage />} />
            <Route path="/cars/:vehicleId" element={<VehicleDetailPage />} />
            <Route path="/checkout/:vehicleId" element={<CheckoutPage />} />
            <Route path="/booking-confirmed/:vehicleId" element={<BookingConfirmationPage />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  );
}

export default App;
