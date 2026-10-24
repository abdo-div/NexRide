import React, { useState } from "react";
import { AlertTriangle, LoaderCircle, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { bookingApi } from "../../lib/bookingApi";
import type { BookingDto } from "../../types/booking";

type Stage = "PICKUP" | "RETURN";

export const HandoverDialog: React.FC<{
  booking: BookingDto;
  stage: Stage;
  onClose: () => void;
  onSaved: (booking: BookingDto) => void;
}> = ({ booking, stage, onClose, onSaved }) => {
  const { t } = useTranslation();
  const keys = stage === "PICKUP"
    ? ["licenceReady", "identityReady", "vehicleInspected", "fuelRecorded"]
    : ["personalItemsRemoved"];
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [fuelRestored, setFuelRestored] = useState(true);
  const [damageReported, setDamageReported] = useState(false);
  const [fuelLevel, setFuelLevel] = useState<"EMPTY" | "QUARTER" | "HALF" | "THREE_QUARTERS" | "FULL">("FULL");
  const [odometer, setOdometer] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const ready = keys.every((key) => checks[key]);

  const save = async () => {
    if (!ready || busy) return;
    setBusy(true);
    setError(false);
    try {
      const payload = stage === "PICKUP"
        ? { stage, licenceReady: true as const, identityReady: true as const, vehicleInspected: true as const, fuelRecorded: true as const, notes }
        : { stage, personalItemsRemoved: true as const, fuelRestored, damageReported, fuelLevel, odometer: odometer ? Number(odometer) : null, notes };
      const result = await bookingApi.saveHandover(booking._id, payload);
      onSaved(result.data.booking);
    } catch {
      setError(true);
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="handover-title">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl">
        <header className="p-5 border-b border-slate-200 flex justify-between gap-3"><div><h2 id="handover-title" className="text-lg font-extrabold text-slate-950">{t(`handover.${stage.toLowerCase()}.title`)}</h2><p className="text-sm text-slate-500 mt-1">{t(`handover.${stage.toLowerCase()}.subtitle`)}</p></div><button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 cursor-pointer" aria-label={t("handover.close")}><X className="w-5 h-5" /></button></header>
        <div className="p-5 space-y-4">
          <div className="space-y-2">{keys.map((key) => <label key={key} className="flex items-start gap-3 rounded-xl border border-slate-200 p-3 text-sm text-slate-700 cursor-pointer"><input type="checkbox" checked={Boolean(checks[key])} onChange={(e) => setChecks((current) => ({ ...current, [key]: e.target.checked }))} className="mt-0.5" /><span>{t(`handover.${stage.toLowerCase()}.${key}`)}</span></label>)}</div>
          {stage === "RETURN" && <div className="grid sm:grid-cols-2 gap-3">
            <label className="text-sm font-bold text-slate-700">{t("handover.return.fuelLevel")}<select value={fuelLevel} onChange={(e) => setFuelLevel(e.target.value as typeof fuelLevel)} className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3 bg-white font-normal">{["EMPTY", "QUARTER", "HALF", "THREE_QUARTERS", "FULL"].map((level) => <option key={level} value={level}>{t(`handover.fuel.${level}`)}</option>)}</select></label>
            <label className="text-sm font-bold text-slate-700">{t("handover.return.odometer")}<input type="number" min="0" max="9999999" value={odometer} onChange={(e) => setOdometer(e.target.value)} className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3 font-normal" /></label>
            <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={fuelRestored} onChange={(e) => setFuelRestored(e.target.checked)} />{t("handover.return.fuelRestored")}</label>
            <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={damageReported} onChange={(e) => setDamageReported(e.target.checked)} />{t("handover.return.damageReported")}</label>
          </div>}
          <label className="block text-sm font-bold text-slate-700">{t("handover.notes")}<textarea rows={3} maxLength={1000} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={stage === "RETURN" && damageReported ? t("handover.return.damagePlaceholder") : t("handover.notesPlaceholder")} className="mt-2 w-full resize-none rounded-xl border border-slate-300 p-3 font-normal" /></label>
          {stage === "RETURN" && damageReported && !notes.trim() && <p className="flex items-center gap-2 text-xs text-amber-700"><AlertTriangle className="w-4 h-4" />{t("handover.return.describeDamage")}</p>}
          {error && <p className="text-sm text-rose-600">{t("handover.error")}</p>}
          <button type="button" onClick={save} disabled={!ready || busy || (stage === "RETURN" && damageReported && !notes.trim())} className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 py-3 text-white font-bold disabled:opacity-50 cursor-pointer">{busy && <LoaderCircle className="w-4 h-4 animate-spin" />}{busy ? t("handover.saving") : t("handover.confirm")}</button>
        </div>
      </div>
    </div>
  );
};
