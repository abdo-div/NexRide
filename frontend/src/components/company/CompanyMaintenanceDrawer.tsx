import React from "react";
import { useTranslation } from "react-i18next";
import {
  Ban,
  CheckCircle2,
  CircleX,
  FileText,
  Hammer,
  MapPin,
  ShieldAlert,
  Sparkles,
  UserRound,
} from "lucide-react";
import { formatDate, formatLYD } from "../../lib/bookingView";
import {
  dispatchLockCodeOf,
  eventVehicleRef,
  isLocked,
  vehicleOf,
  vehicleTitleOf,
} from "../../lib/maintenanceView";
import { photoUrl } from "../../lib/vehicleMapper";
import { VehicleImage } from "../VehicleImage";
import { MaintenanceStatusChip } from "../admin/MaintenanceStatusChip";
import type { MaintenanceEventDto } from "../../types/admin";

interface CompanyMaintenanceDrawerProps {
  event: MaintenanceEventDto | null;
  open: boolean;
  busy: boolean;
  onClose: () => void;
  onComplete: (event: MaintenanceEventDto) => void;
  onRelease: (event: MaintenanceEventDto) => void;
}

/**
 * Slide-over record detail. Every figure maps to real ledger data — estimated
 * total, cost lines, DTC codes, workshop/technician, dates. The inspection
 * verdict and attached-invoice section have no model yet, so they surface as
 * coming-soon markers.
 */
