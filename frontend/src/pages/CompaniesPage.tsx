import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  LayoutGrid,
  List,
  AlertTriangle,
  SearchX,
  RefreshCcw,
} from "lucide-react";
import { useCompaniesDirectory } from "../hooks/useCompaniesDirectory";
import {
  CompanyDirectoryCard,
  CompanyDirectoryRow,
} from "../components/companies/CompanyDirectoryCard";
import type { CompanyDirectoryEntry } from "../types/companyDirectory";

const PAGE_SIZE = 6;
const SKELETON_KEYS = ["a", "b", "c", "d", "e", "f"];

const DirectorySkeleton: React.FC = () => (
  <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-5 flex flex-col gap-4 animate-pulse">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-slate-200" />
        <div className="flex flex-col gap-2">
          <div className="w-32 h-4 rounded bg-slate-200" />
          <div className="w-20 h-3 rounded bg-slate-100" />
        </div>
      </div>
      <div className="w-20 h-5 rounded-full bg-slate-200" />
    </div>
    <div className="w-full h-3 rounded bg-slate-100" />
    <div className="w-full h-3 rounded bg-slate-100" />
    <div className="w-full h-9 rounded-lg bg-slate-100" />
    <div className="space-y-2">
      <div className="w-full h-12 rounded-xl bg-slate-100" />
      <div className="w-full h-12 rounded-xl bg-slate-100" />
    </div>
    <div className="w-full h-10 rounded-xl bg-slate-200 mt-1" />
  </div>
);

const pageWindow = (current: number, total: number): (number | "...")[] => {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "...")[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) pages.push("...");
  for (let p = start; p <= end; p += 1) pages.push(p);
  if (end < total - 1) pages.push("...");
  pages.push(total);
  return pages;
};

