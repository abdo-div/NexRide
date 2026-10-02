import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { Heart, LayoutDashboard, LogOut, UserRound } from "lucide-react";
import { LanguageToggle } from "./LanguageToggle";
import { useAuth } from "../../context/useAuth";

interface NavBarActionsProps {
  onDark?: boolean;
}

export const NavBarActions: React.FC<NavBarActionsProps> = ({
  onDark = false,
}) => {
  const { t } = useTranslation();
  const { user, isAuthenticated, signOut } = useAuth();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isMenuOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsMenuOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMenuOpen]);

  const handleSignOut = async () => {
    setIsMenuOpen(false);
    await signOut();
    navigate("/", { replace: true });
  };

  return (
    <div className="flex items-center gap-4 shrink-0">
      <LanguageToggle onDark={onDark} />

      <a
        href="#saved"
        className={`relative p-2 transition-colors flex items-center gap-1.5 text-sm font-semibold ${
          onDark
            ? "text-white hover:text-rose-300 [text-shadow:0_1px_3px_rgba(0,0,0,0.35)]"
            : "text-slate-600 hover:text-rose-500"
        }`}
        title={t("nav.saved")}
      >
        <Heart className="w-5 h-5" />
        <span className="hidden md:inline">{t("nav.saved")}</span>
        <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-600"></span>
      </a>

      {isAuthenticated ? (
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setIsMenuOpen((open) => !open)}
            aria-expanded={isMenuOpen}
            aria-haspopup="menu"
            className={`hidden sm:inline-flex items-center gap-2 px-2 py-1 text-sm font-semibold transition-colors ${
              onDark
                ? "text-white hover:text-blue-300 [text-shadow:0_1px_3px_rgba(0,0,0,0.35)]"
                : "text-slate-700 hover:text-blue-600"
            }`}
          >
            <UserRound className="w-5 h-5" />
            <span className="max-w-[10rem] truncate">{user?.name}</span>
          </button>

          {isMenuOpen && (
            <div
              role="menu"
              className="absolute end-0 mt-2 w-56 rounded-xl border border-[#E2E8F0] bg-white shadow-[0_12px_32px_-8px_rgba(15,23,42,0.18)] p-2 z-50"
            >
              <div className="px-3 py-2 border-b border-[#E2E8F0] mb-1">
                <p className="text-sm font-semibold text-[#0F172A] truncate">
                  {user?.name}
                </p>
                <p className="text-[11px] text-slate-500 truncate" dir="ltr">
                  {user?.email}
                </p>
              </div>
              <Link
                to="/my-bookings"
                role="menuitem"
                onClick={() => setIsMenuOpen(false)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-[#0F172A] hover:bg-[#F1F5F9] transition-colors"
              >
                <LayoutDashboard className="w-4 h-4 text-[#2563EB]" />
                <span>{t("nav.myBookings")}</span>
              </Link>
              {user?.role?.trim() === "admin" && (
                <Link
                  to="/admin"
                  role="menuitem"
                  onClick={() => setIsMenuOpen(false)}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-[#0F172A] hover:bg-[#F1F5F9] transition-colors"
                >
                  <LayoutDashboard className="w-4 h-4 text-[#2563EB]" />
                  <span>{t("nav.adminPanel")}</span>
                </Link>
              )}
              <button
                type="button"
                role="menuitem"
                onClick={handleSignOut}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-start text-sm font-medium text-rose-600 hover:bg-rose-50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>{t("auth.nav.signOut")}</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <Link
          to="/login"
          className={`hidden sm:inline-flex items-center text-sm font-semibold transition-colors px-2 py-1 ${
            onDark
              ? "text-white hover:text-blue-300 [text-shadow:0_1px_3px_rgba(0,0,0,0.35)]"
              : "text-slate-700 hover:text-blue-600"
          }`}
        >
          {t("nav.signIn")}
        </Link>
      )}

      <a
        href="#list-fleet"
        className="inline-flex items-center px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-md hover:shadow-lg transition-all active:scale-95"
      >
        {t("nav.listFleet")}
      </a>
    </div>
  );
};