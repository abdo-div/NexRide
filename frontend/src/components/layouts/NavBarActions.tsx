import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { LayoutDashboard, LogOut, UserRound, Zap } from "lucide-react";
import { LanguageToggle } from "./LanguageToggle";
import { useAuth } from "../../context/useAuth";

interface NavBarActionsProps {
  onDark?: boolean;
}

export const NavBarActions: React.FC<NavBarActionsProps> = () => {
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
    <div className="flex items-center gap-2 sm:gap-3 shrink-0">
      {/* Language Toggle */}
      <LanguageToggle />

      {/* Auth / Profile Area */}
      {isAuthenticated ? (
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setIsMenuOpen((open) => !open)}
            aria-expanded={isMenuOpen}
            aria-haspopup="menu"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs sm:text-sm font-semibold text-slate-700 hover:text-blue-600 hover:bg-slate-100 transition-colors"
          >
            <UserRound className="w-4 h-4 text-blue-600" />
            <span className="max-w-[8rem] truncate">{user?.name}</span>
          </button>

          {isMenuOpen && (
            <div
              role="menu"
              className="absolute end-0 mt-2 w-56 rounded-2xl border border-slate-100 bg-white shadow-[0_12px_32px_-8px_rgba(15,23,42,0.18)] p-2 z-50 backdrop-blur-md"
            >
              <div className="px-3 py-2 border-b border-slate-100 mb-1">
                <p className="text-sm font-bold text-slate-900 truncate">
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
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-slate-800 hover:bg-slate-50 hover:text-blue-600 transition-colors"
              >
                <LayoutDashboard className="w-4 h-4 text-blue-600" />
                <span>{t("nav.myBookings")}</span>
              </Link>
              {user?.role?.trim() === "admin" && (
                <Link
                  to="/admin"
                  role="menuitem"
                  onClick={() => setIsMenuOpen(false)}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-slate-800 hover:bg-slate-50 hover:text-blue-600 transition-colors"
                >
                  <LayoutDashboard className="w-4 h-4 text-blue-600" />
                  <span>{t("nav.adminPanel")}</span>
                </Link>
              )}
              {user?.role?.trim() === "company" && (
                <Link
                  to="/company"
                  role="menuitem"
                  onClick={() => setIsMenuOpen(false)}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-slate-800 hover:bg-slate-50 hover:text-blue-600 transition-colors"
                >
                  <LayoutDashboard className="w-4 h-4 text-blue-600" />
                  <span>{t("nav.companyDashboard")}</span>
                </Link>
              )}
              <button
                type="button"
                role="menuitem"
                onClick={handleSignOut}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-start text-sm font-medium text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
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
          className="text-xs sm:text-sm font-bold text-slate-700 hover:text-blue-600 px-2.5 py-1.5 rounded-full hover:bg-slate-100/70 transition-colors"
        >
          {t("nav.signIn")}
        </Link>
      )}

      {/* Add your Fleet Button - linked to /partner/apply */}
      <Link
        to="/partner/apply"
        className="inline-flex items-center gap-1.5 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-blue-500/25 hover:shadow-lg hover:shadow-blue-500/35 active:scale-95 transition-all shrink-0"
      >
        <Zap className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
        <span>{t("nav.listFleet")}</span>
      </Link>
    </div>
  );
};

export default NavBarActions;