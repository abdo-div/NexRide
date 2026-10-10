import Company from "../models/Company_model.js";
import AppError from "../utils/appError.js";
import catchAsync from "../utils/catchAsync.js";

export const resolveTenant = catchAsync(async (req, res, next) => {
  const hostnames = [];

  // Prefer the browser origin because the API host is commonly shared by all
  // tenants. Fall back to the request host for direct tenant-domain requests.
  if (req.headers.origin) {
    try {
      hostnames.push(new URL(req.headers.origin).hostname);
    } catch {
      // An invalid Origin cannot identify a tenant, so continue with Host.
    }
  }

  const requestHost = req.hostname || req.headers.host?.split(":")[0];
  if (requestHost) hostnames.push(requestHost);

  const reservedSubdomains = new Set(["www", "api", "admin", "localhost"]);
  const subdomains = [
    ...new Set(
      hostnames
        .map((hostname) => hostname.split(".")[0]?.toLowerCase())
        .filter((subdomain) => subdomain && !reservedSubdomains.has(subdomain)),
    ),
  ];

  let company = null;
  let matchedDomain = false;

  if (subdomains.length > 0) {
    company = await Company.findOne({
      subdomain: { $in: subdomains },
      deletedAt: null,
      status: "APPROVED",
    });
    matchedDomain = Boolean(company);
  }

  // Company uses status: APPROVED as its active state (there is no
  // operationalStatus field on this model). Prefer an active company, then any
  // available non-deleted company so local/shared-domain requests still get a
  // tenant context.
  if (!company) {
    company = await Company.findOne({
      deletedAt: null,
      status: "APPROVED",
    });
  }

  if (!company) {
    company = await Company.findOne({ deletedAt: null });
  }

  if (!company) {
    return next(
      new AppError("Rental company domain not found or deactivated.", 404)
    );
  }

  // Inject company details directly into the Request object
  req.tenant = company;
  req.tenantId = company._id;
  // Consumers that expose a global public catalogue must distinguish a real
  // tenant-domain match from the compatibility fallback. Otherwise a shared
  // frontend host (for example a Render static-site domain) is accidentally
  // restricted to whichever company happened to be returned first.
  req.tenantResolution = matchedDomain ? "domain" : "fallback";

  next();
});
