import React from "react";
import { useTranslation } from "react-i18next";
import { CalendarDays, ChevronLeft, ChevronRight, CalendarX2 } from "lucide-react";
import { formatLYD } from "../../lib/bookingView";
import type { CompanyVehicleData, CompanyVehicleNextDispatch } from "../../types/companyVehicle";
import { SectionCard } from "./CompanyVehicleBits";

interface CompanyVehicleCalendarProps {
  data: CompanyVehicleData;
}

/**
 * Dispatch & calendar: next confirmed dispatch from the vehicle's own ledger,
 * then a real month grid where each booked day comes from booking records
 * (blue = confirmed/active, amber = awaiting payment, tint = available).
 */
export const CompanyVehicleCalendar: React.FC<CompanyVehicleCalendarProps> = ({
  data,
}) => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const { calendar, nextDispatch } = data;

  const firstWeekday = new Date(calendar.year, calendar.month - 1, 1).getDay();
  const daysInMonth = new Date(calendar.year, calendar.month, 0).getDate();

  const kinds = new Map<string, "booked" | "pending">();
  calendar.bookedDates.forEach((day) => kinds.set(day.date, day.kind));

  const weekdayNames = Array.from({ length: 7 }, (_, index) =>
    new Intl.DateTimeFormat(lang, { weekday: "short", timeZone: "UTC" }).format(
      new Date(Date.UTC(2017, 0, index + 1)),
    ),
  );

  const dispatchWindow = (dispatch: CompanyVehicleNextDispatch): string => {
    const start = new Date(dispatch.startDate);
    const end = new Date(dispatch.endDate);
    const startLabel = new Intl.DateTimeFormat(lang, {
      day: "numeric",
      month: "short",
    }).format(start);
    const endLabel = new Intl.DateTimeFormat(lang, {
      day: "numeric",
      month: lang.startsWith("ar") ? "long" : "short",
      year: "numeric",
    }).format(end);
    return `${startLabel} → ${endLabel}`;
  };

  return (
    <SectionCard
      icon={CalendarDays}
      iconStyle="bg-[#E5EEFF] text-[#2563EB]"
      title={t("company.vehiclePage.cal.title")}
      titleAr={t("company.vehiclePage.cal.titleAr")}
      action={
        <button
          type="button"
          disabled
          title={t("company.vehiclePage.soon")}
          className="rounded-lg bg-[#F1F5F9] px-3 py-1.5 text-xs font-bold text-[#0B1C30] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {t("company.vehiclePage.cal.block")}
        </button>
      }
    >
      {nextDispatch ? (
        <div className="mb-4 flex items-start gap-3 rounded-xl bg-[#EFF4FF] p-4">
          <CalendarDays className="mt-0.5 h-5 w-5 shrink-0 text-[#2563EB]" aria-hidden="true" />
          <div className="space-y-0.5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#565E74]">
              {t("company.vehiclePage.cal.next")}
            </p>
            <p className="text-sm font-bold text-[#0B1C30]">{dispatchWindow(nextDispatch)}</p>
            <p className="text-xs text-[#565E74]">
              {t("company.vehiclePage.cal.dispatchMeta", {
                reference: nextDispatch.reference,
                customer: nextDispatch.customerName || "—",
                days: nextDispatch.days,
                amount: formatLYD(nextDispatch.totalAmount),
              })}
            </p>
          </div>
        </div>
      ) : (
        <div className="mb-4 flex items-center gap-2 rounded-xl bg-[#F1F5F9] px-4 py-3 text-xs text-[#64748B]">
          <CalendarX2 className="h-4 w-4" aria-hidden="true" />
          {t("company.vehiclePage.cal.noDispatch")}
        </div>
      )}

      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-bold text-[#0B1C30]">{calendar.label}</span>
        <div className="flex items-center gap-1">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#F1F5F9] text-[#9AA4B5]">
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#F1F5F9] text-[#9AA4B5]">
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </span>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {weekdayNames.map((day, index) => (
          <span key={`${day}-${index}`} className="py-1 text-[10px] font-bold uppercase text-[#9AA4B5]">
            {day}
          </span>
        ))}
        {Array.from({ length: firstWeekday }, (_, index) => (
          <span key={`pad-${index}`} />
        ))}
        {Array.from({ length: daysInMonth }, (_, index) => {
          const day = index + 1;
          const key = `${calendar.year}-${String(calendar.month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const kind = kinds.get(key);
          const classes = kind
            ? kind === "booked"
              ? "bg-[#2563EB] text-white font-bold shadow-sm"
              : "bg-[#E5EEFF] text-[#2563EB] font-bold"
            : "bg-[#ECFDF5] text-[#0E6B34] font-bold";
          return (
            <span
              key={key}
              className={`rounded-lg p-1.5 text-xs ${classes}`}
              title={key}
            >
              {day}
            </span>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-[#F1F5F9] pt-2 text-[11px] text-[#565E74]">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-[#ECFDF5]" />
          {t("company.vehiclePage.cal.legend.available")}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-[#2563EB]" />
          {t("company.vehiclePage.cal.legend.booked")}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-[#E5EEFF]" />
          {t("company.vehiclePage.cal.legend.pending")}
        </span>
      </div>
    </SectionCard>
  );
};

export default CompanyVehicleCalendar;