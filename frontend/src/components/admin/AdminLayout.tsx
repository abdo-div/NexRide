import React, { useEffect, useMemo, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import {
  Banknote,
  BarChart3,
  Bell,
  Building2,
  CalendarDays,
  Car,
  Clock,
  CreditCard,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  MapPin,
  Search,
  Settings,
  Users,
  Wallet,
  Wrench,
} from "lucide-react";
import { useAuth } from "../../context/useAuth";
import { AdminHubContext } from "../../context/adminHub";
import { adminApi } from "../../lib/adminApi";

interface NavEntry {
  path: string;
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
  enabled: boolean;
}

const NAV_ENTRIES: NavEntry[] = [
  { path: "/admin", labelKey: "admin.layout.navOverview", icon: LayoutDashboard, enabled: true },
  { path: "/admin/bookings", labelKey: "admin.layout.navBookings", icon: CalendarDays, enabled: true },
  { path: "/admin/companies", labelKey: "admin.layout.navCompanies", icon: Building2, enabled: true },
  { path: "/admin/vehicles", labelKey: "admin.layout.navVehicles", icon: Car, enabled: true },
  { path: "/admin/customers", labelKey: "admin.layout.navCustomers", icon: Users, enabled: true },
  { path: "/admin/payments", labelKey: "admin.layout.navPayments", icon: CreditCard, enabled: true },
  { path: "/admin/commissions", labelKey: "admin.layout.navCommissions", icon: Wallet, enabled: true },
  { path: "/admin/maintenance", labelKey: "admin.layout.navMaintenance", icon: Wrench, enabled: true },
  { path: "/admin/reports", labelKey: "admin.layout.navReports", icon: BarChart3, enabled: true },
  { path: "/admin/settings", labelKey: "admin.layout.navSettings", icon: Settings, enabled: true },
];

/**
 * Platform-operations shell: fixed sidebar + topbar. The hub selector in the
 * topbar is a real filter — its options come from the actual fleet cities and
 * the selection is shared with every page through AdminHubContext.
 */
export const AdminLayout: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [hub, setHub] = useState("");
  const [hubOptions, setHubOptions] = useState<string[]>([]);
  const [hubsFailed, setHubsFailed] = useState(false);
  const [search, setSearch] = useState("");
  const [clock, setClock] = useState(() => new Date());

  useEffect(() => {
    const controller = new AbortController();
    adminApi
      // Hub options are a lookup list, so it asks for the widest allowed page.
      .listVehicles({ limit: 100 }, controller.signal)
      .then((res) => {
        const cities = Array.from(
          new Set(res.data.vehicles.map((v) => v.city).filter(Boolean)),
        ).sort((a, b) => a.localeCompare(b, i18n.language));
        setHubOptions(cities);
      })
      .catch(() => {
        if (!controller.signal.aborted) setHubsFailed(true);
      });
    return () => controller.abort();
  }, [i18n.language]);

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

  const onSearchSubmit = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return;
    const q = search.trim();
    navigate(q ? `/admin/bookings?q=${encodeURIComponent(q)}` : "/admin/bookings");
    setSearch("");
  };

  const currentHubLabel =
    hub || (hubOptions.length > 0 ? t("admin.layout.allHubs") : t("admin.layout.dispatch"));

  const handleLogout = () => {
    void signOut();
    navigate("/");
  };

  return (
    <AdminHubContext.Provider value={{ hub, setHub }}>
      <div className="min-h-screen bg-[#F8FAFC]">
        {/* ------------------------------------------------------------------ */}
        {/* Sidebar */}
        {/* ------------------------------------------------------------------ */}
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
                  {t("admin.layout.hubSubtitle")}
                </span>
              </div>
            </div>

            <div className="px-4 py-2">
              <div className="flex items-center justify-between rounded-xl bg-[#EFF4FF] px-4 py-2">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                  <span className="text-xs font-semibold text-[#0B1C30]">
                    {currentHubLabel} {t("admin.layout.liveSuffix")}
                  </span>
                </div>
                <span className="text-xs font-bold text-[#2563EB]">UTC+2</span>
              </div>
            </div>

            <nav className="mt-1 flex-1 space-y-1 overflow-y-auto px-4 pb-2">
              {NAV_ENTRIES.map((entry) => {
                const Icon = entry.icon;
                const isActive =
                  entry.path === "/admin"
                    ? location.pathname === "/admin"
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
                    end={entry.path === "/admin"}
                    className={className}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{t(entry.labelKey)}</span>
                  </NavLink>
                ) : (
                  <span
                    key={entry.path}
                    className={className}
                    title={t("admin.layout.soon")}
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
                      {user?.name ?? "Admin"}
                    </span>
                    <span className="truncate text-[11px] text-[#565E74]">
                      {t("admin.layout.operationsRole")}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  title={t("admin.layout.logoutTitle")}
                  className="shrink-0 rounded-lg p-2 text-[#565E74] transition-colors hover:bg-[#E5EEFF] hover:text-[#BA1A1A] cursor-pointer"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </aside>

        {/* ------------------------------------------------------------------ */}
        {/* Topbar */}
        {/* ------------------------------------------------------------------ */}
        <header className="fixed start-72 end-0 top-0 z-40 flex h-16 items-center justify-between border-b border-slate-200 bg-white/85 px-8 shadow-[0_1px_8px_rgba(0,0,0,0.04)] backdrop-blur-xl">
          <div className="flex items-center gap-6">
            <div className="hidden items-center gap-1.5 text-xs font-semibold text-[#0B1C30] xl:inline-flex">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EFF4FF] px-3 py-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                {currentHubLabel} {t("admin.layout.dispatchSuffix")}
              </span>
            </div>
            <div className="hidden items-center gap-2 rounded-xl bg-[#EFF4FF] px-4 py-1.5 text-sm w-72 xl:flex">
              <Search className="h-[18px] w-[18px] text-[#565E74]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyUp={onSearchSubmit}
                placeholder={t("admin.layout.searchPlaceholder")}
                className="w-full border-0 bg-transparent p-0 text-sm text-[#0B1C30] outline-none placeholder:text-[#565E74] focus:ring-0"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden items-center gap-2 rounded-xl bg-[#EFF4FF] px-3 py-1 md:flex">
              <MapPin className="h-4 w-4 text-[#565E74]" />
              <select
                value={hub}
                onChange={(event) => setHub(event.target.value)}
                aria-label={t("admin.layout.hubLabel")}
                className="cursor-pointer border-0 bg-transparent py-0 pr-6 text-sm font-semibold text-[#0B1C30] outline-none focus:ring-0"
              >
                <option value="">{t("admin.layout.allHubs")}</option>
                {hubOptions.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
              {hubsFailed && <LoaderCircle className="h-4 w-4 animate-spin text-[#BA1A1A]" />}
            </div>

            <div className="flex items-center gap-1.5 rounded-xl bg-[#EFF4FF] px-3 py-1">
              <Banknote className="h-4 w-4 text-[#565E74]" />
              <span className="text-[11px] font-bold uppercase text-[#565E74]">
                {t("admin.layout.currency")}
              </span>
              <span className="text-sm font-bold text-[#2563EB]">LYD</span>
            </div>

            <div className="hidden items-center gap-1 rounded-xl bg-[#EFF4FF] px-3 py-1 text-xs text-[#565E74] lg:flex">
              <Clock className="h-4 w-4" />
              <span>{clockLabel}</span>
            </div>

            <button
              type="button"
              aria-label={t("admin.layout.notifications")}
              className="relative rounded-xl p-2 text-[#434655] transition-colors hover:bg-[#E5EEFF]"
            >
              <Bell className="h-[22px] w-[22px]" />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[#2563EB] ring-2 ring-white" />
            </button>

            <Link
              to="/admin"
              aria-label={t("admin.layout.account")}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-[#2563EB] text-sm font-bold text-white"
            >
              {(user?.name ?? "A").slice(0, 1).toUpperCase()}
            </Link>
          </div>
        </header>

        {/* ------------------------------------------------------------------ */}
        {/* Content */}
        {/* ------------------------------------------------------------------ */}
        <main className="w-full bg-[#F8FAFC] pb-12 ps-72 pt-16">
          <Outlet />
        </main>
      </div>
    </AdminHubContext.Provider>
  );
};

export default AdminLayout;