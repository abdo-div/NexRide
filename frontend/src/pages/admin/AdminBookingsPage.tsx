import React, { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import { CalendarDays, Download, RefreshCw, Search } from "lucide-react";
import { useAdminData } from "../../hooks/useAdminData";
import { filterByHub, bookingsCsv } from "../../lib/adminMetrics";
import {
  referenceCodeFrom,
  saveBlobAsFile,
  vehicleTitle,
} from "../../lib/bookingView";
import { useAdminHub } from "../../context/adminHub";
import { AdminBookingsTable } from "../../components/admin/AdminBookingsTable";
import type { BookingDto } from "../../types/booking";

const PAGE_SIZE = 8;

export const AdminBookingsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { data, loading, error, reload } = useAdminData();
  const { hub } = useAdminHub();
  const [searchParams, setSearchParams] = useSearchParams();

  const search = searchParams.get("q") ?? "";
  const [status, setStatus] = useState("ALL");
  const [company, setCompany] = useState("ALL");
  const [page, setPage] = useState(1);

  const setSearch = (value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set("q", value);
    else next.delete("q");
    setSearchParams(next, { replace: true });
  };

  const filtered = useMemo(() => {
    const base = filterByHub(data, hub).bookings;
    const needle = search.trim().toLocaleLowerCase(i18n.language);
    return base
      .filter((b) => status === "ALL" || b.bookingStatus === status)
      .filter((b) => company === "ALL" || providerName(b) === company)
      .filter((b) => {
        if (!needle) return true;
        const haystack = [
          referenceCodeFrom(b._id),
          vehicleTitle(b),
          b.pickupLocation,
          customerName(b),
          providerName(b),
        ]
          .join(" ")
          .toLocaleLowerCase(i18n.language);
        return haystack.includes(needle);
      })
      .slice()
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  }, [data, hub, search, status, company, i18n.language]);

  const statusOptions = useMemo(() => {
    const seen = new Set<string>();
    data.bookings.forEach((b) => seen.add(b.bookingStatus));
    return ["ALL", ...Array.from(seen)].sort((a, b) =>
      a.localeCompare(b, i18n.language),
    );
  }, [data.bookings, i18n.language]);

  const companyOptions = useMemo(() => {
    const seen = new Set<string>();
    data.bookings.forEach((b) => {
      const name = providerName(b);
      if (name) seen.add(name);
    });
    data.companies.forEach((c) => seen.add(c.name));
    return ["ALL", ...Array.from(seen)].sort(
      (a, b) => a.localeCompare(b, i18n.language),
    );
  }, [data.bookings, data.companies, i18n.language]);

  const resetPage = () => setPage(1);

  const handleView = (booking: BookingDto) => {
    navigate(`/admin/bookings/${booking._id}`);
  };

  const handleExport = () => {
    if (filtered.length === 0) return;
    saveBlobAsFile(
      new Blob([bookingsCsv(filtered)], { type: "text/csv;charset=utf-8" }),
      `nexride-admin-bookings-${new Date().toISOString().slice(0, 10)}.csv`,
    );
  };

  return (
    <div className="mx-auto w-full max-w-[1440px] px-8 py-8">
      <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-2 text-xs">
            <span className="font-bold uppercase tracking-wider text-[#2563EB]">
              {t("admin.bookings.command")}
            </span>
            <span className="text-[#C3C6D7]">•</span>
            <span className="uppercase tracking-wider text-[#565E74]">
              {t("admin.bookings.grid")}
            </span>
          </div>
          <h1 className="text-[28px] font-extrabold tracking-tight text-[#0B1C30]">
            {t("admin.bookings.title")}
          </h1>
          <p className="mt-0.5 max-w-2xl text-sm text-[#565E74]">
            {t("admin.bookings.subtitle")}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full bg-[#EFF4FF] px-3 py-1 text-xs font-bold text-[#2563EB]">
            {t("admin.bookings.count", { count: filtered.length })}
          </span>
          <button
            type="button"
            onClick={reload}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-[#EFF4FF] px-3.5 py-2 text-sm font-semibold text-[#0B1C30] shadow-sm transition-all hover:bg-[#E5EEFF] disabled:opacity-60 cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 text-[#2563EB] ${loading ? "animate-spin" : ""}`} />
            {t("admin.bookings.refresh")}
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={filtered.length === 0}
            className="inline-flex items-center gap-2 rounded-xl bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(37,99,235,0.28)] transition-all hover:bg-[#1D4ED8] disabled:opacity-50 cursor-pointer"
          >
            <Download className="h-4 w-4" />
            {t("admin.bookings.export")}
          </button>
        </div>
      </div>

      {!loading && !error && (
        <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.05)] lg:flex-row lg:items-center">
          <div className="flex flex-1 items-center gap-2 rounded-xl bg-[#EFF4FF] px-3 py-2">
            <Search className="h-[18px] w-[18px] shrink-0 text-[#565E74]" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                resetPage();
              }}
              placeholder={t("admin.bookings.searchPlaceholder")}
              className="w-full border-0 bg-transparent p-0 text-sm text-[#0B1C30] outline-none placeholder:text-[#565E74]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                resetPage();
              }}
              aria-label={t("admin.bookings.statusFilter")}
              className="cursor-pointer rounded-xl bg-[#EFF4FF] px-3 py-2 text-sm font-semibold text-[#0B1C30] outline-none"
            >
              <option value="ALL">{t("admin.bookings.allStatuses")}</option>
              {statusOptions
                .filter((s) => s !== "ALL")
                .map((s) => (
                  <option key={s} value={s}>
                    {t(`admin.status.${s}`)}
                  </option>
                ))}
            </select>

            <select
              value={company}
              onChange={(e) => {
                setCompany(e.target.value);
                resetPage();
              }}
              aria-label={t("admin.bookings.companyFilter")}
              className="max-w-[220px] cursor-pointer rounded-xl bg-[#EFF4FF] px-3 py-2 text-sm font-semibold text-[#0B1C30] outline-none"
            >
              <option value="ALL">{t("admin.bookings.allCompanies")}</option>
              {companyOptions
                .filter((c) => c !== "ALL")
                .map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
            </select>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          <div className="h-16 animate-pulse rounded-2xl border border-slate-200 bg-white" />
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-2xl border border-slate-200 bg-white"
            />
          ))}
        </div>
      ) : error ? (
        <div className="flex h-96 flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white text-center">
          <CalendarDays className="h-10 w-10 text-[#94A3B8]" />
          <p className="mt-4 max-w-md text-sm text-[#64748B]">{t("admin.bookings.loadError")}</p>
          <button
            type="button"
            onClick={reload}
            className="mt-4 rounded-lg bg-[#2563EB] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#1D4ED8] cursor-pointer"
          >
            {t("admin.bookings.retry")}
          </button>
        </div>
      ) : (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.05)]">
          <AdminBookingsTable
            bookings={filtered}
            page={page}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
            onView={handleView}
            emptyLabel={t("admin.bookings.empty")}
          />
        </section>
      )}
    </div>
  );
};

// Extracted so the filter memos stay tidy and reusable.
const customerName = (booking: BookingDto): string =>
  typeof booking.customerId === "object" ? booking.customerId.name ?? "" : "";

const providerName = (booking: BookingDto): string =>
  typeof booking.companyId === "object" ? booking.companyId.name ?? "" : "";

export default AdminBookingsPage;