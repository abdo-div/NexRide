import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import {
  CalendarDays,
  Fuel,
  MapPin,
  Pencil,
  Printer,
  Satellite,
  ShieldCheck,
  Star,
  X,
} from "lucide-react";
import { formatLYD } from "../../lib/bookingView";
import type {
  CompanyFleetCompany,
  CompanyFleetVehicle,
} from "../../types/companyFleet";
import { categoryLabel, fleetStatusTone } from "./companyFleetUi";

interface CompanyFleetInspectDrawerProps {
  open: boolean;
  row: CompanyFleetVehicle | null;
  company: CompanyFleetCompany | null;
  onClose: () => void;
}

const Row: React.FC<{ label: string; value: React.ReactNode }> = ({
  label,
  value,
}) => (
  <div className="flex items-center justify-between gap-3 border-b border-[#F1F5F9] py-2.5 last:border-0">
    <span className="text-sm text-[#565E74]">{label}</span>
    <span className="max-w-[220px] truncate text-right text-sm font-semibold text-[#0B1C30]">
      {value}
    </span>
  </div>
);

/**
 * Right-side fixed slide-over opened by Quick Inspect, row clicks and the
 * grid's Inspect buttons. Mirrors the "Vehicle Specification" mock using only
 * fields the vehicle ledger actually exposes.
 */
