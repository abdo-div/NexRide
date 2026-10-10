import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  BadgeCheck,
  Building2,
  CalendarDays,
  CircleX,
  FileText,
  Gauge,
  Hammer,
  ShieldAlert,
  Wrench,
} from "lucide-react";
import type { MaintenanceEventDto } from "../../types/admin";
import {
  companyOf,
  dispatchLockCodeOf,
  eventCodeOf,
  eventVehicleRef,
  isLocked,
  vehicleOf,
} from "../../lib/maintenanceView";
import { formatDate, formatLYD } from "../../lib/bookingView";
import { photoUrl } from "../../lib/vehicleMapper";
import { MaintenanceStatusChip } from "./MaintenanceStatusChip";

export interface MaintenanceDossierPanelProps {
  event: MaintenanceEventDto;
  busy: boolean;
  onRelease: (event: MaintenanceEventDto) => void;
}

/** Quarantine dossier — vehicle, bay assignment, DTCs, costs and lifecycle. */
export const MaintenanceDossierPanel: React.FC<MaintenanceDossierPanelProps> = ({
  event,
  busy,
  onRelease,
}) => {
  const { t, i18n } = useTranslation();

  const vehicle = vehicleOf(event);
  const company = companyOf(event);
  const locked = isLocked(event.dispatchStatus);
  const overdue = event.dispatchStatus === "OVERDUE";
  const code = eventCodeOf(event);
  const lockCode = dispatchLockCodeOf(event);

  const steps = useMemo(() => {
    const createdAt = event.createdAt ?? "";
    const intake = event.intakeDate ?? "";
    const est = event.estReturnDate ?? "";
    const completed = event.completedDate ?? "";
    const isCompleted = event.dispatchStatus === "COMPLETED";
    return [
      {
        key: "triggered",
        title: t("admin.maintenance.dossier.stepTriggered"),
        meta: createdAt ? formatDate(createdAt, i18n.language) : "",
        done: Boolean(createdAt),
        active: false,
        overdue: false,
      },
      {
        key: "quarantined",
        title: t("admin.maintenance.dossier.stepQuarantined"),
        meta: t("admin.maintenance.dossier.stepQuarantinedSub"),
        done: Boolean(createdAt),
        active: false,
        overdue: false,
      },
      {
        key: "bay",
        title: t("admin.maintenance.dossier.stepBay"),
        meta: intake
          ? formatDate(intake, i18n.language)
          : t("admin.maintenance.dossier.stepPending", {
              date: est ? formatDate(est, i18n.language) : "—",
            }),
        done: Boolean(intake),
        active: false,
        overdue: false,
      },
      {
        key: "service",
        title: overdue
          ? t("admin.maintenance.dossier.stepOverdue")
          : isCompleted
            ? t("admin.maintenance.dossier.stepInService")
            : t("admin.maintenance.dossier.stepUnderService"),
        meta: isCompleted
          ? ""
          : est
            ? t("admin.maintenance.dossier.stepPending", {
                date: formatDate(est, i18n.language),
              })
            : "",
        done: isCompleted || overdue,
        active: !isCompleted && !overdue,
        overdue,
      },
      {
        key: "cleared",
        title: t("admin.maintenance.dossier.stepCleared"),
        meta: completed
          ? t("admin.maintenance.dossier.restored", {
              date: formatDate(completed, i18n.language),
            })
          : est
            ? t("admin.maintenance.dossier.stepPending", {
                date: formatDate(est, i18n.language),
              })
            : "",
        done: Boolean(completed),
        active: false,
        overdue: false,
      },
    ];
  }, [event, t, i18n.language, overdue]);

  const costLines = event.costLines && event.costLines.length > 0
    ? event.costLines
    : [{ label: "Estimate", amount: event.estCost }];

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_4px_20px_-2px_rgba(15,23,42,0.05)]">
      {/* Quarantine / clearance banner */}
      {locked ? (
        <div
          className={`p-5 text-white ${
            overdue
              ? "bg-gradient-to-r from-[#7F1D1D] to-[#BA1A1A]"
              : "bg-gradient-to-r from-[#0B1C30] to-[#173A63]"
          }`}
        >
          <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15">
                <ShieldAlert className="h-5 w-5" />
              </span>
              <div>
                <div className="text-sm font-extrabold tracking-wide">
                  {t("admin.maintenance.dossier.quarantineAlert")}
                </div>
                <div className="mt-0.5 text-xs text-white/75">
                  {t("admin.maintenance.dossier.quarantineBody")}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-lg bg-white/15 px-2.5 py-1 font-mono text-[11px] font-bold">
                {t("admin.maintenance.dossier.dispatchLock", { code: lockCode })}
              </span>
              {overdue && (
                <span className="inline-flex items-center gap-1 rounded-lg bg-red-950/40 px-2.5 py-1 text-[11px] font-extrabold text-red-100">
                  <CircleX className="h-3.5 w-3.5" />
                  {t("admin.maintenance.kpis.overdueLock")}
                </span>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-emerald-700 to-emerald-600 p-5 text-white">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15">
              <BadgeCheck className="h-5 w-5" />
            </span>
            <div>
              <div className="text-sm font-extrabold tracking-wide">
                {event.completedDate
                  ? t("admin.maintenance.dossier.restored", {
                      date: formatDate(event.completedDate, i18n.language),
                    })
                  : t("admin.maintenance.dossier.stepCleared")}
              </div>
              <div className="mt-0.5 text-xs text-white/75">
                {t("admin.maintenance.dossier.stepCleared")}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dossier header */}
      <div className="flex flex-col justify-between gap-4 border-b border-slate-100 p-6 lg:flex-row lg:items-start">
        <div className="flex items-center gap-4">
          {vehicle?.photos?.[0] ? (
            <img
              src={photoUrl(vehicle.photos[0])}
              alt=""
              className="h-16 w-16 shrink-0 rounded-2xl border border-slate-200 object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#E5EEFF] text-base font-extrabold text-[#2563EB]">
              {(vehicle?.make ?? "?").slice(0, 2).toUpperCase()}
            </div>
          )}
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-lg font-extrabold tracking-tight text-[#0B1C30]">
                {vehicle
                  ? `${vehicle.make ?? ""} ${vehicle.model ?? ""} ${vehicle.year ?? ""}`
                  : t("admin.maintenance.table.unknown")}
              </span>
              <MaintenanceStatusChip status={event.dispatchStatus} />
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px]">
              <span className="inline-flex items-center gap-1.5 rounded-md bg-[#EFF4FF] px-2 py-1 font-mono font-bold text-[#2563EB]">
                <Gauge className="h-3 w-3" />
                {eventVehicleRef(event)}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-md bg-[#EFF4FF] px-2 py-1 font-semibold text-[#565E74]">
                {t("admin.maintenance.dossier.vehicleTag", {
                  city: vehicle?.city ?? company?.city ?? t("admin.maintenance.dossier.none"),
                })}
              </span>
              <span className="font-mono text-[10px] font-bold text-[#565E74]">
                {code}
              </span>
            </div>
          </div>
        </div>

        {/* Derived spec chips */}
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:max-w-xl lg:flex-1">
          <SpecChip label={t("admin.maintenance.dossier.year")} value={String(vehicle?.year ?? "—")} />
          <SpecChip
            label={t("admin.maintenance.dossier.class")}
            value={vehicle?.type ? t(`admin.fleet.class.${vehicle.type}`) : "—"}
          />
          <SpecChip
            label={t("admin.maintenance.dossier.seats")}
            value={vehicle?.seats ? String(vehicle.seats) : "—"}
          />
          <SpecChip
            label={t("admin.maintenance.dossier.dailyRate")}
            value={vehicle?.dailyPrice != null ? `${formatLYD(vehicle.dailyPrice)}/d` : "—"}
          />
        </div>
      </div>

      {/* Bay / DTC / Cost */}
      <div className="grid grid-cols-1 gap-4 p-6 lg:grid-cols-3">
        <InfoCard
          tone="bg-[#EFF4FF]"
          iconTone="bg-white text-[#2563EB]"
          icon={<Building2 className="h-4 w-4" />}
          title={t("admin.maintenance.dossier.bayTitle")}
          rows={[
            { label: t("admin.maintenance.dossier.workshop"), value: event.workshop || t("admin.maintenance.dossier.none") },
            { label: t("admin.maintenance.dossier.technician"), value: event.technician || t("admin.maintenance.dossier.none") },
            {
              label: t("admin.maintenance.dossier.intake"),
              value: event.intakeDate
                ? formatDate(event.intakeDate, i18n.language)
                : t("admin.maintenance.dossier.none"),
            },
            {
              label: t("admin.maintenance.dossier.estReturn"),
              value: event.estReturnDate
                ? formatDate(event.estReturnDate, i18n.language)
                : t("admin.maintenance.dossier.none"),
            },
          ]}
        />

        <div className="flex flex-col justify-between rounded-xl bg-white p-3.5 ring-1 ring-slate-100">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-50 text-[#BA1A1A]">
              <Gauge className="h-4 w-4" />
            </span>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#0B1C30]">
                {t("admin.maintenance.dossier.dtcTitle")}
              </div>
              <div className="text-[10px] text-[#565E74]">
                {t(`admin.maintenance.categories.${event.category}`)} •{" "}
                {t(`admin.maintenance.priorities.${event.priority}`)}
              </div>
            </div>
          </div>
          <div className="mt-3 space-y-2">
            {(event.dtcCodes && event.dtcCodes.length > 0 ? event.dtcCodes : []).map(
              (dtc, index) => (
                <div key={index} className="rounded-lg bg-[#EFF4FF] p-2.5">
                  <div className="font-mono text-[12px] font-extrabold text-[#BA1A1A]">{dtc.code}</div>
                  <div className="mt-0.5 text-[11px] text-[#565E74]">{dtc.description}</div>
                </div>
              ),
            )}
            {(!event.dtcCodes || event.dtcCodes.length === 0) && (
              <div className="flex h-20 items-center justify-center rounded-lg border border-dashed border-slate-200 text-[11px] text-[#64748B]">
                {t("admin.maintenance.dossier.noDtc")}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-xl bg-gradient-to-br from-[#0B1C30] to-[#10263F] p-3.5 text-white">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10">
              <FileText className="h-4 w-4 text-emerald-300" />
            </span>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider">
                {t("admin.maintenance.dossier.costTitle")}
              </div>
              <div className="text-[10px] text-slate-400">{t("admin.maintenance.dossier.costSub")}</div>
            </div>
          </div>
          <div className="mt-3 space-y-1.5">
            {costLines.map((line, index) => (
              <div key={index} className="flex items-center justify-between text-xs">
                <span className="truncate text-slate-300">{line.label}</span>
                <span className="font-bold text-emerald-300">
                  {formatLYD(line.amount)} <span className="text-[9px] text-slate-400">LYD</span>
                </span>
              </div>
            ))}
            <div className="flex items-center justify-between border-t border-white/10 pt-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-200">
                {t("admin.maintenance.dossier.totalEstimate")}
              </span>
              <span className="text-base font-extrabold tracking-tight text-emerald-300">
                {formatLYD(event.estCost)} <span className="text-[10px] font-semibold text-slate-400">LYD</span>
              </span>
            </div>
          </div>
          <div className="mt-3 truncate text-[10px] text-slate-400">
            {t("admin.maintenance.dossier.billedTo", {
              company: company?.name ?? t("admin.maintenance.table.unknown"),
            })}
          </div>
        </div>
      </div>

      {/* Lifecycle timeline */}
      <div className="border-t border-slate-100 p-6">
        <h3 className="flex items-center gap-2 text-sm font-extrabold text-[#0B1C30]">
          <CalendarDays className="h-4 w-4 text-[#2563EB]" />
          {t("admin.maintenance.dossier.timelineTitle")}
        </h3>
        <p className="mt-0.5 text-xs text-[#565E74]">
          {t("admin.maintenance.dossier.timelineSub")}
        </p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {steps.map((step) => (
            <TimelineStep
              key={step.key}
              title={step.title}
              meta={step.meta}
              done={step.done}
              active={step.active}
              overdue={step.overdue}
            />
          ))}
        </div>
      </div>

      {/* Admin clearance */}
      {locked && (
        <div className="flex flex-col justify-between gap-3 bg-[#EFF4FF] p-6 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-[#2563EB]">
              <Wrench className="h-4 w-4" />
            </span>
            <div>
              <div className="text-xs font-bold text-[#0B1C30]">
                {t(`admin.maintenance.categories.${event.category}`)}
              </div>
              <div className="text-[11px] text-[#565E74]">
                {event.triggerReason || t("admin.maintenance.dossier.none")}
              </div>
            </div>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => onRelease(event)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#2563EB] px-4 py-2.5 text-sm font-bold text-white shadow-[0_4px_14px_rgba(37,99,235,0.3)] transition-all enabled:hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
          >
            <Hammer className="h-4 w-4" />
            {t("admin.maintenance.dossier.release")}
          </button>
        </div>
      )}
    </div>
  );
};

interface SpecChipProps {
  label: string;
  value: string;
}

const SpecChip: React.FC<SpecChipProps> = ({ label, value }) => (
  <div className="rounded-xl bg-[#EFF4FF] px-3 py-2">
    <div className="text-[10px] font-bold uppercase tracking-wider text-[#565E74]">{label}</div>
    <div className="mt-0.5 truncate text-[13px] font-extrabold text-[#0B1C30]">{value}</div>
  </div>
);

interface InfoCardProps {
  tone: string;
  iconTone: string;
  icon: React.ReactNode;
  title: string;
  rows: { label: string; value: string }[];
}

const InfoCard: React.FC<InfoCardProps> = ({ tone, iconTone, icon, title, rows }) => (
  <div className={`flex flex-col justify-between rounded-xl p-3.5 ${tone}`}>
    <div className="flex items-center gap-2">
      <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${iconTone}`}>
        {icon}
      </span>
      <span className="text-[11px] font-bold text-[#0B1C30]">{title}</span>
    </div>
    <div className="mt-3 space-y-2">
      {rows.map((row, index) => (
        <div key={index} className="flex items-center justify-between gap-3 text-xs">
          <span className="truncate text-[#565E74]">{row.label}</span>
          <span className="truncate font-bold text-[#0B1C30]">{row.value}</span>
        </div>
      ))}
    </div>
  </div>
);

interface TimelineStepProps {
  title: string;
  meta: string;
  done: boolean;
  active: boolean;
  overdue: boolean;
}

const TimelineStep: React.FC<TimelineStepProps> = ({ title, meta, done, active, overdue }) => (
  <div
    className={`relative rounded-xl border p-3.5 transition-colors ${
      overdue
        ? "border-red-200 bg-red-50/60"
        : active
          ? "border-[#2563EB]/30 bg-[#EFF4FF]"
          : done
            ? "border-emerald-200 bg-emerald-50/50"
            : "border-slate-100 bg-white opacity-60"
    }`}
  >
    <div className="flex items-center gap-2">
      {done ? (
        <BadgeCheck className="h-4 w-4 shrink-0 text-emerald-600" />
      ) : overdue ? (
        <CircleX className="h-4 w-4 shrink-0 text-[#BA1A1A]" />
      ) : (
        <span
          className={`h-4 w-4 shrink-0 rounded-full border-2 ${
            active
              ? "animate-pulse border-[#2563EB] bg-[#2563EB]/20"
              : "border-slate-300 bg-white"
          }`}
        />
      )}
      <span className="text-xs font-extrabold text-[#0B1C30]">{title}</span>
    </div>
    {meta && <p className="mt-1.5 text-[10px] leading-relaxed text-[#565E74]">{meta}</p>}
  </div>
);

export default MaintenanceDossierPanel;