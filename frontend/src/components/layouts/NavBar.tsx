import React, { useState } from "react";
import { Link, useLocation } from "react-router";
import { useTranslation } from "react-i18next";
import { Menu, X, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { NavBarLogo } from "./NavBarLogo";
import { NavBarActions } from "./NavBarActions";
import { useAuth } from "../../context/useAuth";

export const NavBar: React.FC = () => {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isHomePage = location.pathname === "/";

  return (
    <header className="fixed top-3 sm:top-4 left-0 right-0 z-50 w-full px-3 sm:px-6 pointer-events-none flex justify-center">
      <div className="pointer-events-auto w-full max-w-7xl bg-white/95 backdrop-blur-md rounded-full shadow-[0_10px_35px_-5px_rgba(0,0,0,0.08),0_1px_3px_rgba(0,0,0,0.05)] border border-slate-200/80 px-3 sm:px-5 py-2 sm:py-2.5 flex items-center justify-between gap-3 transition-all duration-300">
        {/* Right side: Logo & Brand Tagline */}
        <NavBarLogo />

        {/* Center: Navigation Pill Capsule */}
        <nav
          aria-label="Main Navigation"
          className="hidden xl:flex items-center bg-slate-100/80 p-1 rounded-full border border-slate-200/50 text-xs sm:text-sm font-semibold text-slate-600"
        >
          <Link
            to="/"
            className={`px-4 py-1.5 rounded-full transition-all ${
              isHomePage
                ? "bg-white text-blue-600 font-bold shadow-xs"
                : "text-slate-600 hover:text-blue-600 hover:bg-white/60"
            }`}
          >
            {t("nav.home")}
          </Link>

          <Link
            to="/fleet"
            className="px-3.5 py-1.5 rounded-full text-slate-600 hover:text-blue-600 hover:bg-white/60 transition-all"
          >
            {t("nav.browseCars")}
          </Link>

          <Link
            to="/#fleet-operators"
            className="px-3.5 py-1.5 rounded-full text-slate-600 hover:text-blue-600 hover:bg-white/60 transition-all"
          >
            {i18n.language === "ar" ? "عن الشركة" : t("nav.fleetPartners")}
          </Link>

          <Link
            to="/#how-it-works"
            className="px-3.5 py-1.5 rounded-full text-slate-600 hover:text-blue-600 hover:bg-white/60 transition-all"
          >
            {i18n.language === "ar" ? "الشروط والأحكام" : t("nav.howItWorks")}
          </Link>

          <Link
            to="/#locations"
            className="px-3.5 py-1.5 rounded-full text-slate-600 hover:text-blue-600 hover:bg-white/60 transition-all"
          >
            {i18n.language === "ar" ? "المواقع والمطارات" : t("nav.locations")}
          </Link>

          <Link
            to="/#contact"
            className="px-3.5 py-1.5 rounded-full text-slate-600 hover:text-blue-600 hover:bg-white/60 transition-all"
          >
            {t("nav.contact")}
          </Link>

          {isAuthenticated && (
            <Link
              to="/my-bookings"
              className="px-3.5 py-1.5 rounded-full text-slate-600 hover:text-blue-600 hover:bg-white/60 transition-all"
            >
              {t("nav.myBookings")}
            </Link>
          )}
        </nav>

        {/* Left side: Actions & CTA (Add your fleet) */}
        <div className="flex items-center gap-2">
          <NavBarActions />

          {/* Mobile Menu Hamburger */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
            className="xl:hidden w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 hover:text-blue-600 hover:bg-slate-200 transition-colors"
          >
            {mobileMenuOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Animated Dropdown Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="pointer-events-auto absolute top-16 left-3 right-3 sm:left-6 sm:right-6 max-w-lg mx-auto bg-white/95 backdrop-blur-xl border border-slate-200/80 rounded-3xl p-5 shadow-2xl xl:hidden z-50 flex flex-col gap-3"
          >
            <div className="flex flex-col gap-1.5">
              <Link
                to="/"
                onClick={() => setMobileMenuOpen(false)}
                className={`px-4 py-2.5 rounded-2xl text-sm font-bold transition-all ${
                  isHomePage
                    ? "bg-blue-50 text-blue-600"
                    : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                {t("nav.home")}
              </Link>
              <Link
                to="/fleet"
                onClick={() => setMobileMenuOpen(false)}
                className="px-4 py-2.5 rounded-2xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all"
              >
                {t("nav.browseCars")}
              </Link>
              <Link
                to="/#fleet-operators"
                onClick={() => setMobileMenuOpen(false)}
                className="px-4 py-2.5 rounded-2xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all"
              >
                {i18n.language === "ar" ? "عن الشركة" : t("nav.fleetPartners")}
              </Link>
              <Link
                to="/#how-it-works"
                onClick={() => setMobileMenuOpen(false)}
                className="px-4 py-2.5 rounded-2xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all"
              >
                {i18n.language === "ar" ? "الشروط والأحكام" : t("nav.howItWorks")}
              </Link>
              <Link
                to="/#locations"
                onClick={() => setMobileMenuOpen(false)}
                className="px-4 py-2.5 rounded-2xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all"
              >
                {i18n.language === "ar" ? "المواقع والمطارات" : t("nav.locations")}
              </Link>
              <Link
                to="/#contact"
                onClick={() => setMobileMenuOpen(false)}
                className="px-4 py-2.5 rounded-2xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all"
              >
                {t("nav.contact")}
              </Link>
              {isAuthenticated && (
                <Link
                  to="/my-bookings"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-4 py-2.5 rounded-2xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all"
                >
                  {t("nav.myBookings")}
                </Link>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
              <Link
                to="/partner/apply"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md flex items-center justify-center gap-2"
              >
                <Zap className="w-4 h-4 fill-amber-300 text-amber-300" />
                <span>{t("nav.listFleet")}</span>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default NavBar;