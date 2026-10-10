import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import User from "../models/User_model.js";
import Company from "../models/Company_model.js";
import AppError from "../utils/appError.js";
import { normalisePhoneNumber } from "./authService.js";
import { addEmailToQueue } from "../queues/emailQueue.js";
import logger from "../utils/logger.js";

const DOCUMENTS_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "public",
  "company-documents",
);

/** Mirrors the Company model's pre-save slug transform (lowercase + dashes). */
export const slugify = (str) =>
  String(str ?? "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Replicates the Company model's pre-validate slug transform
 * (Company_model.js `pre("validate")`): lowercases the name, drops every
 * character that is not a word character or a space (so hyphens and
 * punctuation disappear rather than becoming "-"), then turns spaces into
 * single hyphens. The duplicate-name guard below must compare against this
 * exact stored value, otherwise a brand-new company can collide with an
 * existing tenant's slug and fail with a raw MongoDB E11000 error.
 */
export const companyRecordSlug = (str) =>
  String(str ?? "")
    .toLowerCase()
    .replace(/[^\w ]+/g, "")
    .replace(/ +/g, "-");

/**
 * Best-effort removal of a partially persisted application. `applyForCompany`
 * used to commit the user and company records before fragile work (document
 * writes) happened, so a mid-flight failure left a PENDING application the
 * admin review desk could see even though the applicant never reached the
 * success screen. Deleting both rows (and the uploaded documents directory)
 * keeps the submission atomic from the applicant's point of view.
 */
const rollbackApplication = async (userId, companyId) => {
  if (companyId) {
    try {
      await Company.deleteOne({ _id: companyId });
      await fs.rm(path.join(DOCUMENTS_DIR, String(companyId)), {
        recursive: true,
        force: true,
      });
    } catch {
      // Best-effort only; never mask the original failure.
    }
  }
  if (userId) {
    try {
      await User.deleteOne({ _id: userId });
    } catch {
      // Best-effort only; never mask the original failure.
    }
  }
};

/**
 * Generates a unique, short application reference (e.g. `NX-APP-8842`) used on
 * the applicant's status page and by the admin review desk.
 */
export const generateApplicationRef = async () => {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const ref = `NX-APP-${Math.floor(1000 + Math.random() * 9000)}`;
    const exists = await Company.exists({ applicationRef: ref });
    if (!exists) return ref;
  }
  return `NX-APP-${Math.floor(10000 + Math.random() * 90000)}`;
};

/**
 * Enqueues a PARTNER_APPLICATION_RECEIVED email to every platform administrator
 * so the review desk learns about a new submission without polling. Injectable
 * `enqueue` keeps the helper deterministic under tests.
 */
export const notifyAdminsOfCompanyApplication = async (
  application,
  enqueue = addEmailToQueue,
) => {
  const admins = await User.find({ role: "admin" }).select("email").lean();

  if (admins.length === 0) return;

  await Promise.all(
    admins.map((admin) =>
      enqueue("PARTNER_APPLICATION_RECEIVED", {
        to: admin.email,
        ...application,
      }),
    ),
  );
};

/**
 * Public partner self-registration: creates a company-role account plus a
 * PENDING operator company in a single submission.
 *
 * Steps 1-2 of the wizard map to the User + Company records; steps 3-6
 * (fleet configuration, hubs/depots, rental policies, payout rail and
 * verification documents) are persisted on the Company profile so the admin
 * review desk has the complete application.
 */
