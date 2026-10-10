import React from "react";
import { Navigate, useLocation } from "react-router";
import { LoaderCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../context/useAuth";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * Gate for routes that require a signed-in user. The attempted location is
 * forwarded so sign-in can return the visitor to where they were headed.
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isInitialising } = useAuth();
  const location = useLocation();
  const { t } = useTranslation();

  if (isInitialising) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoaderCircle className="w-8 h-8 animate-spin text-[#2563EB]" />
        <span className="sr-only">{t("auth.state.restoring")}</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
