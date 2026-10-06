import React from "react";
import { useTranslation } from "react-i18next";
import {
  Bell,
  Building2,
  CalendarClock,
  FileText,
  Landmark,
  MapPinned,
  MessagesSquare,
  Scale,
  ShieldCheck,
} from "lucide-react";

interface CompanySettingsNavItem {
  id: string;
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: CompanySettingsNavItem[] = [
  { id: "settings-profile", labelKey: "company.settings.nav.profile", icon: Building2 },
  { id: "settings-legal", labelKey: "company.settings.nav.legal", icon: Scale },
  { id: "settings-locations", labelKey: "company.settings.nav.locations", icon: MapPinned },
  { id: "settings-policies", labelKey: "company.settings.nav.policies", icon: FileText },
  { id: "settings-booking", labelKey: "company.settings.nav.booking", icon: CalendarClock },
  { id: "settings-notifications", labelKey: "company.settings.nav.notifications", icon: Bell },
  { id: "settings-payout", labelKey: "company.settings.nav.payout", icon: Landmark },
  { id: "settings-security", labelKey: "company.settings.nav.security", icon: ShieldCheck },
];

interface CompanySettingsNavProps {
  companyName: string;
  subdomain: string;
  city: string;
  verified: boolean;
  active: string;
  onSelect: (id: string) => void;
  onComingSoon: () => void;
}

/**
 * Sticky left rail for Settings: the 8 section anchors, the partner-account
 * overview widget (real profile data) and the concierge card (unmodelled →
 * coming soon). Active highlight is click-driven via anchor scroll.
 */
export const CompanySettingsNav: React.FC<CompanySettingsNavProps> = ({
  companyName,
  subdomain,
  city,
  verified,
  active,
  onSelect,
  onComingSoon,
}) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-4">
      <nav
        aria-label={t("company.settings.title")}
        className="flex flex-col gap-1 rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.05)]"
      >
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all cursor-pointer ${
                isActive
                  ? "bg-[#2563EB] text-white shadow-[0_4px_12px_rgba(37,99,235,0.2)]"
                  : "text-[#434655] hover:bg-[#E5EEFF] hover:text-[#0B1C30]"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="truncate">{t(item.labelKey)}</span>
            </button>
          );
        })}
      </nav>

      {/* Partner account overview — real profile data. */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_4px_20px_-2px_rgba(15,23,42,0.05)]">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <span className="text-xs font-extrabold uppercase tracking-wide text-[#9AA4B5]">
            {t("company.settings.nav.overview")}
          </span>
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
              verified ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
            }`}
          >
            {verified
              ? t("company.settings.readiness.verified")
              : t("company.settings.readiness.pending")}
          </span>
        </div>
        <div className="flex items-center gap-3 px-5 py-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#2563EB] text-base font-extrabold text-white">
            {companyName.charAt(0).toUpperCase() || "N"}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-[#0B1C30]">{companyName}</p>
            <p className="truncate text-xs font-semibold text-[#565E74]">
              {city ? `${city} · ` : ""}@
              {subdomain || "partner"}
            </p>
          </div>
        </div>
      </div>

      {/* Partner concierge — concierge messaging is unmodelled. */}
      <div className="rounded-2xl border border-dashed border-[#C3C6D7] bg-[#F8FAFC] p-5">
        <div className="flex items-center gap-2">
          <MessagesSquare className="h-4 w-4 text-[#2563EB]" aria-hidden="true" />
          <span className="text-sm font-extrabold text-[#0B1C30]">
            {t("company.settings.nav.concierge")}
          </span>
        </div>
        <p className="mt-1.5 text-xs font-medium leading-relaxed text-[#64748B]">
          {t("company.settings.nav.conciergeDesc")}
        </p>
        <button
          type="button"
          onClick={onComingSoon}
          className="mt-3 w-full rounded-xl bg-[#EFF4FF] px-3 py-2 text-xs font-bold text-[#2563EB] transition-colors hover:bg-[#E5EEFF] cursor-pointer"
        >
          {t("company.settings.nav.chat")}
        </button>
      </div>
    </div>
  );
};

export default CompanySettingsNav;