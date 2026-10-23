import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { CircleCheck, ClipboardCheck, Clock3, ListChecks } from "lucide-react";
import type { BookingDto } from "../../types/booking";
import { HandoverDialog } from "./HandoverDialog";

export const ChecklistCard: React.FC<{
  booking: BookingDto;
  onUpdated: (booking: BookingDto) => void;
}> = ({ booking, onUpdated }) => {
  const { t, i18n } = useTranslation();
  const [stage, setStage] = useState<"PICKUP" | "RETURN" | null>(null);
  const pickupDone = Boolean(booking.handover?.pickup?.customerConfirmedAt);
  const returnDone = Boolean(booking.handover?.return?.customerSubmittedAt);
  const pickupAvailable = ["CONFIRMED", "ACTIVE"].includes(booking.bookingStatus) && !pickupDone;
  const returnAvailable = booking.bookingStatus === "ACTIVE" && !returnDone;
  const timestamp = returnDone
    ? booking.handover?.return?.customerSubmittedAt
    : pickupDone
    ? booking.handover?.pickup?.customerConfirmedAt
    : null;

  return (
    <>
      {stage && <HandoverDialog booking={booking} stage={stage} onClose={() => setStage(null)} onSaved={(updated) => { onUpdated(updated); setStage(null); }} />}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.05)] p-6 flex flex-col gap-4">
        <h2 className="text-[15px] font-bold text-[#0F172A] flex items-center gap-2"><span className="w-8 h-8 rounded-lg bg-[#F8FAFC] text-[#142B4A] flex items-center justify-center"><ListChecks className="w-4 h-4" /></span>{t("handover.cardTitle")}</h2>
        <div className="space-y-2.5">
          <div className={`rounded-xl border p-3 ${pickupDone ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-slate-50"}`}><div className="flex items-center gap-2"><CircleCheck className={`w-4 h-4 ${pickupDone ? "text-emerald-600" : "text-slate-400"}`} /><strong className="text-sm text-slate-900">{t("handover.pickup.shortTitle")}</strong></div><p className="text-xs text-slate-500 mt-1 ms-6">{pickupDone ? t("handover.pickup.done") : t("handover.pickup.pending")}</p></div>
          <div className={`rounded-xl border p-3 ${returnDone ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-slate-50"}`}><div className="flex items-center gap-2"><ClipboardCheck className={`w-4 h-4 ${returnDone ? "text-emerald-600" : "text-slate-400"}`} /><strong className="text-sm text-slate-900">{t("handover.return.shortTitle")}</strong></div><p className="text-xs text-slate-500 mt-1 ms-6">{returnDone ? t("handover.return.done") : t("handover.return.pending")}</p></div>
        </div>
        {timestamp && <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-500"><Clock3 className="w-3.5 h-3.5" />{new Date(timestamp).toLocaleString(i18n.language)}</span>}
        {pickupAvailable && <button type="button" onClick={() => setStage("PICKUP")} className="w-full rounded-xl bg-[#142B4A] hover:bg-[#0D2039] text-white py-2.5 text-xs font-bold cursor-pointer">{t("handover.pickup.action")}</button>}
        {returnAvailable && <button type="button" onClick={() => setStage("RETURN")} className="w-full rounded-xl bg-orange-500 hover:bg-orange-600 text-white py-2.5 text-xs font-bold cursor-pointer">{t("handover.return.action")}</button>}
        {!pickupAvailable && !returnAvailable && !pickupDone && <p className="text-xs text-slate-500 leading-5">{t("handover.notReady")}</p>}
      </section>
    </>
  );
};

export default ChecklistCard;
