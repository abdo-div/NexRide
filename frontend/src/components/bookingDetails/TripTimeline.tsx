import React from "react";
import { useTranslation } from "react-i18next";
import {
  CircleCheck,
  Flag,
  KeyRound,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import type { BookingDto } from "../../types/booking";
import { formatDate } from "../../lib/bookingView";

interface TripTimelineProps {
  booking: BookingDto;
  cancelled?: boolean;
}

type StepState = "done" | "active" | "pending";

const TOTAL = 4;

const doneCountFor = (status: BookingDto["bookingStatus"]): number => {
  switch (status) {
    case "PAID":
      return 1;
    case "CONFIRMED":
    case "ACTIVE":
      return 2;
    case "COMPLETED":
      return TOTAL;
    case "CANCELLED":
      return 1;
    default:
      return 0;
  }
};

export const TripTimeline: React.FC<TripTimelineProps> = ({
  booking,
  cancelled = false,
}) => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const status = booking.bookingStatus;
  const doneCount = doneCountFor(status);
  const currentStage = doneCount >= TOTAL ? TOTAL : doneCount + 1;
  const progress = (doneCount / TOTAL) * 100;

  const steps: {
    titleKey: string;
    doneMeta: string;
    pendingMeta: string;
    date?: string;
    meta?: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    {
      titleKey: "step1",
      doneMeta: t("bookingDetails.timeline.step1.done"),
      pendingMeta: t("bookingDetails.timeline.step1.pending"),
      date: formatDate(booking.createdAt, lang),
      icon: CircleCheck,
    },
    {
      titleKey: "step2",
      doneMeta: t("bookingDetails.timeline.step2.done"),
      pendingMeta: t("bookingDetails.timeline.step2.pending"),
      icon: ShieldCheck,
    },
    {
      titleKey: "step3",
      doneMeta: t("bookingDetails.timeline.step3.done"),
      pendingMeta: t("bookingDetails.timeline.step3.pending"),
      date: formatDate(booking.startDate, lang),
      meta: booking.pickupLocation,
      icon: KeyRound,
    },
    {
      titleKey: "step4",
      doneMeta: t("bookingDetails.timeline.step4.done"),
      pendingMeta: t("bookingDetails.timeline.step4.pending"),
      date: formatDate(booking.endDate, lang),
      icon: Flag,
    },
  ];

  const stateFor = (index: number): StepState => {
    if (cancelled) return index === 0 ? "done" : "pending";
    if (index < doneCount) return "done";
    if (index === doneCount) return "active";
    return "pending";
  };

  const iconTone = (state: StepState): string => {
    if (state === "done") return "bg-[#2563EB] text-white shadow-md";
    if (state === "active")
      return "bg-[#2563EB] text-white shadow-lg ring-4 ring-[#BFDBFE]";
    return "bg-[#F1F5F9] text-[#64748B]";
  };

  return (
    <section className="bg-white rounded-2xl border border-slate-200 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.05)] p-6 lg:p-8 flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <h2 className="text-[17px] font-bold text-[#0F172A]">
            {t("bookingDetails.timeline.title")}
          </h2>
        </div>
        {!cancelled && (
          <span className="text-[11px] text-[#64748B] bg-[#F1F5F9] px-2.5 py-1 rounded-full">
            {t("bookingDetails.timeline.currentStage", {
              current: currentStage,
              total: TOTAL,
            })}
          </span>
        )}
      </div>

      {cancelled ? (
        <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-red-50 text-red-700 text-sm font-bold self-start">
          <XCircle className="w-4 h-4" />
          {t("bookingDetails.timeline.cancelledNotice")}
        </div>
      ) : (
        <div className="relative w-full pt-2 pb-1">
          {/* Connector track */}
          <div className="hidden md:block absolute top-9 right-7 left-7 h-1 bg-[#E2E8F0] rounded-full">
            <div
              className="h-full bg-[#2563EB] rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {steps.map((step, index) => {
              const state = stateFor(index);
              const Icon = step.icon;
              return (
                <div
                  key={step.titleKey}
                  className="flex md:flex-col items-center md:items-start gap-3 relative"
                >
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${iconTone(state)}`}
                  >
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="flex flex-col text-start">
                    <span
                      className={`text-[11px] font-bold ${
                        state === "active"
                          ? "text-[#F97316] uppercase tracking-wide"
                          : state === "done"
                          ? "text-[#2563EB]"
                          : "text-[#94A3B8]"
                      }`}
                    >
                      {t(`bookingDetails.timeline.${step.titleKey}.title`)}
                    </span>
                    {state === "active" && (
                      <span className="text-[11px] font-extrabold text-[#F97316]">
                        {t("bookingDetails.statusActive")}
                      </span>
                    )}
                    {step.date && (
                      <span className="text-[12px] text-[#64748B] font-medium">
                        {step.date}
                      </span>
                    )}
                    {step.meta && (
                      <span className="text-[11px] text-[#2563EB] font-bold">
                        {step.meta}
                      </span>
                    )}
                    <span
                      className={`text-[11px] font-semibold mt-1 ${
                        state === "done"
                          ? "text-emerald-700"
                          : state === "active"
                          ? "text-[#2563EB]"
                          : "text-[#94A3B8]"
                      }`}
                    >
                      {state === "done" ? step.doneMeta : step.pendingMeta}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
};

export default TripTimeline;