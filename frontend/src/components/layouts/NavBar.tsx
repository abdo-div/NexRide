import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router";
import { useTranslation } from "react-i18next";
import { Menu, X, Zap } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { NavBarLogo } from "./NavBarLogo";
import { NavBarActions } from "./NavBarActions";
import { useAuth } from "../../context/useAuth";
import { publicWebsiteHref } from "../../lib/publicWebsitePreview";

export const NavBar: React.FC = () => {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();
  const isCustomer = isAuthenticated && user?.role?.trim() === "customer";
  const isCompany = user?.role?.trim() === "company";
  const isAdmin = user?.role?.trim() === "admin";
  const isStaffWebsitePreview =
    (isCompany || isAdmin) &&
    new URLSearchParams(location.search).get("preview") === "website";
  const websiteHref = (href: string) =>
    publicWebsiteHref(href, isStaffWebsitePreview);
  const canApplyAsPartner = !isCompany && !isAdmin;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const firstMobileLinkRef = useRef<HTMLAnchorElement>(null);
  const reduceMotion = useReducedMotion();
  const isHomePage = location.pathname === "/";
  const isFleetPage = location.pathname === "/fleet";
  const isMyBookingsPage = location.pathname === "/my-bookings";
  const onDarkHero = isHomePage && !isScrolled;

  useEffect(() => {
    const updateNav = () => setIsScrolled(window.scrollY > (isHomePage ? 520 : 24));
    updateNav();
    window.addEventListener("scroll", updateNav, { passive: true });
    return () => window.removeEventListener("scroll", updateNav);
  }, [isHomePage]);

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
      className={`absolute left-0 right-0 z-50 flex w-full justify-center pointer-events-none transition-all duration-300 ease-out ${
        isScrolled ? "top-0 px-0" : "top-0 px-4 sm:px-8"
      }`}
    >
      <div
        className={`pointer-events-auto flex w-full items-center justify-between gap-3 px-3 py-3 transition-all duration-300 ease-out sm:px-5 ${
          isScrolled
            ? "max-w-none border-b border-slate-200/80 bg-white/95 shadow-[0_8px_28px_-12px_rgba(15,23,42,0.22)] backdrop-blur-xl"
            : onDarkHero
              ? "max-w-[1440px] border-b border-white/10 bg-transparent text-white"
              : "mt-3 max-w-7xl rounded-2xl border border-slate-200/80 bg-white/95 shadow-[0_10px_35px_-5px_rgba(0,0,0,0.08)] backdrop-blur-xl"
        }`}
      >
        {/* Right side: Logo & Brand Tagline */}
        <NavBarLogo onDark={onDarkHero} to={websiteHref("/")} />

        {/* Center: Navigation Pill Capsule */}
        <nav
          aria-label={t("nav.mainNavigation")}
          className={`hidden items-center gap-1 text-xs font-semibold sm:text-sm xl:flex ${onDarkHero ? "text-white/80" : "rounded-full border border-slate-200/50 bg-slate-100/80 p-1 text-slate-600"}`}
        >
          <Link
            to={websiteHref("/")}
            className={`px-4 py-2 transition-all ${onDarkHero ? "border-b-2 border-white text-white" : "rounded-full"} ${
              isHomePage
                ? onDarkHero ? "font-bold" : "bg-white text-blue-600 font-bold shadow-xs"
                : onDarkHero ? "hover:text-white" : "text-slate-600 hover:text-blue-600 hover:bg-white/60"
            }`}
          >
            {t("nav.home")}
          </Link>

          <Link
            to={websiteHref("/fleet")}
            className={`px-3.5 py-2 transition-all ${onDarkHero ? "hover:text-white" : "rounded-full"} ${
              isFleetPage
                ? "bg-white text-blue-600 font-bold shadow-xs"
                : onDarkHero ? "text-white/80" : "text-slate-600 hover:text-blue-600 hover:bg-white/60"
            }`}
          >
            {t("nav.browseCars")}
          </Link>

          <Link
            to={websiteHref("/#fleet-operators")}
            className={`px-3.5 py-2 transition-all ${onDarkHero ? "hover:text-white" : "rounded-full text-slate-600 hover:bg-white/60 hover:text-blue-600"}`}
          >
            {i18n.language === "ar" ? "عن الشركة" : t("nav.fleetPartners")}
          </Link>

          <Link
            to={websiteHref("/#locations")}
            className={`px-3.5 py-2 transition-all ${onDarkHero ? "hover:text-white" : "rounded-full text-slate-600 hover:bg-white/60 hover:text-blue-600"}`}
          >
            {i18n.language === "ar" ? "المواقع والمطارات" : t("nav.locations")}
          </Link>

          <Link
            to={websiteHref("/#contact")}
            className={`px-3.5 py-2 transition-all ${onDarkHero ? "hover:text-white" : "rounded-full text-slate-600 hover:bg-white/60 hover:text-blue-600"}`}
          >
            {t("nav.contact")}
          </Link>

          {isCustomer && (
            <>
              <Link
                to="/my-bookings"
                className={`px-3.5 py-2 transition-all ${onDarkHero ? "border-b-2 border-transparent" : "rounded-full"} ${
                  isMyBookingsPage
                    ? onDarkHero
                      ? "border-white font-bold text-white"
                      : "bg-white font-bold text-blue-600 shadow-xs"
                    : onDarkHero
                      ? "text-white/80 hover:border-white hover:text-white"
                      : "text-slate-600 hover:bg-white/60 hover:text-blue-600"
                }`}
              >
                {t("nav.myBookings")}
              </Link>
            </>
          )}
        </nav>

        {/* Left side: Actions & CTA (Add your fleet) */}
        <div className="flex items-center gap-2">
          <NavBarActions onDark={onDarkHero} />

          {/* Mobile Menu Hamburger */}
          <button
            ref={menuButtonRef}
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label={t(mobileMenuOpen ? "nav.closeMenu" : "nav.openMenu")}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-navigation"
            className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors xl:hidden ${onDarkHero ? "border border-white/20 bg-white/10 text-white hover:bg-white/20" : "bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-blue-600"}`}
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
                to={websiteHref("/")}
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
                to={websiteHref("/fleet")}
                onClick={() => setMobileMenuOpen(false)}
                className="px-4 py-2.5 rounded-2xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all"
              >
                {t("nav.browseCars")}
              </Link>
              <Link
                to={websiteHref("/#fleet-operators")}
                onClick={() => setMobileMenuOpen(false)}
                className="px-4 py-2.5 rounded-2xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all"
              >
                {i18n.language === "ar" ? "عن الشركة" : t("nav.fleetPartners")}
              </Link>
              <Link
                to={websiteHref("/#locations")}
                onClick={() => setMobileMenuOpen(false)}
                className="px-4 py-2.5 rounded-2xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all"
              >
                {i18n.language === "ar" ? "المواقع والمطارات" : t("nav.locations")}
              </Link>
              <Link
                to={websiteHref("/#contact")}
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