export const CompaniesPage: React.FC = () => {
  const { t } = useTranslation();
  const { entries, totalVerified, cities, loading, error, reload } =
    useCompaniesDirectory();

  const [search, setSearch] = useState("");
  const [city, setCity] = useState("all");
  const [sort, setSort] = useState("recommended");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [page, setPage] = useState(1);

  const filtered = useMemo<CompanyDirectoryEntry[]>(() => {
    const term = search.trim().toLowerCase();
    const list = entries.filter((entry) => {
      const matchesCity = city === "all" || entry.city === city;
      const matchesTerm =
        term.length === 0 ||
        entry.name.toLowerCase().includes(term) ||
        entry.city.toLowerCase().includes(term) ||
        entry.address.toLowerCase().includes(term) ||
        entry.description.toLowerCase().includes(term);
      return matchesCity && matchesTerm;
    });

    if (sort === "rating") {
      return [...list].sort(
        (a, b) => b.rating - a.rating || b.reviewsCount - a.reviewsCount,
      );
    }
    if (sort === "vehicles") {
      return [...list].sort(
        (a, b) => b.fleetSize - a.fleetSize || b.rating - a.rating,
      );
    }
    if (sort === "name") {
      return [...list].sort((a, b) => a.name.localeCompare(b.name));
    }
    return [...list].sort(
      (a, b) =>
        b.rating - a.rating ||
        b.reviewsCount - a.reviewsCount ||
        b.fleetSize - a.fleetSize,
    );
  }, [entries, search, city, sort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageItems = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );
  const from = filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const to = Math.min(safePage * PAGE_SIZE, filtered.length);

  const resetFilters = () => {
    setSearch("");
    setCity("all");
    setSort("recommended");
    setPage(1);
  };

  const hasFilters = search.trim() !== "" || city !== "all";
  const showError = error !== null && !loading;

  return (
    <div className="bg-[#F8FAFC] min-h-screen">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-10 flex flex-col gap-6">
        {/* Header */}
        <section className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-6 lg:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <nav
              aria-label={t("companies.breadcrumbCurrent")}
              className="flex items-center gap-2 text-xs font-semibold text-slate-400"
            >
              <span>{t("companies.breadcrumbHome")}</span>
              <span className="text-slate-300">/</span>
              <span className="text-[#2563EB] font-bold">
                {t("companies.breadcrumbCurrent")}
              </span>
            </nav>
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-[#2563EB] text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-[#2563EB] animate-pulse" />
              {t("companies.metaCount", { count: totalVerified })}
            </span>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5">
            <div className="flex flex-col gap-2 max-w-3xl">
              <span className="text-[11px] font-bold text-[#2563EB] uppercase tracking-widest">
                {t("companies.eyebrow")}
              </span>
              <h1 className="text-3xl lg:text-4xl font-black text-slate-900 tracking-tight">
                {t("companies.title")}
              </h1>
              <p className="text-[15px] text-slate-500 leading-relaxed">
                {t("companies.subtitle")}
              </p>
            </div>
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 shrink-0">
              <div className="w-10 h-10 rounded-xl bg-[#2563EB] text-white flex items-center justify-center shrink-0 shadow-sm">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-slate-900">
                  {t("companies.trustBadgeTitle")}
                </span>
                <span className="text-[11px] font-medium text-slate-500">
                  {t("companies.trustBadgeDesc")}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Toolbar */}
        <section className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-4">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder={t("companies.searchPlaceholder")}
                className="w-full pl-10 pr-3 py-2.5 bg-slate-50 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/40 transition-all"
              />
            </div>

            {/* City filter */}
            <div className="relative min-w-[190px] flex-1 sm:flex-initial">
              <select
                value={city}
                onChange={(e) => {
                  setCity(e.target.value);
                  setPage(1);
                }}
                className="w-full appearance-none bg-slate-50 px-3.5 py-2.5 pr-9 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/40 cursor-pointer transition-all"
              >
                <option value="all">{t("companies.allCities")}</option>
                {cities.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs rtl:left-3 rtl:right-auto">
                ▾
              </span>
            </div>

            {/* Sort */}
            <div className="relative min-w-[200px] flex-1 sm:flex-initial">
              <select
                value={sort}
                onChange={(e) => {
                  setSort(e.target.value);
                  setPage(1);
                }}
                className="w-full appearance-none bg-slate-50 px-3.5 py-2.5 pr-9 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/40 cursor-pointer transition-all"
              >
                <option value="recommended">
                  {t("companies.sortLabel")} {t("companies.sortRecommended")}
                </option>
                <option value="rating">{t("companies.sortRating")}</option>
                <option value="vehicles">{t("companies.sortVehicles")}</option>
                <option value="name">{t("companies.sortName")}</option>
              </select>
              <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs rtl:left-3 rtl:right-auto">
                ▾
              </span>
            </div>

            {/* View switcher */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl shrink-0 self-start lg:self-center">
              <button
                type="button"
                onClick={() => {
                  setView("grid");
                  setPage(1);
                }}
                title={t("companies.gridView")}
                className={`p-2 rounded-lg transition-all ${
                  view === "grid"
                    ? "bg-white text-[#2563EB] shadow-sm"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                <LayoutGrid className="w-[18px] h-[18px]" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setView("list");
                  setPage(1);
                }}
                title={t("companies.listView")}
                className={`p-2 rounded-lg transition-all ${
                  view === "list"
                    ? "bg-white text-[#2563EB] shadow-sm"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                <List className="w-[18px] h-[18px]" />
              </button>
            </div>
          </div>

          <p className="hidden md:block mt-3 text-[11px] font-medium text-slate-400">
            {t("companies.liveSync")}
          </p>
        </section>

        {/* Loading skeleton */}
        {loading && (
          <div
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5"
            aria-busy="true"
            aria-live="polite"
          >
            {SKELETON_KEYS.map((key) => (
              <DirectorySkeleton key={key} />
            ))}
          </div>
        )}

        {/* Error */}
        {showError && (
          <div className="bg-white rounded-2xl border border-red-200 shadow-sm px-6 py-16 text-center">
            <div className="mx-auto w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6 text-red-500" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              {t("companies.errorTitle")}
            </h3>
            <p className="mt-1 text-sm text-slate-500 max-w-md mx-auto">
              {error || t("companies.errorDesc")}
            </p>
            <button
              type="button"
              onClick={reload}
              className="mt-5 inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-bold transition-colors"
            >
              <RefreshCcw className="w-3.5 h-3.5" />
              {t("companies.retry")}
            </button>
          </div>
        )}

        {/* No data at all */}
        {!loading && !error && entries.length === 0 && (
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm px-6 py-16 text-center">
            <div className="mx-auto w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mb-4">
              <SearchX className="w-6 h-6 text-slate-400" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              {t("companies.emptyTitle")}
            </h3>
            <p className="mt-1 text-sm text-slate-500 max-w-md mx-auto">
              {t("companies.emptyDesc")}
            </p>
          </div>
        )}

        {/* No matches for current filters */}
        {!loading &&
          !error &&
          entries.length > 0 &&
          filtered.length === 0 && (
            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm px-6 py-16 text-center">
              <div className="mx-auto w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center mb-4">
                <SearchX className="w-6 h-6 text-[#2563EB]" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                {t("companies.emptyTitle")}
              </h3>
              <p className="mt-1 text-sm text-slate-500 max-w-md mx-auto">
                {t("companies.emptyDesc")}
              </p>
              <button
                type="button"
                onClick={resetFilters}
                className="mt-5 px-5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-bold transition-colors"
              >
                {t("companies.resetFilters")}
              </button>
            </div>
          )}

        {/* Results */}
        {!loading && !error && filtered.length > 0 && (
          <>
            {view === "grid" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {pageItems.map((company) => (
                  <CompanyDirectoryCard key={company.id} company={company} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {pageItems.map((company) => (
                  <CompanyDirectoryRow key={company.id} company={company} />
                ))}
              </div>
            )}

            {hasFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="self-center text-xs font-semibold text-[#2563EB] hover:underline px-2"
              >
                {t("companies.resetFilters")}
              </button>
            )}

            {/* Pagination */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-4">
              <span className="text-[13px] text-slate-500">
                {t("companies.showingSummary", {
                  from,
                  to,
                  total: filtered.length,
                })}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={safePage === 1}
                  onClick={() => setPage(safePage - 1)}
                  className="w-9 h-9 rounded-xl bg-white border border-[#E2E8F0] hover:bg-slate-50 text-slate-600 flex items-center justify-center transition-colors disabled:opacity-40"
                >
                  <ChevronLeft className="w-[18px] h-[18px] rtl:rotate-180" />
                </button>
                {pageWindow(safePage, pageCount).map((p, index) =>
                  p === "..." ? (
                    <span key={`gap-${index}`} className="px-1.5 text-slate-400">
                      …
                    </span>
                  ) : (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPage(p)}
                      className={`w-9 h-9 rounded-xl text-xs font-bold transition-colors ${
                        p === safePage
                          ? "bg-[#2563EB] text-white shadow-sm"
                          : "bg-white border border-[#E2E8F0] hover:bg-slate-50 text-slate-600"
                      }`}
                    >
                      {p}
                    </button>
                  ),
                )}
                <button
                  type="button"
                  disabled={safePage === pageCount}
                  onClick={() => setPage(safePage + 1)}
                  className="w-9 h-9 rounded-xl bg-white border border-[#E2E8F0] hover:bg-slate-50 text-slate-600 flex items-center justify-center transition-colors disabled:opacity-40"
                >
                  <ChevronRight className="w-[18px] h-[18px] rtl:rotate-180" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CompaniesPage;