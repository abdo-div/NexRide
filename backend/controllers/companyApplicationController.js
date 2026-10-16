import multer from "multer";
import { ZodError } from "zod";
import fs from "node:fs/promises";
import path from "node:path";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";
import Company from "../models/Company_model.js";
import { applyForCompany } from "../services/companyApplicationService.js";
import { companyApplicationSchema } from "../validations/companyApplication.validation.js";
import {
  companyDocumentApiPath,
  companyDocumentsDirectory,
} from "../config/privateStorage.js";

// -----------------------------------------------------------------------------
// Multipart upload: the wizard's structured fields arrive in the `data` part
// (a JSON string) while verification documents are attached as file parts.
// Only PDFs and common image formats are accepted so the review desk can
// inspect both registry certificates and scanned IDs.
// -----------------------------------------------------------------------------
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    const allowed = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new AppError(
          "Documents must be PDF, JPEG, PNG, or WebP files",
          400,
        ),
        false,
      );
    }
  },
  limits: { fileSize: 5 * 1024 * 1024, files: 4 },
});

export const uploadApplicationDocuments = upload.array("documents", 4);

const issueMap = (issues) =>
  issues.map((issue) => ({
    field: issue.path.join("."),
    message: issue.message,
  }));

/**
 * Public self-registration for fleet operators (steps 1-6 of the partner
 * application wizard). Creates the company-role account + PENDING company in
 * one submission and starts a session so the applicant lands on an
 * "application received" screen immediately.
 */
export const applyCompany = catchAsync(async (req, res, next) => {
  let rawData;
  try {
    rawData = JSON.parse(req.body.data);
  } catch {
    return next(new AppError("Invalid application payload", 400));
  }

  let data;
  try {
    data = companyApplicationSchema.parse(rawData);
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        status: "fail",
        message: "Invalid request data",
        errors: issueMap(error.issues || []),
      });
    }
    return next(error);
  }

  const { user, company } = await applyForCompany({
    data,
    files: req.files ?? [],
  });

  // The applicant is deliberately NOT signed in here. A company account only
  // becomes usable after an admin approves the request; opening a session now
  // would let a PENDING partner straight into the company dashboard.
  res.status(201).json({
    status: "success",
    message:
      "Your partner application has been submitted. You will be able to sign in once NexRide approves it.",
    data: { user, company },
  });
});

/**
 * Self-service application status for the partner-wizard owner. Uses the
 * lenient guard so a PENDING or REJECTED company-role owner can still read
 * their own submission while the admin desk works through the queue.
 */
export const getMyApplicationStatus = catchAsync(async (req, res, next) => {
  const companyId = req.user.company?._id ?? req.user.company;

  const company = await Company.findById(companyId).select(
    "+commercialRegisterNumber",
  );
  if (!company) {
    return next(new AppError("No application found for this account.", 404));
  }

  res.status(200).json({
    status: "success",
    data: {
      company: {
        _id: company._id,
        applicationRef: company.applicationRef,
        status: company.status,
        name: company.name,
        email: company.email,
        phone: company.phone,
        city: company.city,
        address: company.address,
        commercialRegisterNumber: company.commercialRegisterNumber,
        fleetSizeTier: company.fleetSizeTier,
        vehicleCategories: company.vehicleCategories || [],
        operatingHubs: company.operatingHubs || [],
        depots: company.depots || [],
        rentalPolicy: company.rentalPolicy,
        payout: company.payout,
        applicationDocuments: (company.applicationDocuments || []).map(
          (doc) => {
            const storedName = storedNameFromUrl(doc.url);
            return {
              name: doc.name,
              kind: doc.kind,
              size: doc.size,
              url: storedName
                ? companyDocumentApiPath(company._id, storedName)
                : "",
            };
          },
        ),
        rejectionReason: company.rejectionReason || null,
        createdAt: company.createdAt,
        approvedAt: company.approvedAt,
      },
    },
  });
});

const allowedDocumentMimeTypes = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const storedNameFromUrl = (url) => {
  const segment = String(url ?? "").split("/").pop();
  if (!segment) return null;
  try {
    return decodeURIComponent(segment);
  } catch {
    return null;
  }
};

/**
 * Streams one private partner-verification document to its owning company or
 * a platform admin. Database metadata is checked before disk access so knowing
 * a company id and filename is never enough to retrieve a file.
 */
export const downloadApplicationDocument = catchAsync(
  async (req, res, next) => {
    const { companyId, storedName } = req.params;
    const role = req.user?.role;

    if (
      role !== "admin" &&
      (role !== "company" || String(req.tenantId ?? "") !== companyId)
    ) {
      return next(
        new AppError("You do not have permission to access this document.", 403),
      );
    }

    const company = await Company.findById(companyId).select(
      "applicationDocuments",
    );
    if (!company) {
      return next(new AppError("Application document not found.", 404));
    }

    const document = (company.applicationDocuments ?? []).find(
      (candidate) => storedNameFromUrl(candidate.url) === storedName,
    );
    if (!document) {
      return next(new AppError("Application document not found.", 404));
    }

    const companyDirectory = path.resolve(companyDocumentsDirectory, companyId);
    const filePath = path.resolve(companyDirectory, storedName);
    if (path.dirname(filePath) !== companyDirectory) {
      return next(new AppError("Invalid document path.", 400));
    }

    let contents;
    try {
      contents = await fs.readFile(filePath);
    } catch (error) {
      if (error?.code === "ENOENT") {
        return next(new AppError("Application document not found.", 404));
      }
      throw error;
    }

    const mimeType = allowedDocumentMimeTypes.has(document.mimeType)
      ? document.mimeType
      : "application/octet-stream";

    res.set({
      "Cache-Control": "private, no-store, max-age=0",
      "Content-Disposition": "inline",
      "Content-Type": mimeType,
      "X-Content-Type-Options": "nosniff",
    });
    res.status(200).send(contents);
  },
);
