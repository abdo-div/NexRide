import PDFDocument from "pdfkit";
import fs from "node:fs";

const ADDON_LABELS = {
  insurance: "Comprehensive protection",
  driver: "Additional driver service",
  childseat: "Child safety seat",
  delivery: "Vehicle delivery",
};

const firstAvailableFont = (paths) => paths.find((fontPath) => fs.existsSync(fontPath));

const ARABIC_FONT = firstAvailableFont([
  "C:/Windows/Fonts/NotoSansArabic-Regular.ttf",
  "C:/Windows/Fonts/arial.ttf",
  "/usr/share/fonts/truetype/noto/NotoSansArabic-Regular.ttf",
  "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
]);

const ARABIC_BOLD_FONT = firstAvailableFont([
  "C:/Windows/Fonts/NotoSansArabic-Bold.ttf",
  "C:/Windows/Fonts/arialbd.ttf",
  "/usr/share/fonts/truetype/noto/NotoSansArabic-Bold.ttf",
  "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
]);

/** Generates a professional A4 invoice from booking/payment snapshots. */
export const generateInvoicePDF = (res, booking, payment = null) => {
  const doc = new PDFDocument({ size: "A4", margin: 48, bufferPages: true });
  const contentWidth = doc.page.width - 96;
  const navy = "#142B4A";
  const ink = "#0F172A";
  const muted = "#64748B";
  const line = "#DCE3EC";
  const pale = "#F4F7FB";
  const green = "#087A55";

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `inline; filename=invoice-${booking._id}.pdf`,
  );
  doc.pipe(res);

  if (ARABIC_FONT) doc.registerFont("InvoiceArabic", ARABIC_FONT);
  if (ARABIC_BOLD_FONT) doc.registerFont("InvoiceArabicBold", ARABIC_BOLD_FONT);

  const fmt = (value) =>
    Number(value || 0).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  const money = (value) => `${fmt(value)} LYD`;
  const date = (value, includeTime = false) => {
    if (!value) return "N/A";
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      ...(includeTime ? { hour: "2-digit", minute: "2-digit" } : {}),
      timeZone: "Africa/Tripoli",
    }).format(new Date(value));
  };
  const valueOr = (value, fallback = "N/A") => value || fallback;
  const invoiceNumber = `NXR-${String(booking._id).slice(-8).toUpperCase()}`;
  const company = booking.companyId || booking.company || {};
  const customer = booking.customerId || booking.user || {};
  const vehicle = booking.vehicleId || booking.vehicle || {};
  const vehicleTitle = [vehicle.year, vehicle.make, vehicle.model]
    .filter(Boolean)
    .join(" ");
  const paid = payment?.status === "COMPLETED" || booking.paymentStatus === "PAID";
  const paymentReference =
    payment?.transactionId || payment?.merchantReference || "Not assigned";

  const sectionTitle = (title, y) => {
    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .fillColor(navy)
      .text(title.toUpperCase(), 48, y, { characterSpacing: 0.8 });
    doc.strokeColor(line).lineWidth(0.8).moveTo(48, y + 17).lineTo(547, y + 17).stroke();
  };

  const detail = (label, value, x, y, width = 220) => {
    const displayValue = String(valueOr(value));
    const isArabic = /[\u0600-\u06FF]/.test(displayValue);
    doc.font("Helvetica").fontSize(8).fillColor(muted).text(label, x, y, { width });
    doc
      .font(isArabic && ARABIC_BOLD_FONT ? "InvoiceArabicBold" : "Helvetica-Bold")
      .fontSize(10)
      .fillColor(ink)
      .text(displayValue, x, y + 13, {
        width,
        align: isArabic ? "right" : "left",
        features: isArabic ? ["rtla"] : undefined,
      });
  };

  const amountRow = (label, amount, y, options = {}) => {
    if (options.fill) doc.fillColor(options.fill).rect(48, y - 5, contentWidth, 25).fill();
    doc
      .font(options.bold ? "Helvetica-Bold" : "Helvetica")
      .fontSize(options.bold ? 11 : 9.5)
      .fillColor(options.color || ink)
      .text(label, 58, y + 2, { width: 330 })
      .text(money(amount), 405, y + 2, { width: 130, align: "right" });
  };

  doc.fillColor(navy).roundedRect(48, 42, contentWidth, 82, 10).fill();
  doc
    .font("Helvetica-Bold")
    .fontSize(24)
    .fillColor("#FFFFFF")
    .text("NexRide", 66, 59)
    .fontSize(9)
    .fillColor("#C9D7EA")
    .text("PROFESSIONAL MOBILITY MARKETPLACE", 66, 88, { characterSpacing: 1 });
  doc
    .font("Helvetica-Bold")
    .fontSize(19)
    .fillColor("#FFFFFF")
    .text("RENTAL INVOICE", 330, 57, { width: 195, align: "right" })
    .font("Helvetica")
    .fontSize(9)
    .fillColor("#C9D7EA")
    .text(invoiceNumber, 330, 86, { width: 195, align: "right" });

  const statusLabel = paid ? "PAID" : "PAYMENT PENDING";
  doc.fillColor(paid ? "#E7F8F1" : "#FFF5DF").roundedRect(48, 138, 118, 25, 12).fill();
  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .fillColor(paid ? green : "#9A6500")
    .text(statusLabel, 48, 146, { width: 118, align: "center" });
  detail("Invoice date", date(payment?.paidAt || booking.createdAt, true), 187, 138, 115);
  detail("Booking reference", String(booking._id), 318, 138, 217);

  sectionTitle("Rental company and customer", 184);
  detail("Rental company", valueOr(company.name, "NexRide Marketplace"), 48, 212);
  detail("Company contact", [company.phone, company.email].filter(Boolean).join("  •  "), 48, 247);
  detail("Renter", valueOr(customer.name, "Customer"), 310, 212);
  detail("Renter contact", [customer.email, customer.phoneNumber].filter(Boolean).join("  •  "), 310, 247);

  sectionTitle("Vehicle and rental details", 289);
  detail("Vehicle", valueOr(vehicleTitle, "Rental vehicle"), 48, 317);
  detail("Vehicle specification", [vehicle.type, vehicle.transmission, vehicle.fuelType].filter(Boolean).join("  •  "), 310, 317);
  detail("Registration / plate", valueOr(vehicle.plateNumber), 48, 352);
  detail("Pickup location", valueOr(booking.pickupLocation, "Branch pickup"), 310, 352);
  detail("Pickup date", date(booking.startDate), 48, 387);
  detail("Return date", date(booking.endDate), 185, 387);
  detail("Rental duration", `${booking.totalDays || 1} day${booking.totalDays === 1 ? "" : "s"}`, 322, 387);
  detail("Daily rate", money(booking.dailyRate), 438, 387, 97);

  sectionTitle("Invoice breakdown", 435);
  doc.fillColor(pale).rect(48, 461, contentWidth, 25).fill();
  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .fillColor(ink)
    .text("DESCRIPTION", 58, 469)
    .text("AMOUNT", 405, 469, { width: 130, align: "right" });

  let rowY = 493;
  amountRow(
    `Vehicle rental (${booking.totalDays || 1} × ${money(booking.dailyRate)})`,
    booking.rentalPrice ?? (booking.totalDays || 1) * (booking.dailyRate || 0),
    rowY,
  );
  rowY += 24;
  for (const addon of booking.addons || []) {
    const quantity = addon.quantity > 1 ? ` (${addon.quantity} × ${money(addon.unitPrice)})` : "";
    amountRow(`${ADDON_LABELS[addon.id] || addon.id}${quantity}`, addon.amount, rowY);
    rowY += 24;
  }
  if (booking.municipalFee > 0) {
    amountRow("Municipal service fee", booking.municipalFee, rowY);
    rowY += 24;
  }
  if (booking.discountAmount > 0) {
    amountRow("Discount", -booking.discountAmount, rowY, { color: green });
    rowY += 24;
  }
  doc.strokeColor(line).moveTo(48, rowY).lineTo(547, rowY).stroke();
  rowY += 12;
  amountRow(paid ? "TOTAL PAID" : "TOTAL DUE", booking.totalAmount, rowY, {
    bold: true,
    fill: navy,
    color: "#FFFFFF",
  });

  const paymentY = Math.max(rowY + 48, 650);
  sectionTitle("Payment record", paymentY);
  detail("Payment method", valueOr(payment?.paymentMethod, "Not recorded").replaceAll("_", " "), 48, paymentY + 28);
  detail("Payment reference", paymentReference, 220, paymentY + 28, 205);
  detail("Currency", payment?.currency || "LYD", 445, paymentY + 28, 90);

  const footerY = 780;
  doc.strokeColor(line).moveTo(48, footerY - 13).lineTo(547, footerY - 13).stroke();
  doc
    .font("Helvetica")
    .fontSize(8)
    .fillColor(muted)
    .text(
      "This invoice was generated electronically from NexRide's booking and payment records.",
      48,
      footerY,
      { width: 360 },
    )
    .font("Helvetica-Bold")
    .fillColor(navy)
    .text("nexride.ly", 430, footerY, { width: 117, align: "right" });

  doc.end();
};
