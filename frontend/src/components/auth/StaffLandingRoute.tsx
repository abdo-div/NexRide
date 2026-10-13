import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router";
import { LoaderCircle } from "lucide-react";
import { useAuth } from "../../context/useAuth";

/** Keeps staff accounts inside their operational workspace after session restore. */
export const StaffLandingRoute = ({ children }: { children: ReactNode }) => {
  const { user, isInitialising } = useAuth();
  const location = useLocation();

  if (isInitialising) {
    return <div className="flex min-h-[60vh] items-center justify-center"><LoaderCircle className="h-8 w-8 animate-spin text-[#142B4A]" /></div>;
  }

  const role = user?.role?.trim();
  const isPublicWebsitePreview =
    location.pathname === "/" &&
    new URLSearchParams(location.search).get("preview") === "website";

  if (isPublicWebsitePreview) return <>{children}</>;
  if (role === "admin") return <Navigate to="/admin" replace />;
  if (role === "company") return <Navigate to="/company" replace />;
  return <>{children}</>;
};

export default StaffLandingRoute;