export const CompanyMaintenanceDrawer: React.FC<CompanyMaintenanceDrawerProps> = ({
  event,
  open,
  busy,
  onClose,
  onComplete,
  onRelease,
}) => {
  const { t, i18n } = useTranslation();

  if (!event || !open) return null;

  const vehicle = vehicleOf(event);
  const locked = isLocked(event.dispatchStatus);
  const costLines = event.costLines ?? [];

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px]"
        onClick={busy ? undefined : onClose}
        aria-hidden="true"
      />
      <aside className="flex h-full w-full max-w-md flex-col overflow-hidden bg-white shadow-[0_24px_48px_-8px_rgba(15,23,42,0.3)]">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 bg-[#F8FAFC] px-6 py-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="h-12 w-16 shrink-0 overflow-hidden rounded-xl bg-[#E5EEFF]">
              <VehicleImage
                src={photoUrl(vehicle?.photos?.[0])}
                alt={vehicle?.make ?? ""}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-extrabold tracking-tight text-[#0B1C30]">
                {vehicleTitleOf(event)}
              </div>
              <div className="font-mono text-[11px] font-bold text-[#2563EB]">
                {eventVehicleRef(event)}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-[#565E74] transition-colors hover:bg-[#EFF4FF] hover:text-[#0B1C30] cursor-pointer"
            aria-label="close"
          >
            <CircleX className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          {/* Dispatch state banner */}
          <div className="flex items-center justify-between gap-3">
            <MaintenanceStatusChip status={event.dispatchStatus} />
            <span
              className="inline-flex items-center gap-1 rounded-full bg-[#F1F5F9] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-[#94A3B8]"
              title={t("company.maintenance.soon")}
            >
              <Sparkles className="h-3 w-3" />
              {t("company.maintenance.drawer.inspectionTag")}
            </span>
          </div>

          {locked && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
              <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-[#BA1A1A]">
                <ShieldAlert className="h-4 w-4" />
                {t("company.maintenance.drawer.dispatchBlocked")}
              </div>
              <p className="mt-1 text-xs text-[#A02323]">
                {t("company.maintenance.drawer.dispatchBlockedSub")}
              </p>
              <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1 font-mono text-[10px] font-bold text-[#BA1A1A] shadow-sm">
                <LockMini />
                {dispatchLockCodeOf(event)}
              </div>
            </div>
          )}

          {/* Service detail grid */}
          <dl className="grid grid-cols-2 gap-3">
            <Detail label={t("company.maintenance.drawer.serviceType")} wide>
              <div className="text-sm font-extrabold text-[#0B1C30]">
                {t(`admin.maintenance.categories.${event.category}`)}
              </div>
              <div className="mt-0.5 text-[11px] font-bold uppercase tracking-wider text-[#565E74]">
                {t(`admin.maintenance.priorities.${event.priority}`)}
              </div>
              <p className="mt-1 text-xs text-[#565E74]">{event.triggerReason || "—"}</p>
            </Detail>
            <Detail
              label={t("company.maintenance.drawer.serviceDate")}
              value={
                event.intakeDate
                  ? formatDate(event.intakeDate, i18n.language)
                  : event.createdAt
                    ? formatDate(event.createdAt, i18n.language)
                    : "—"
              }
            />
            <Detail
              label={t("company.maintenance.drawer.nextService")}
              value={
                event.estReturnDate
                  ? formatDate(event.estReturnDate, i18n.language)
                  : "—"
              }
            />
            <Detail
              label={t("company.maintenance.drawer.location")}
              value={event.workshop || vehicle?.city || vehicle?.pickupLocation || "—"}
              icon={<MapPin className="h-3.5 w-3.5" />}
            />
            <Detail
              label={t("company.maintenance.drawer.technician")}
              value={event.technician || "—"}
              icon={<UserRound className="h-3.5 w-3.5" />}
            />
          </dl>

          {/* Cost breakdown */}
          <section className="rounded-2xl border border-slate-100 bg-[#F8FAFC] p-4">
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#565E74]">
              {t("company.maintenance.drawer.costTitle")}
            </div>
            <div className="mt-3 space-y-2">
              {costLines.length > 0 ? (
                costLines.map((line, index) => (
                  <div
                    key={`${line.label}-${index}`}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-[#434655]">{line.label}</span>
                    <span className="font-bold text-[#0B1C30]">{formatLYD(line.amount)}</span>
                  </div>
                ))
              ) : (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#434655]">
                    {t("company.maintenance.drawer.estimated")}
                  </span>
                  <span className="font-bold text-[#0B1C30]">{formatLYD(event.estCost)}</span>
                </div>
              )}
              <div className="flex items-center justify-between border-t border-slate-200 pt-2">
                <span className="text-sm font-extrabold text-[#0B1C30]">
                  {t("company.maintenance.drawer.total")}
                </span>
                <span className="text-sm font-extrabold text-[#0B1C30]">
                  {formatLYD(
                    costLines.length > 0
                      ? costLines.reduce((sum, line) => sum + (line.amount ?? 0), 0)
                      : event.estCost,
                  )}
                  <span className="ml-1 text-[10px] font-bold text-[#565E74]">LYD</span>
                </span>
              </div>
            </div>
          </section>

          {/* DTC codes */}
          {(event.dtcCodes?.length ?? 0) > 0 && (
            <section className="rounded-2xl border border-amber-100 bg-amber-50/60 p-4">
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#B54E00]">
                {t("admin.maintenance.dossier.dtcTitle")}
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {event.dtcCodes?.map((dtc, index) => (
                  <span
                    key={`${dtc.code}-${index}`}
                    className="rounded-lg bg-white px-2 py-1 font-mono text-[11px] font-bold text-[#B54E00] shadow-sm"
                    title={dtc.description}
                  >
                    {dtc.code}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Technician notes */}
          {event.detail && (
            <section>
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#565E74]">
                {t("company.maintenance.drawer.notes")}
              </div>
              <p className="mt-1.5 text-sm leading-relaxed text-[#434655]">{event.detail}</p>
            </section>
          )}

          {/* Attached docs (unmodelled) */}
          <section className="flex items-center justify-between rounded-2xl border border-dashed border-[#C3C6D7] bg-[#F8FAFC] px-4 py-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#EFF4FF] text-[#2563EB]">
                <FileText className="h-4 w-4" />
              </span>
              <div>
                <div className="text-xs font-semibold text-[#0B1C30]">
                  {t("company.maintenance.drawer.invoices")}
                </div>
                <div className="text-[10px] text-[#9AA4B5]">
                  {t("company.maintenance.soon")}
                </div>
              </div>
            </div>
            <Sparkles className="h-4 w-4 text-[#C3C6D7]" />
          </section>
        </div>

        {/* Footer actions */}
        <div className="flex items-center gap-3 border-t border-slate-100 bg-white px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-xl bg-[#EFF4FF] px-4 py-2.5 text-sm font-semibold text-[#0B1C30] transition-colors hover:bg-[#E5EEFF] disabled:opacity-50 cursor-pointer"
          >
            {t("company.maintenance.drawer.close")}
          </button>
          {locked && (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={() => onComplete(event)}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#2563EB] px-4 py-2.5 text-sm font-bold text-white shadow-[0_4px_14px_rgba(37,99,235,0.3)] transition-colors enabled:hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
              >
                <Hammer className="h-4 w-4" />
                {busy ? t("company.maintenance.drawer.saving") : t("company.maintenance.drawer.completeWork")}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => onRelease(event)}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0B1C30] px-4 py-2.5 text-sm font-bold text-white transition-colors enabled:hover:bg-[#213145] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
              >
                <Ban className="h-4 w-4" />
                {t("company.maintenance.drawer.release")}
              </button>
            </>
          )}
          {!locked && (
            <button
              type="button"
              disabled
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-50 px-4 py-2.5 text-sm font-bold text-emerald-700"
            >
              <CheckCircle2 className="h-4 w-4" />
              {t("company.maintenance.drawer.completed")}
            </button>
          )}
        </div>
      </aside>
    </div>
  );
};

const LockMini: React.FC = () => (
  <svg viewBox="0 0 24 24" className="h-3 w-3" fill="currentColor" aria-hidden="true">
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 2a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-5-5Zm3 8V7a3 3 0 1 0-6 0v3h6Z"
    />
  </svg>
);

interface DetailProps {
  label: string;
  value?: string;
  wide?: boolean;
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

const Detail: React.FC<DetailProps> = ({ label, value, wide, icon, children }) => (
  <div className={wide ? "col-span-2" : ""}>
    <dt className="mb-0.5 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-[#565E74]">
      {icon}
      {label}
    </dt>
    <dd className="text-sm text-[#0B1C30]">{children ?? (value || "—")}</dd>
  </div>
);

export default CompanyMaintenanceDrawer;