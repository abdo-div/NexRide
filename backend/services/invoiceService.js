import Booking from "../models/booking_model.js";
import AppError from "../utils/appError.js";
import { generateInvoicePDF } from "../utils/pdfGenerator.js";

/**
 * Streams an official invoice PDF for a confirmed payment. Shared by the
 * payment-scoped route (GET /payments/:id/invoice) and the booking-scoped
 * route (GET /bookings/:id/invoice) so the PDF layout stays in one place.
 */
export const streamInvoiceForPayment = async (res, payment) => {
  if (!payment) {
    throw new AppError("Payment details not found for invoice generation", 404);
  }

  const booking = await Booking.findById(payment.bookingId)
    .populate("customerId", "name email phoneNumber")
    .populate("vehicleId", "make model year")
    .populate("companyId", "name");
  if (!booking) {
    throw new AppError(
      "No booking reservation associated with this payment",
      404,
    );
  }

  generateInvoicePDF(res, booking, payment);
};