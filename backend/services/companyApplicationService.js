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
      "An account with that email already exists. Please sign in and submit your application from the operator dashboard.",
      409,
    );
  }

  const slug = slugify(data.company.name);
  const existingCompany = await Company.findOne({
    $or: [
      { slug },
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

  const user = await User.create({
    name: data.applicant.name,
    email: applicantEmail,
    phoneNumber: normalizedPhone,
    password: data.applicant.password,
    passwordConfirm: data.applicant.passwordConfirm,
    role: "company",
  });

  // The subdomain is derived from the official company name; a numeric suffix
  // avoids collisions with existing tenants while the slug stays human-readable.
  const baseSubdomain = (slug.slice(0, 30) || "nexride-partner").replace(
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

  user.company = company._id;
  await user.save();

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
};