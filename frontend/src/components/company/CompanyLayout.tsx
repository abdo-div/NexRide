import React, { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import {
  Banknote,
  Bell,
  CalendarDays,
  Car,
  Clock,
  LayoutDashboard,
  LogOut,
  MapPin,
  MessageSquareText,
  Settings,
  ShieldCheck,
  Star,
  Wrench,
} from "lucide-react";
import { useAuth } from "../../context/useAuth";

interface NavEntry {
  path: string;
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
  enabled: boolean;
}

const NAV_ENTRIES: NavEntry[] = [
  { path: "/company", labelKey: "company.layout.navOverview", icon: LayoutDashboard, enabled: true },
  { path: "/company/fleet", labelKey: "company.layout.navFleet", icon: Car, enabled: true },
  { path: "/company/maintenance", labelKey: "company.layout.navMaintenance", icon: Wrench, enabled: true },
  { path: "/company/bookings", labelKey: "company.layout.navBookings", icon: CalendarDays, enabled: true },
  { path: "/company/messages", labelKey: "company.layout.navMessages", icon: MessageSquareText, enabled: false },
  { path: "/company/payouts", labelKey: "company.layout.navPayouts", icon: Banknote, enabled: true },
  { path: "/company/reviews", labelKey: "company.layout.navReviews", icon: Star, enabled: true },
  { path: "/company/settings", labelKey: "company.layout.navSettings", icon: Settings, enabled: true },
];

/**
 * Fleet-operator shell: fixed sidebar + topbar, mirrors the admin layout so the
 * operator area gets the same workspace chrome instead of the consumer navbar.
 * Only the overview, fleet, maintenance, bookings, payouts, reviews and settings
 * entries are live today; the rest are marked as coming soon.
 */
export const CompanyLayout: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [clock, setClock] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setClock(new Date()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  const clockLabel = useMemo(() => {
    const time = new Intl.DateTimeFormat(i18n.language, {
      hour: "2-digit",
      minute: "2-digit",
    }).format(clock);
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? "UTC+2";
    return `${time} (${zone})`;
  }, [clock, i18n.language]);

  const handleLogout = () => {
    void signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 start-0 z-50 flex h-full w-72 select-none flex-col justify-between bg-white shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center gap-3 border-b border-slate-200 bg-[#EFF4FF] px-6">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#2563EB] text-sm font-extrabold text-white">
              Nx
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-base font-bold tracking-tight text-[#0B1C30]">
                NexRide
              </span>
              <span className="mt-0.5 text-[11px] font-bold uppercase tracking-widest text-[#565E74]">
                {t("company.layout.operationsSubtitle")}
              </span>
            </div>
          </div>

          <nav className="mt-4 flex-1 space-y-1 overflow-y-auto px-4 pb-2">
            {NAV_ENTRIES.map((entry) => {
              const Icon = entry.icon;
              const isActive =
                entry.path === "/company"
                  ? location.pathname === "/company"
                  : location.pathname.startsWith(entry.path);
              const className = `flex items-center gap-3 rounded-xl px-4 py-2 text-sm transition-all ${
                isActive
                  ? "bg-[#2563EB] font-semibold text-white shadow-[0_4px_12px_rgba(37,99,235,0.2)]"
                  : entry.enabled
                    ? "font-normal text-[#434655] hover:bg-[#E5EEFF] hover:text-[#0B1C30]"
                    : "cursor-not-allowed text-[#A6ACBE]"
              }`;
              return entry.enabled ? (
                <NavLink
                  key={entry.path}
                  to={entry.path}
                  end={entry.path === "/company"}
                  className={className}
                >
                  <Icon className="h-5 w-5" />
                  <span>{t(entry.labelKey)}</span>
                </NavLink>
              ) : (
                <span
                  key={entry.path}
                  className={className}
                  title={t("company.layout.soon")}
                  aria-disabled="true"
                >
                  <Icon className="h-5 w-5" />
                  <span>{t(entry.labelKey)}</span>
                </span>
              );
            })}
          </nav>

          <div className="border-t border-slate-200 bg-[#EFF4FF] p-4">
            <div className="flex items-center justify-between rounded-xl bg-white p-3 shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
              <div className="flex min-w-0 items-center gap-2">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#2563EB] text-white">
                  <span className="text-sm font-bold">
                    {(user?.name ?? "A").slice(0, 1).toUpperCase()}
                  </span>
                </div>
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-bold leading-tight text-[#0B1C30]">
                    {user?.name ?? "Operator"}
                  </span>
                  <span className="truncate text-[11px] text-[#565E74]">
                    {t("company.layout.partnerRole")}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                title={t("company.layout.logoutTitle")}
                className="shrink-0 rounded-lg p-2 text-[#565E74] transition-colors hover:bg-[#E5EEFF] hover:text-[#BA1A1A] cursor-pointer"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Topbar */}
      <header className="fixed start-72 end-0 top-0 z-40 flex h-16 items-center justify-between border-b border-slate-200 bg-white/85 px-8 shadow-[0_1px_8px_rgba(0,0,0,0.04)] backdrop-blur-xl">
        <div className="flex items-center gap-6">
          <div className="hidden items-center gap-1.5 text-xs font-semibold text-[#0B1C30] xl:inline-flex">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EFF4FF] px-3 py-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              {t("company.layout.certifiedStatus")}
            </span>
          </div>
          <div className="hidden items-center gap-2 rounded-[10px] bg-[#EFF4FF] px-3 py-1 lg:flex">
            <ShieldCheck className="h-4 w-4 text-[#565E74]" />
            <span className="text-xs font-semibold text-[#565E74]">
              {t("company.layout.certifiedBadge")}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden items-center gap-1 rounded-xl bg-[#EFF4FF] px-3 py-1 text-xs text-[#565E74] lg:flex">
            <Clock className="h-4 w-4" />
            <span>{clockLabel}</span>
          </div>

          <button
            type="button"
            disabled
            aria-label={t("company.layout.notifications")}
            title={t("company.layout.soon")}
            className="relative rounded-xl p-2 text-[#A6ACBE] cursor-not-allowed"
          >
            <Bell className="h-[22px] w-[22px]" />
          </button>

          <div
            className="hidden items-center gap-2 rounded-xl bg-[#EFF4FF] px-3 py-1 text-xs sm:flex"
            title={t("company.layout.tripoliHub")}
          >
            <MapPin className="h-4 w-4 text-[#565E74]" />
            <span className="font-semibold text-[#0B1C30]">
              {t("company.layout.tripoliHub")}
            </span>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="w-full bg-[#F8FAFC] pb-12 ps-72 pt-16">
        <Outlet />
      </main>
    </div>
  );
};

export default CompanyLayout;