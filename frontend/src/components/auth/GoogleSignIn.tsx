import { useState } from "react";
import { GoogleLogin, type CredentialResponse } from "@react-oauth/google";
import { useLocation, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../context/useAuth";
import { ApiError } from "../../lib/apiClient";
import { FormAlert } from "./AuthFeedback";

export const GoogleSignIn = () => {
  const { t } = useTranslation();
  const { googleSignIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState("");

  const requestedDestination = (location.state as { from?: string } | null)?.from;
  const customerRedirect =
    requestedDestination?.startsWith("/") && !requestedDestination.startsWith("//")
      ? requestedDestination
      : "/";

  const handleSuccess = async ({ credential }: CredentialResponse) => {
    if (!credential) {
      setError(t("auth.google.missingCredential"));
      return;
    }

    setError("");
    try {
      const user = await googleSignIn({ idToken: credential });
      const redirectTo =
        user.role === "admin"
          ? "/admin"
          : user.role === "company"
            ? "/company"
            : customerRedirect;
      navigate(redirectTo, { replace: true });
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : t("auth.errors.unexpected"));
    }
  };

  return (
    <div className="mt-6 flex flex-col gap-4">
      <div className="flex items-center gap-3" aria-hidden="true">
        <span className="h-px flex-1 bg-slate-200" />
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          {t("auth.google.divider")}
        </span>
        <span className="h-px flex-1 bg-slate-200" />
      </div>
      {error && <FormAlert tone="error">{error}</FormAlert>}
      <div className="flex min-h-11 justify-center">
        <GoogleLogin
          onSuccess={(response) => void handleSuccess(response)}
          onError={() => setError(t("auth.google.popupFailed"))}
          text="continue_with"
          shape="rectangular"
          size="large"
          width="360"
        />
      </div>
    </div>
  );
};