export const CompanyFleetInspectDrawer: React.FC<CompanyFleetInspectDrawerProps> = ({
  open,
  row,
  company,
  onClose,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!row) return null;

  const rating = row.rating.average;
  const ready = row.displayStatus === "available";

  return (
    <div
      className={`fixed inset-0 z-50 transition-opacity duration-300 ${
        open ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
      aria-hidden={!open}
    >
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <aside
        className={`absolute right-0 top-0 flex h-full w-full max-w-[480px] flex-col overflow-hidden bg-white shadow-2xl transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-[#E5E7EB] px-6 py-4">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-[#0B1C30]">
              {t("company.fleetPage.drawer.title")}
            </h2>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FFEDED] px-2.5 py-0.5 text-[10px] font-bold text-[#E13330]">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#E13330] opacity-60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#E13330]" />
              </span>
              {t("company.fleetPage.drawer.live")}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-[#565E74] transition-colors hover:bg-[#F1F5F9] cursor-pointer"
            aria-label={t("company.fleetPage.drawer.close")}
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="px-6 py-4">
            <p className="text-xs font-semibold text-[#565E74]">
              {t("company.fleetPage.drawer.subtitle", {
                company: company?.name ?? t("company.fleetPage.drawer.untitled"),
                code: row.code,
              })}
            </p>

            <div className="relative mt-3 h-40 overflow-hidden rounded-xl bg-[#F1F5F9]">
              {row.photo ? (
                <img
                  src={row.photo}
                  alt={`${row.make} ${row.model}`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-[#9AA4B5]">
                  {t("company.fleetPage.noPhoto")}
                </div>
              )}
              <span className="absolute right-3 top-3 rounded-md bg-black/55 px-2 py-1 font-mono text-[10px] font-bold tracking-wide text-white backdrop-blur-sm">
                {row.code}
              </span>
            </div>

            <h3 className="mt-3 text-lg font-bold text-[#0B1C30]">
              {row.make} {row.model}
              {row.year ? (
                <span className="ml-2 rounded-md bg-[#F1F5F9] px-1.5 py-0.5 text-xs font-bold text-[#565E74]">
                  {row.year}
                </span>
              ) : null}
            </h3>
            <span className="rounded-full bg-[#F7F9FC] px-2.5 py-1 text-xs font-bold text-[#565E74]">
              {categoryLabel(t, row.type)}
            </span>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-[#E5E7EB] bg-[#F7F9FC] p-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#565E74]">
                  <CalendarDays className="h-4 w-4 text-[#2563EB]" aria-hidden="true" />
                  {t("company.fleetPage.drawer.metricsActivity")}
                </div>
                <p className="mt-2 text-2xl font-extrabold text-[#0B1C30]">{row.bookings}</p>
                <p className="text-[11px] text-[#9AA4B5]">
                  {t("company.fleetPage.drawer.ridesLabel")}
                </p>
              </div>
              <div className="rounded-xl border border-[#E5E7EB] bg-[#F7F9FC] p-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#565E74]">
                  <Star className="h-4 w-4 text-[#F59E0B]" aria-hidden="true" />
                  {t("company.fleetPage.drawer.metricsRating")}
                </div>
                <p className="mt-2 flex items-baseline gap-1 text-2xl font-extrabold text-[#0B1C30]">
                  {rating !== null ? rating.toFixed(1) : "—"}
                  {rating !== null && <Star className="h-4 w-4 text-[#F59E0B]" fill="currentColor" />}
                </p>
                <p className="text-[11px] text-[#9AA4B5]">
                  {t("company.fleetPage.drawer.reviewsLabel", {
                    count: row.rating.count,
                  })}
                </p>
              </div>
            </div>

            <h4 className="mt-5 text-sm font-bold text-[#0B1C30]">
              {t("company.fleetPage.drawer.operationalData")}
            </h4>
            <div className="mt-2 rounded-xl border border-[#E5E7EB] px-4">
              <Row
                label={t("company.fleetPage.drawer.internalId")}
                value={
                  <span className="rounded-md bg-[#F1F5F9] px-2 py-0.5 font-mono text-xs font-semibold text-[#565E74]">
                    {row.code}
                  </span>
                }
              />
              <Row
                label={t("company.fleetPage.drawer.hub")}
                value={
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-[#9AA4B5]" aria-hidden="true" />
                    {row.city ?? "—"}
                  </span>
                }
              />
              <Row
                label={t("company.fleetPage.drawer.pickup")}
                value={row.pickupLocation ?? "—"}
              />
              <Row
                label={t("company.fleetPage.drawer.transmission")}
                value={t(`company.fleetPage.transmission.${row.transmission ?? "AUTOMATIC"}`)}
              />
              <Row
                label={t("company.fleetPage.drawer.fuel")}
                value={
                  <span className="inline-flex items-center gap-1">
                    <Fuel className="h-3.5 w-3.5 text-[#9AA4B5]" aria-hidden="true" />
                    {t(`company.fleetPage.fuel.${row.fuelType ?? "GASOLINE"}`)}
                  </span>
                }
              />
              <Row
                label={t("company.fleetPage.drawer.gps")}
                value={row.gpsActive ? (
                  <span className="inline-flex items-center gap-1.5 font-bold text-[#0BA05F]">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#0BA05F] opacity-60" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-[#0BA05F]" />
                    </span>
                    <Satellite className="h-3.5 w-3.5" aria-hidden="true" />
                    {t("company.fleetPage.drawer.gpsActive")}
                  </span>
                ) : (
                  <span className="font-semibold text-[#9AA4B5]">
                    {t("company.fleetPage.drawer.gpsOffline")}
                  </span>
                )}
              />
              <Row
                label={t("company.fleetPage.drawer.dispatch")}
                value={
                  ready ? (
                    <span className="inline-flex items-center gap-1.5">
                      <ShieldCheck className="h-4 w-4 text-[#0BA05F]" aria-hidden="true" />
                      <span className="font-bold text-[#0BA05F]">
                        {t("company.fleetPage.drawer.ready")}
                      </span>
                    </span>
                  ) : (
                    <span className={fleetStatusTone(t, row.displayStatus).chip.split(" ")[1]}>
                      {fleetStatusTone(t, row.displayStatus).label}
                    </span>
                  )
                }
              />
            </div>

            <h4 className="mt-5 text-sm font-bold text-[#0B1C30]">
              {t("company.fleetPage.drawer.pricing")}
            </h4>
            <div className="mt-2 rounded-xl border border-[#E5E7EB] px-4">
              <Row
                label={t("company.fleetPage.drawer.weeklyRate")}
                value={
                  row.weeklyPrice
                    ? `${formatLYD(row.weeklyPrice)} ${t("company.fleetPage.price.weekly")}`
                    : "—"
                }
              />
              <Row
                label={t("company.fleetPage.drawer.dailyRate")}
                value={`${formatLYD(row.dailyPrice)} / ${t("company.fleetPage.price.day")}`}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 border-t border-[#E5E7EB] bg-white px-4 py-3">
          <button
            type="button"
            onClick={() => {
              onClose();
              navigate(`/company/fleet/${row.id}/edit`);
            }}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#2563EB] px-2 py-2.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-[#1D4ED8] cursor-pointer"
          >
            <Pencil className="h-4 w-4" aria-hidden="true" />
            {t("company.fleetPage.drawer.edit")}
          </button>
          <button
            type="button"
            disabled
            title={t("company.fleetPage.soon")}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#E5E7EB] bg-white px-2 py-2.5 text-xs font-bold text-[#565E74] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <CalendarDays className="h-4 w-4" aria-hidden="true" />
            {t("company.fleetPage.drawer.calendar")}
          </button>
          <button
            type="button"
            disabled
            title={t("company.fleetPage.soon")}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#E5E7EB] bg-white px-2 py-2.5 text-xs font-bold text-[#565E74] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Printer className="h-4 w-4" aria-hidden="true" />
            {t("company.fleetPage.drawer.print")}
          </button>
        </div>
      </aside>
    </div>
  );
};

export default CompanyFleetInspectDrawer;