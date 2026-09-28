import React, { useEffect, useState } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { NavBarLogo } from "./NavBarLogo";
import { NavBarActions } from "./NavBarActions";

export const NavBar: React.FC = () => {
  const [scrolled, setScrolled] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 w-full transition-colors duration-300 border-b ${
        scrolled
          ? "bg-white border-slate-200 shadow-sm"
          : "bg-transparent border-transparent"
      }`}
    >
      <div className="w-full px-6 lg:px-12 h-20 flex items-center justify-between gap-6">
        <NavBarLogo onDark={!scrolled} />

        <nav
          className={`hidden lg:flex items-center gap-8 text-sm font-semibold transition-colors ${
            scrolled
              ? "text-slate-700"
              : "text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.35)]"
          }`}
        >
          <Link
            to="/"
            className={`font-bold transition-colors ${
              scrolled
                ? "text-blue-600 hover:text-blue-700"
                : "text-blue-400 hover:text-blue-300"
            }`}
          >
            {t("nav.home")}
          </Link>
          <a
            href="#featured-fleet"
            className="hover:text-blue-600 transition-colors"
          >
            {t("nav.browseCars")}
          </a>
          <a
            href="#how-it-works"
            className="hover:text-blue-600 transition-colors"
          >
            {t("nav.howItWorks")}
          </a>
          <a
            href="#fleet-operators"
            className="hover:text-blue-600 transition-colors"
          >
            {t("nav.fleetPartners")}
          </a>
          <a
            href="#locations"
            className="hover:text-blue-600 transition-colors"
          >
            {t("nav.locations")}
          </a>
          <a href="#contact" className="hover:text-blue-600 transition-colors">
            {t("nav.contact")}
          </a>
        </nav>

        <NavBarActions onDark={!scrolled} />
      </div>
    </header>
  );
};

export default NavBar;