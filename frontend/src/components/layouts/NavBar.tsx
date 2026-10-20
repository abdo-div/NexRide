import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router";
import { useTranslation } from "react-i18next";
import { Menu, X, Zap } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { NavBarLogo } from "./NavBarLogo";
import { NavBarActions } from "./NavBarActions";
import { useAuth } from "../../context/useAuth";

export const NavBar: React.FC = () => {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();
  const isCustomer = isAuthenticated && user?.role?.trim() === "customer";
  const isCompany = user?.role?.trim() === "company";
  const isAdmin = user?.role?.trim() === "admin";
  const canApplyAsPartner = !isCompany && !isAdmin;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const firstMobileLinkRef = useRef<HTMLAnchorElement>(null);
  const reduceMotion = useReducedMotion();
  const isHomePage = location.pathname === "/";
  const isFleetPage = location.pathname === "/fleet";

  useEffect(() => {
    const updateNav = () => setIsScrolled(window.scrollY > 24);
    updateNav();
    window.addEventListener("scroll", updateNav, { passive: true });
    return () => window.removeEventListener("scroll", updateNav);
  }, []);

  useEffect(() => {
    if (!mobileMenuOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusFrame = window.requestAnimationFrame(() => firstMobileLinkRef.current?.focus());
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileMenuOpen(false);
        window.requestAnimationFrame(() => menuButtonRef.current?.focus());
      }
    };
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", closeOnEscape);
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileMenuOpen]);

  return (
    <header
      className={`fixed left-0 right-0 z-50 flex w-full justify-center pointer-events-none transition-all duration-300 ease-out ${
        isScrolled ? "top-0 px-0" : "top-3 px-3 sm:top-4 sm:px-6"
      }`}
    >
      <div
        className={`pointer-events-auto flex w-full items-center justify-between gap-3 bg-white/95 px-3 py-2 backdrop-blur-md transition-all duration-300 ease-out sm:px-5 sm:py-2.5 ${
          isScrolled
            ? "max-w-none rounded-none border-x-0 border-b border-t-0 border-slate-200/80 shadow-[0_8px_28px_-12px_rgba(15,23,42,0.22)]"
            : "max-w-7xl rounded-full border border-slate-200/80 shadow-[0_10px_35px_-5px_rgba(0,0,0,0.08),0_1px_3px_rgba(0,0,0,0.05)]"
        }`}
      >
        {/* Right side: Logo & Brand Tagline */}
        <NavBarLogo />

        {/* Center: Navigation Pill Capsule */}
        <nav
          aria-label={t("nav.mainNavigation")}
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
            className={`px-3.5 py-1.5 rounded-full transition-all ${
              isFleetPage
                ? "bg-white text-blue-600 font-bold shadow-xs"
                : "text-slate-600 hover:text-blue-600 hover:bg-white/60"
            }`}
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

          {isCustomer && (
            <>
              <Link
                to="/my-bookings"
                className="px-3.5 py-1.5 rounded-full text-slate-600 hover:text-blue-600 hover:bg-white/60 transition-all"
              >
                {t("nav.myBookings")}
              </Link>
            </>
          )}
        </nav>

        {/* Left side: Actions & CTA (Add your fleet) */}
        <div className="flex items-center gap-2">
          <NavBarActions />

          {/* Mobile Menu Hamburger */}
          <button
            ref={menuButtonRef}
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label={t(mobileMenuOpen ? "nav.closeMenu" : "nav.openMenu")}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-navigation"
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
          <>
            <motion.button
              type="button"
              aria-label={t("nav.closeMenu")}
              onClick={() => {
                setMobileMenuOpen(false);
                window.requestAnimationFrame(() => menuButtonRef.current?.focus());
              }}
              initial={reduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={reduceMotion ? undefined : { opacity: 0 }}
              className="pointer-events-auto fixed inset-0 z-40 cursor-default bg-slate-950/20 backdrop-blur-[2px] xl:hidden"
            />
            <motion.nav
              id="mobile-navigation"
              aria-label={t("nav.mobileNavigation")}
              initial={reduceMotion ? false : { opacity: 0, y: -12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduceMotion ? undefined : { opacity: 0, y: -12, scale: 0.98 }}
              transition={{ duration: reduceMotion ? 0 : 0.2 }}
              className="pointer-events-auto absolute top-16 left-3 right-3 sm:left-6 sm:right-6 max-w-lg mx-auto bg-white/95 backdrop-blur-xl border border-slate-200/80 rounded-3xl p-5 shadow-2xl xl:hidden z-50 flex flex-col gap-3"
            >
            <div className="flex flex-col gap-1.5">
              <Link
                ref={firstMobileLinkRef}
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
              {isCustomer && (
                <>
                  <Link to="/my-profile" onClick={() => setMobileMenuOpen(false)} className="px-4 py-2.5 rounded-2xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all">
                    {i18n.language === "ar" ? "ملفي الشخصي" : "My profile"}
                  </Link>
                  <Link to="/my-bookings" onClick={() => setMobileMenuOpen(false)} className="px-4 py-2.5 rounded-2xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all">
                    {t("nav.myBookings")}
                  </Link>
                </>
              )}
            </div>

            {canApplyAsPartner && (
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
            )}
            </motion.nav>
          </>
        )}
      </AnimatePresence>
    </header>
  );
};

export default NavBar;
