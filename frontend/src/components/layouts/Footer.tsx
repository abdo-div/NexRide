import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { Globe, Share2, MessageSquare, Phone } from "lucide-react";
import type { FooterSection } from "../../types/footer";
import {
  LANGUAGES,
  changeLanguage,
  type LanguageKey,
} from "../../i18n";
import { useAuth } from "../../context/useAuth";
import { subscribeToNewsletter } from "../../lib/newsletterApi";

const CONTACT_NUMBER = "+218910008820";
const CONTACT_DISPLAY = "+218 91 000 8820";

export const Footer: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [email, setEmail] = useState("");
  const [subscriptionState, setSubscriptionState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const { user } = useAuth();
  const isCompany = user?.role?.trim() === "company";
  const lang = (i18n.language in LANGUAGES ? i18n.language : "ar") as LanguageKey;
  const contactUrl = `https://wa.me/${CONTACT_NUMBER.replace(/\D/g, "")}`;
  const [shareState, setShareState] = useState<"idle" | "shared" | "copied" | "error">("idle");
  const shareTimer = useRef<number | undefined>(undefined);

  useEffect(() => () => {
    if (shareTimer.current) window.clearTimeout(shareTimer.current);
  }, []);

  const showShareState = (state: Exclude<typeof shareState, "idle">) => {
    if (shareTimer.current) window.clearTimeout(shareTimer.current);
    setShareState(state);
    shareTimer.current = window.setTimeout(() => setShareState("idle"), 2500);
  };

  const handleShare = async () => {
    const shareData = { title: "NexRide", url: window.location.href };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        showShareState("shared");
      } else {
        await navigator.clipboard.writeText(shareData.url);
        showShareState("copied");
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      showShareState("error");
    }
  };

  const EXPLORE_LINKS: FooterSection = {
    title: t("footer.explore"),
    links: [
      { label: t("footer.exploreLinks.fleetInventory"), href: "/fleet" },
      { label: t("footer.exploreLinks.libyanLocations"), href: "/#locations" },
    ],
  };

  const PARTNER_LINKS: FooterSection = {
    title: t("footer.forPartners"),
    links: [
      ...(!isCompany
        ? [{ label: t("footer.partnerLinks.becomePartner"), href: "/partner/apply" }]
        : []),
      { label: t("footer.partnerLinks.partnerPortal"), href: "/login" },
    ],
  };

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || subscriptionState === "loading") return;
    setSubscriptionState("loading");
    try {
      await subscribeToNewsletter(email, lang);
      setEmail("");
      setSubscriptionState("success");
    } catch {
      setSubscriptionState("error");
    }
  };

  return (
    <footer id="contact" className="w-full bg-[#020617] text-white">
      {/* Main Navigation & Info Footer */}
      <section className="pt-16 pb-12 px-6 lg:px-12 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 pb-12 border-b border-slate-800/80">
          {/* Brand Info */}
          <div className="lg:col-span-4">
            <div className="flex items-center gap-2 mb-4">
              <span className="font-black text-xl tracking-wider text-white">
                <span className="text-blue-500">NR</span> NEXRIDE
              </span>
              <span className="px-1.5 py-0.5 rounded bg-blue-950 border border-blue-800 text-[10px] font-bold text-blue-400 font-mono">
                LY
              </span>
            </div>

            <p className="text-xs text-slate-400 font-medium leading-relaxed max-w-xs mb-6">
              {t("footer.brandDesc")}
            </p>

            <div className="flex items-center gap-2">
              <Link
                to="/"
                aria-label={lang === "ar" ? "الصفحة الرئيسية" : "NexRide home"}
                title={lang === "ar" ? "الصفحة الرئيسية" : "NexRide home"}
                className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
              >
                <Globe className="w-3.5 h-3.5" />
              </Link>
              <button
                type="button"
                onClick={() => void handleShare()}
                aria-label={t("footer.share")}
                title={t("footer.share")}
                className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
              >
                <Share2 className="w-3.5 h-3.5" />
              </button>
              <a
                href={contactUrl}
                target="_blank"
                rel="noreferrer"
                aria-label={lang === "ar" ? "تواصل عبر واتساب" : "Contact NexRide on WhatsApp"}
                title={lang === "ar" ? "تواصل عبر واتساب" : "Contact us on WhatsApp"}
                className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
              >
                <MessageSquare className="w-3.5 h-3.5" />
              </a>
            </div>
            <p className="sr-only" role="status" aria-live="polite">
              {shareState === "idle" ? "" : t(`footer.shareStatus.${shareState}`)}
            </p>
          </div>

          {/* Explore Links */}
          <div className="lg:col-span-2">
            <h4 className="text-xs font-black tracking-wider text-slate-200 uppercase mb-4">
              {EXPLORE_LINKS.title}
            </h4>
            <ul className="space-y-2.5">
              {EXPLORE_LINKS.links.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-xs text-slate-400 hover:text-white font-medium transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Partners Links */}
          <div className="lg:col-span-2">
            <h4 className="text-xs font-black tracking-wider text-slate-200 uppercase mb-4">
              {PARTNER_LINKS.title}
            </h4>
            <ul className="space-y-2.5">
              {PARTNER_LINKS.links.map((link) => (
                <li key={link.label}>
                  {link.href.startsWith("/") ? (
                    <Link
                      to={link.href}
                      className="text-xs text-slate-400 hover:text-white font-medium transition-colors"
                    >
                      {link.label}
                    </Link>
                  ) : (
                    <a
                      href={link.href}
                      className="text-xs text-slate-400 hover:text-white font-medium transition-colors"
                    >
                      {link.label}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* VIP Concierge & Newsletter Box */}
          <div className="lg:col-span-4">
            <h4 className="text-xs font-black tracking-wider text-slate-200 uppercase mb-2">
              {t("footer.vipNewsletter")}
            </h4>
            <p className="text-[11px] text-slate-400 font-medium mb-4">
              {t("footer.vipDesc")}
            </p>

            <form
              onSubmit={handleSubscribe}
              className="flex items-center gap-2 mb-5"
            >
              <label htmlFor="footer-newsletter-email" className="sr-only">
                {t("footer.subscribeEmailLabel")}
              </label>
              <input
                id="footer-newsletter-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("footer.subscribePlaceholder")}
                required
                autoComplete="email"
                disabled={subscriptionState === "loading"}
                aria-describedby="newsletter-status"
                className="w-full bg-[#0b1220] border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-600 transition-colors"
              />
              <button
                type="submit"
                disabled={subscriptionState === "loading"}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shrink-0 transition-colors disabled:cursor-wait disabled:opacity-60"
              >
                {subscriptionState === "loading" ? t("footer.subscribing") : t("footer.subscribe")}
              </button>
            </form>
            <p
              id="newsletter-status"
              aria-live="polite"
              className={`-mt-2 mb-4 min-h-4 text-[11px] font-semibold ${
                subscriptionState === "error" ? "text-rose-400" : "text-emerald-400"
              }`}
            >
              {subscriptionState === "success"
                ? t("footer.subscribeSuccess")
                : subscriptionState === "error"
                  ? t("footer.subscribeError")
                  : ""}
            </p>

            {/* Emergency Hotline Box */}
            <a
              href={`tel:${CONTACT_NUMBER}`}
              aria-label={`${t("footer.callSupport")} ${CONTACT_DISPLAY}`}
              className="flex items-center justify-between rounded-xl border border-slate-800/80 bg-[#0b1220] p-3 transition hover:border-blue-700/70 hover:bg-[#101a2c] focus-visible:outline-blue-400"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-950/80 border border-blue-800/50 flex items-center justify-center text-blue-400">
                  <Phone className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block">
                    {t("footer.emergencyLine")}
                  </span>
                  <span className="text-xs font-black text-white font-mono">
                    <bdi>{CONTACT_DISPLAY}</bdi>
                  </span>
                </div>
              </div>

              <span className="px-2 py-0.5 rounded bg-emerald-950 border border-emerald-800 text-[10px] font-extrabold text-emerald-400 flex items-center gap-1 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {t("footer.active")}
              </span>
            </a>
          </div>
        </div>

        {/* 2. Bottom Bar */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-medium text-slate-500">
          <div className="flex items-center gap-2">
            <span>{t("footer.rights")}</span>
            <span>•</span>
            <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              {t("footer.systemsOperational")}
            </span>
          </div>

          <nav
            aria-label={t("footer.legal.label")}
            className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[11px] font-semibold text-slate-400"
          >
            <Link to="/terms" className="transition-colors hover:text-white">
              {t("footer.legal.terms")}
            </Link>
            <Link to="/privacy" className="transition-colors hover:text-white">
              {t("footer.legal.privacy")}
            </Link>
            <Link to="/cancellation-policy" className="transition-colors hover:text-white">
              {t("footer.legal.cancellation")}
            </Link>
          </nav>

          <div className="flex items-center gap-3 text-slate-400 font-semibold text-[11px]">
            {(["en", "ar"] as const).map((code, idx) => (
              <React.Fragment key={code}>
                {idx > 0 && <span>|</span>}
                <button
                  type="button"
                  onClick={() => changeLanguage(code)}
                  className={`cursor-pointer transition-colors ${
                    lang === code ? "text-emerald-400" : "hover:text-white"
                  }`}
                >
                  {LANGUAGES[code].label}
                </button>
              </React.Fragment>
            ))}
            <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300 font-mono">
              {t("footer.currency")}
            </span>
          </div>
        </div>
      </section>
    </footer>
  );
};
