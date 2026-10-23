import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import User from "../models/User_model.js";
import Booking from "../models/booking_model.js";
import Company from "../models/Company_model.js";
import AppError from "../utils/appError.js";

const root = path.resolve(
  process.env.PRIVATE_STORAGE_ROOT || path.join(process.cwd(), "private-storage"),
  "driver-documents",
);

const extensionFor = (mime) =>
  ({ "application/pdf": ".pdf", "image/jpeg": ".jpg", "image/png": ".png" })[mime];

const hasValidSignature = (file) => {
  if (!file?.buffer) return false;
  if (file.mimetype === "application/pdf") return file.buffer.subarray(0, 4).toString() === "%PDF";
  if (file.mimetype === "image/jpeg") return file.buffer[0] === 0xff && file.buffer[1] === 0xd8;
  if (file.mimetype === "image/png") return file.buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  return false;
};

const effectiveStatus = (verification) => {
  if (verification?.status === "APPROVED") {
    const expiries = [verification.licence?.expiresAt, verification.identity?.expiresAt]
      .filter(Boolean)
      .map((value) => new Date(value));
    if (expiries.some((date) => date <= new Date())) return "EXPIRED";
  }
  return verification?.status ?? "NOT_UPLOADED";
};

export const serializeDriverVerification = (verification = {}) => ({
  status: effectiveStatus(verification),
  licence: {
    uploaded: Boolean(verification.licence?.filename),
    originalName: verification.licence?.originalName ?? null,
    mimeType: verification.licence?.mimeType ?? null,
    uploadedAt: verification.licence?.uploadedAt ?? null,
    expiresAt: verification.licence?.expiresAt ?? null,
  },
  identity: {
    uploaded: Boolean(verification.identity?.filename),
    originalName: verification.identity?.originalName ?? null,
    mimeType: verification.identity?.mimeType ?? null,
    uploadedAt: verification.identity?.uploadedAt ?? null,
    expiresAt: verification.identity?.expiresAt ?? null,
  },
  reviewedAt: verification.reviewedAt ?? null,
  rejectionReason: verification.rejectionReason ?? null,
});

const loadUserWithPrivateDocuments = (userId) =>
  User.findById(userId).select("+driverVerification.licence.filename +driverVerification.identity.filename name email role driverVerification");

export const saveCustomerDriverDocuments = async (userId, files, body) => {
  const user = await loadUserWithPrivateDocuments(userId);
  if (!user || user.role !== "customer") throw new AppError("Customer not found", 404);
  const licenceExpiry = new Date(body.licenceExpiry);
  const identityExpiry = body.identityExpiry ? new Date(body.identityExpiry) : null;
  if (!Number.isFinite(licenceExpiry.getTime()) || licenceExpiry <= new Date()) {
    throw new AppError("Driving licence expiry must be a future date.", 400);
  }
  if (identityExpiry && (!Number.isFinite(identityExpiry.getTime()) || identityExpiry <= new Date())) {
    throw new AppError("Identity document expiry must be a future date.", 400);
  }

  const licence = files?.licence?.[0];
  const identity = files?.identity?.[0];
  const replacedFiles = [
    licence ? user.driverVerification?.licence?.filename : null,
    identity ? user.driverVerification?.identity?.filename : null,
  ].filter(Boolean);
  if (!licence && !user.driverVerification?.licence?.filename) {
    throw new AppError("Please upload your driving licence.", 400);
  }
  if (!identity && !user.driverVerification?.identity?.filename) {
    throw new AppError("Please upload your ID or passport.", 400);
  }

  await fs.mkdir(root, { recursive: true });
  const write = async (file, kind) => {
    if (!file) return null;
    if (!hasValidSignature(file)) throw new AppError("Document contents do not match the selected file type.", 400);
    const filename = `${user._id}-${kind}-${crypto.randomUUID()}${extensionFor(file.mimetype)}`;
    await fs.writeFile(path.join(root, filename), file.buffer, { flag: "wx" });
    return { filename, originalName: file.originalname, mimeType: file.mimetype, uploadedAt: new Date() };
  };
  const [savedLicence, savedIdentity] = await Promise.all([
    write(licence, "licence"),
    write(identity, "identity"),
  ]);
  if (savedLicence) user.driverVerification.licence = { ...savedLicence, expiresAt: licenceExpiry };
  else user.driverVerification.licence.expiresAt = licenceExpiry;
  if (savedIdentity) user.driverVerification.identity = { ...savedIdentity, expiresAt: identityExpiry };
  else if (user.driverVerification.identity) user.driverVerification.identity.expiresAt = identityExpiry;
  user.driverVerification.status = "PENDING";
  user.driverVerification.reviewedAt = undefined;
  user.driverVerification.reviewedBy = undefined;
  user.driverVerification.rejectionReason = undefined;
  await user.save({ validateBeforeSave: false });
  await Promise.all(
    replacedFiles.map((filename) =>
      fs.unlink(path.join(root, path.basename(filename))).catch(() => {}),
    ),
  );
  return serializeDriverVerification(user.driverVerification);
};

export const assertReviewerAccess = async (actor, customerId) => {
  if (actor.role === "admin") return;
  if (actor.role !== "company") throw new AppError("Access denied", 403);
  const companyId = actor.company ?? (await Company.findOne({ ownerId: actor._id }).select("_id"))?._id;
  if (!companyId) throw new AppError("Company profile not found", 403);
  const relationship = await Booking.exists({ customerId, companyId });
  if (!relationship) throw new AppError("This customer has no booking with your company.", 403);
};

export const getDriverVerification = async (customerId, actor) => {
  if (actor._id.toString() !== customerId.toString()) await assertReviewerAccess(actor, customerId);
  const user = await loadUserWithPrivateDocuments(customerId);
  if (!user) throw new AppError("Customer not found", 404);
  return serializeDriverVerification(user.driverVerification);
};

export const reviewDriverVerification = async (customerId, actor, { status, rejectionReason }) => {
  await assertReviewerAccess(actor, customerId);
  if (!['APPROVED', 'REJECTED'].includes(status)) throw new AppError("Review status must be APPROVED or REJECTED.", 400);
  if (status === "REJECTED" && !rejectionReason?.trim()) throw new AppError("A rejection reason is required.", 400);
  const user = await loadUserWithPrivateDocuments(customerId);
  if (!user) throw new AppError("Customer not found", 404);
  if (!user.driverVerification?.licence?.filename || !user.driverVerification?.identity?.filename) {
    throw new AppError("Both documents must be uploaded before review.", 409);
  }
  user.driverVerification.status = status;
  user.driverVerification.reviewedAt = new Date();
  user.driverVerification.reviewedBy = actor._id;
  user.driverVerification.rejectionReason = status === "REJECTED" ? rejectionReason.trim() : undefined;
  await user.save({ validateBeforeSave: false });
  return serializeDriverVerification(user.driverVerification);
};

export const resolveDriverDocumentFile = async (customerId, actor, kind) => {
  if (!['licence', 'identity'].includes(kind)) throw new AppError("Unknown document type", 400);
  if (actor._id.toString() !== customerId.toString()) await assertReviewerAccess(actor, customerId);
  const user = await loadUserWithPrivateDocuments(customerId);
  const document = user?.driverVerification?.[kind];
  if (!document?.filename) throw new AppError("Document not found", 404);
  return { path: path.join(root, path.basename(document.filename)), mimeType: document.mimeType, name: document.originalName };
};