export const applyForCompany = async ({ data, files = [] }) => {
  const applicantEmail = String(data.applicant.email).trim().toLowerCase();

  const existingUser = await User.findOne({ email: applicantEmail });
  if (existingUser) {
    throw new AppError(
      "An account with that email already exists. If you already submitted an application, sign in with this email to check its status.",
      409,
    );
  }

  // The stored slug uses the model transform, not the service `slugify`
  // (which keeps hyphens). Matching on BOTH catches any tenant whose stored
  // slug would collide with this application's generated slug, so a
  // legitimately new company never trips a raw Mongo duplicate-key error.
  const serviceSlug = slugify(data.company.name);
  const storedSlug = companyRecordSlug(data.company.name);
  const existingCompany = await Company.findOne({
    $or: [
      { slug: serviceSlug },
      { slug: storedSlug },
      { name: { $regex: `^${escapeRegExp(data.company.name)}$`, $options: "i" } },
    ],
  });
  if (existingCompany) {
    throw new AppError(
      "A company with this name is already registered or under review.",
      409,
    );
  }

  const normalizedPhone = normalisePhoneNumber(data.applicant.phoneNumber);
  const applicationRef = await generateApplicationRef();

  let userId;
  let companyId;
  try {
    const user = await User.create({
      name: data.applicant.name,
      email: applicantEmail,
      phoneNumber: normalizedPhone,
      password: data.applicant.password,
      passwordConfirm: data.applicant.passwordConfirm,
      role: "company",
    });
    userId = user._id;

    // The subdomain is derived from the official company name; a numeric suffix
    // avoids collisions with existing tenants while the slug stays human-readable.
    const baseSubdomain = (storedSlug.slice(0, 30) || "nexride-partner").replace(
      /-$/,
      "",
    );
    let subdomain = baseSubdomain;
    let suffix = 2;
    while (await Company.findOne({ subdomain })) {
      subdomain = `${baseSubdomain.slice(0, 30 - String(suffix).length)}${suffix}`;
      suffix += 1;
    }

    const company = await Company.create({
      ownerId: user._id,
      name: data.company.name,
      subdomain,
      applicationRef,
      email: applicantEmail,
      phone: normalizedPhone,
      city: data.company.city,
      address: data.company.address,
      commercialRegisterNumber: String(data.company.commercialRegisterNumber).trim(),
      fleetSizeTier: data.fleet.tier,
      vehicleCategories: data.fleet.categories,
      operatingHubs: data.hubs.active,
      depots: data.hubs.depots,
      rentalPolicy: data.policy,
      payout: data.payout,
      status: "PENDING",
    });
    companyId = company._id;

    user.company = company._id;

    // The User pre-save password hook sets `passwordConfirm` to undefined, so
    // a second `save()` would re-validate that required path as missing and
    // fail the whole submission ("User validation failed: passwordConfirm").
    // Re-validating only the paths this save actually changed (`company`) is
    // safe and keeps the two-record write intact.
    await user.save({ validateModifiedOnly: true });

    if (files.length > 0) {
      const documents = [];
      const companyDir = path.join(DOCUMENTS_DIR, String(company._id));
      await fs.mkdir(companyDir, { recursive: true });

      for (const file of files) {
        const safeName = String(file.originalname ?? "document")
          .replace(/[^a-z0-9._-]+/gi, "-")
          .slice(0, 80);
        const storedName = `${Date.now()}-${Math.round(Math.random() * 1e9)}-${safeName}`;
        await fs.writeFile(path.join(companyDir, storedName), file.buffer);

        const meta =
          (data.documents ?? []).find((doc) => doc.name === file.originalname) ??
          {};

        documents.push({
          name: file.originalname,
          kind: meta.kind ?? "OTHER",
          mimeType: file.mimetype,
          size: file.size,
          url: `/company-documents/${company._id}/${storedName}`,
        });
      }

      company.applicationDocuments = documents;
      await company.save();
    }

    try {
      await notifyAdminsOfCompanyApplication({
        applicationRef,
        companyName: company.name,
        city: company.city,
        subdomain,
        applicantName: user.name,
        applicantEmail: applicantEmail,
        applicantPhone: normalizedPhone,
        fleetTier: company.fleetSizeTier,
        fleetCategories: company.vehicleCategories,
        hubs: company.operatingHubs,
        depotsCount: (company.depots ?? []).length,
        docsCount: (company.applicationDocuments ?? []).length,
        payoutBank: company.payout?.bankName ?? null,
      });
    } catch (err) {
      // A notification hiccup must never fail the submission itself.
      logger.warn({ err: err.message }, "Admin application notification skipped");
    }

    return { user, company };
  } catch (err) {
    // A failed submission must never leave a half-registered company behind
    // (the exact bug that let "failed" applications appear in the admin desk).
    await rollbackApplication(userId, companyId);

    // Slug/subdomain uniqueness races against records created between the
    // pre-check and insert surface as Mongo E11000; translate to the same
    // friendly 409 instead of leaking a raw "duplicate key" message.
    if (err?.code === 11000) {
      throw new AppError(
        "A company with this name is already registered or under review.",
        409,
      );
    }
    throw err;
  }
};