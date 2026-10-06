import React from "react";
import { Navigate, useLocation } from "react-router";
import { LoaderCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../context/useAuth";

interface CompanyRouteProps {
  children: React.ReactNode;
}

/**
 * Gate for the fleet-operator area. Only an authenticated user whose role is
 * `company` may enter; everyone else is bounced off (to sign-in when signed
 * out, to the home page for customers/admins).
 */
export const CompanyRoute: React.FC<CompanyRouteProps> = ({ children }) => {
  const { isAuthenticated, isInitialising, user } = useAuth();
  const location = useLocation();
  const { t } = useTranslation();

  if (isInitialising) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoaderCircle className="h-8 w-8 animate-spin text-[#2563EB]" />
        <span className="sr-only">{t("auth.state.restoring")}</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  // Roles may arrive with surrounding whitespace from legacy seed data.
  if (user?.role?.trim() !== "company") {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default CompanyRoute;