import PDFDocument from "pdfkit";

/**
 * Dynamically generates a PDF booking invoice and streams it directly to the
 * Express response.
 * @param {Object} res - Express response object
 * @param {Object} booking - Populated booking document (customerId, vehicleId, companyId)
 * @param {Object} [payment] - Payment ledger record (transaction id, status)
 */
export const generateInvoicePDF = (res, booking, payment = null) => {
  const doc = new PDFDocument({ size: "A4", margin: 50 });

  // Set HTTP headers for PDF download stream
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=invoice-${booking._id}.pdf`
  );

  // Pipe PDF stream directly into response output
  doc.pipe(res);

  const fmt = (n) =>
    Number(n || 0).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  const lyd = (n) => `${fmt(n)} LYD`;

  const companyName =
    booking.companyId?.name || booking.company?.name || "NexRide Marketplace";
  const customerName =
    booking.customerId?.name || booking.user?.name || "Customer";
  const customerEmail =
    booking.customerId?.email || booking.user?.email || "N/A";
  const customerPhone =
    booking.customerId?.phoneNumber || booking.user?.phoneNumber || "N/A";
  const vehicleMake = booking.vehicleId?.make || booking.vehicle?.make || "Rental";
  const vehicleModel =
    booking.vehicleId?.model || booking.vehicle?.model || "Vehicle";
  const vehicleYear = booking.vehicleId?.year || booking.vehicle?.year || "";
  const vehicleTitle = [vehicleYear, vehicleMake, vehicleModel]
    .filter(Boolean)
    .join(" ");
  const startDateStr = booking.startDate
    ? new Date(booking.startDate).toLocaleDateString()
    : "N/A";
  const endDateStr = booking.endDate
    ? new Date(booking.endDate).toLocaleDateString()
    : "N/A";
  const totalAmount = booking.totalAmount ?? booking.totalPrice ?? 0;
  const dailyRate = booking.dailyRate ?? 0;
  const totalDays = booking.totalDays || 1;
  const transactionRef = payment?.transactionId || "N/A";

  // --- HEADER SECTION ---
  doc
    .fillColor("#1e293b")
    .fontSize(22)
    .text(companyName, 50, 45)
    .fontSize(10)
    .fillColor("#64748b")
    .text("Official Rental Invoice & Receipt", 50, 75)
    .text(`Invoice ID: ${booking._id}`, 50, 90)
    .text(
      `Date: ${new Date(booking.createdAt || Date.now()).toLocaleDateString()}`,
      50,
      105,
    )
    .text(`Payment Ref: ${transactionRef}`, 50, 120)
    .moveDown();

  // Divider Line
  doc
    .strokeColor("#e2e8f0")
    .lineWidth(1)
    .moveTo(50, 140)
    .lineTo(545, 140)
    .stroke();

  // --- CUSTOMER & RENTAL DETAILS ---
  doc
    .fontSize(12)
    .fillColor("#0f172a")
    .text("Customer Details:", 50, 155)
    .fontSize(10)
    .fillColor("#475569")
    .text(`Name: ${customerName}`, 50, 175)
    .text(`Email: ${customerEmail}`, 50, 190)
    .text(`Phone: ${customerPhone}`, 50, 205);

  doc
    .fontSize(12)
    .fillColor("#0f172a")
    .text("Vehicle Info:", 300, 155)
    .fontSize(10)
    .fillColor("#475569")
    .text(`Vehicle: ${vehicleTitle}`, 300, 175)
    .text(
      `Pickup Location: ${booking.pickupLocation || "Branch Pickup"}`,
      300,
      190,
    )
    .text(`Duration: ${startDateStr} to ${endDateStr}`, 300, 205);

  // --- SUMMARY TABLE ---
  const tableTop = 240;
  doc.fillColor("#f1f5f9").rect(50, tableTop, 495, 25).fill();

  doc
    .fillColor("#0f172a")
    .fontSize(10)
    .text("Description", 60, tableTop + 7)
    .text("Total Paid", 450, tableTop + 7, { width: 90, align: "right" });

  doc
    .fillColor("#334155")
    .text(
      `Vehicle Rental Reservation (${totalDays} Days at ${lyd(dailyRate)}/day)`,
      60,
      tableTop + 35,
    )
    .text(lyd(totalAmount), 450, tableTop + 35, {
      width: 90,
      align: "right",
    });

  // --- TOTALS FOOTER ---
  const totalRowTop = tableTop + 80;
  doc
    .moveTo(50, totalRowTop)
    .lineTo(545, totalRowTop)
    .strokeColor("#e2e8f0")
    .stroke();

  doc
    .fontSize(11)
    .fillColor("#0f172a")
    .text("Total Paid", 60, totalRowTop + 12, { width: 300 })
    .text(lyd(totalAmount), 450, totalRowTop + 12, {
      width: 90,
      align: "right",
    });

  doc
    .fillColor("#64748b")
    .fontSize(9)
    .text(
      `Payment status: ${booking.paymentStatus || "UNPAID"} · Currency: LYD (Libyan Dinar)`,
      60,
      totalRowTop + 34,
    );

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