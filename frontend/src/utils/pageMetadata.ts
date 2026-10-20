export type PageMetadataKey =
  | "home"
  | "fleet"
  | "companies"
  | "company"
  | "vehicle"
  | "partner"
  | "terms"
  | "privacy"
  | "cancellation"
  | "booking"
  | "account"
  | "dashboard";

export interface PageMetadataRoute {
  key: PageMetadataKey;
  indexable: boolean;
}

export function resolvePageMetadata(pathname: string): PageMetadataRoute {
  if (pathname === "/") return { key: "home", indexable: true };
  if (pathname === "/fleet" || pathname === "/FleetPage") {
    return { key: "fleet", indexable: true };
  }
  if (pathname === "/companies") return { key: "companies", indexable: true };
  if (/^\/companies\/[^/]+$/.test(pathname)) return { key: "company", indexable: true };
  if (/^\/(?:cars|vehicles)\/[^/]+$/.test(pathname)) {
    return { key: "vehicle", indexable: true };
  }
  if (pathname === "/partner/apply") return { key: "partner", indexable: true };
  if (pathname === "/terms") return { key: "terms", indexable: true };
  if (pathname === "/privacy") return { key: "privacy", indexable: true };
  if (pathname === "/cancellation-policy") {
    return { key: "cancellation", indexable: true };
  }
  if (/^\/(?:checkout|payment|booking-confirmed)\//.test(pathname)) {
    return { key: "booking", indexable: false };
  }
  if (
    pathname === "/login" ||
    pathname === "/auth" ||
    pathname.startsWith("/reset-password/") ||
    pathname.startsWith("/my-") ||
    pathname === "/company/application-status"
  ) {
    return { key: "account", indexable: false };
  }
  if (pathname.startsWith("/admin") || pathname.startsWith("/company")) {
    return { key: "dashboard", indexable: false };
  }
  return { key: "home", indexable: false };
}
