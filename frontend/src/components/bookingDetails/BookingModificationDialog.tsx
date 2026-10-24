import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { CalendarClock, X } from "lucide-react";
import { ApiError } from "../../lib/apiClient";
import { bookingApi } from "../../lib/bookingApi";
import type { BookingDto } from "../../types/booking";

type AddonId = "insurance" | "driver" | "childseat" | "delivery";

interface Props {
  booking: BookingDto;
  onClose: () => void;
  onSaved: (booking: BookingDto) => void;
}

const toLocalInput = (value: string) => {
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
};

const ADDONS: AddonId[] = ["insurance", "driver", "childseat", "delivery"];

export const BookingModificationDialog: React.FC<Props> = ({
  booking,
  onClose,
  onSaved,
}) => {
  const { t } = useTranslation();
  const [startDate, setStartDate] = useState(() => toLocalInput(booking.startDate));
  const [endDate, setEndDate] = useState(() => toLocalInput(booking.endDate));
  const [pickupLocation, setPickupLocation] = useState(booking.pickupLocation ?? "");
  const [pickupMethod, setPickupMethod] = useState<"BRANCH_PICKUP" | "DELIVERY">(
    booking.pickupMethod ?? "BRANCH_PICKUP",
  );
  const [addonIds, setAddonIds] = useState<AddonId[]>(
    () => (booking.addonIds ?? []).filter((id): id is AddonId => ADDONS.includes(id as AddonId)),
  );
  const [minimumStart] = useState(() => toLocalInput(new Date().toISOString()));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(
    () =>
      pickupLocation.trim().length > 0 &&
      new Date(startDate).getTime() > new Date(minimumStart).getTime() &&
      new Date(endDate).getTime() > new Date(startDate).getTime(),
    [endDate, minimumStart, pickupLocation, startDate],
  );

  const toggleAddon = (id: AddonId) => {
    setAddonIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit || busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await bookingApi.modify(booking._id, {
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        pickupLocation: pickupLocation.trim(),
        pickupMethod,
        addonIds,
      });
      onSaved(result.data.booking);
    } catch (reason) {
      setError(
        reason instanceof ApiError
          ? reason.message
          : t("bookingModification.genericError"),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4" role="dialog" aria-modal="true" aria-labelledby="modify-booking-title">
      <form onSubmit={submit} className="w-full max-w-2xl rounded-3xl bg-white p-5 shadow-2xl md:p-7">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 id="modify-booking-title" className="flex items-center gap-2 text-xl font-extrabold text-slate-900">
              <CalendarClock className="h-5 w-5 text-blue-600" />
              {t("bookingModification.title")}
            </h2>
            <p className="mt-1 text-sm text-slate-500">{t("bookingModification.unpaidNote")}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-slate-500 hover:bg-slate-100" aria-label={t("bookingModification.close")}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm font-bold text-slate-700">
            {t("bookingModification.pickupDate")}
            <input type="datetime-local" value={startDate} min={minimumStart} onChange={(e) => setStartDate(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 font-normal outline-none focus:border-blue-500" required />
          </label>
          <label className="text-sm font-bold text-slate-700">
            {t("bookingModification.returnDate")}
            <input type="datetime-local" value={endDate} min={startDate} onChange={(e) => setEndDate(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 font-normal outline-none focus:border-blue-500" required />
          </label>
          <label className="text-sm font-bold text-slate-700 md:col-span-2">
            {t("bookingModification.location")}
            <input value={pickupLocation} onChange={(e) => setPickupLocation(e.target.value)} maxLength={300} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 font-normal outline-none focus:border-blue-500" required />
          </label>
          <label className="text-sm font-bold text-slate-700">
            {t("bookingModification.method")}
            <select value={pickupMethod} onChange={(e) => setPickupMethod(e.target.value as "BRANCH_PICKUP" | "DELIVERY")} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 font-normal outline-none focus:border-blue-500">
              <option value="BRANCH_PICKUP">{t("bookingModification.branchPickup")}</option>
              <option value="DELIVERY">{t("bookingModification.delivery")}</option>
            </select>
          </label>
          <fieldset className="text-sm font-bold text-slate-700">
            <legend>{t("bookingModification.addons")}</legend>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {ADDONS.map((id) => (
                <label key={id} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 font-normal">
                  <input type="checkbox" checked={addonIds.includes(id)} onChange={() => toggleAddon(id)} />
                  {t(`bookingModification.addon.${id}`)}
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        {error && <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700" role="alert">{error}</p>}

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50">{t("bookingModification.cancel")}</button>
          <button type="submit" disabled={!canSubmit || busy} className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-extrabold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">{busy ? t("bookingModification.saving") : t("bookingModification.save")}</button>
        </div>
      </form>
    </div>
  );
};
