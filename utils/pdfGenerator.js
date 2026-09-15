import PDFDocument from "pdfkit";

/**
 * Dynamically generates a PDF booking receipt and streams it directly to the Express response
 * @param {Object} res - Express response object
 * @param {Object} booking - Populated booking document (with user, vehicle, company)
 */
export const generateInvoicePDF = (res, booking) => {
  const doc = new PDFDocument({ size: "A4", margin: 50 });

  // Set HTTP headers for PDF download stream
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=invoice-${booking._id}.pdf`
  );

  // Pipe PDF stream directly into response output
  doc.pipe(res);

  // --- HEADER SECTION ---
  doc
    .fillColor("#1e293b")
    .fontSize(22)
    .text(booking.company?.name || "NexRide Marketplace", 50, 45)
    .fontSize(10)
    .fillColor("#64748b")
    .text("Official Rental Invoice & Receipt", 50, 75)
    .text(`Invoice ID: ${booking._id}`, 50, 90)
    .text(`Date: ${new Date(booking.createdAt || Date.now()).toLocaleDateString()}`, 50, 105)
    .moveDown();

  // Divider Line
  doc
    .strokeColor("#e2e8f0")
    .lineWidth(1)
    .moveTo(50, 125)
    .lineTo(545, 125)
    .stroke();

  // --- CUSTOMER & RENTAL DETAILS ---
  doc
    .fontSize(12)
    .fillColor("#0f172a")
    .text("Customer Details:", 50, 140)
    .fontSize(10)
    .fillColor("#475569")
    .text(`Name: ${booking.user?.name || "N/A"}`, 50, 160)
    .text(`Email: ${booking.user?.email || "N/A"}`, 50, 175)
    .text(`Phone: ${booking.user?.phoneNumber || "N/A"}`, 50, 190);

  doc
    .fontSize(12)
    .fillColor("#0f172a")
    .text("Vehicle Info:", 300, 140)
    .fontSize(10)
    .fillColor("#475569")
    .text(`Vehicle: ${booking.vehicle?.make || ""} ${booking.vehicle?.model || "Car Rental"}`, 300, 160)
    .text(`License Plate: ${booking.vehicle?.licensePlate || "N/A"}`, 300, 175)
    .text(`Duration: ${booking.startDate} to ${booking.endDate}`, 300, 190);

  // --- SUMMARY TABLE ---
  const tableTop = 230;
  doc
    .fillColor("#f1f5f9")
    .rect(50, tableTop, 495, 25)
    .fill();

  doc
    .fillColor("#0f172a")
    .fontSize(10)
    .text("Description", 60, tableTop + 7)
    .text("Total Paid", 450, tableTop + 7, { width: 90, align: "right" });

  doc
    .fillColor("#334155")
    .text(`Vehicle Rental Reservation (${booking.totalDays || 1} Days)`, 60, tableTop + 35)
    .text(`$${booking.totalPrice?.toFixed(2) || "0.00"}`, 450, tableTop + 35, {
      width: 90,
      align: "right",
    });

  // Footer / Signoff
  doc
    .fontSize(10)
    .fillColor("#94a3b8")
    .text("Thank you for choosing NexRide! Drive safely.", 50, 700, {
      align: "center",
      width: 495,
    });

  // Finalize PDF file
  doc.end();
};