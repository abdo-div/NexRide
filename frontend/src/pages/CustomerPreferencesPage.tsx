import { useEffect, useState } from "react";
import { CarFront, Check, Clock3, CreditCard, LoaderCircle, MapPin, SlidersHorizontal } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useCustomerPreferences } from "../context/useCustomerPreferences";
import { useToast } from "../context/toastContextValue";
import type { CustomerPreferences } from "../types/customerPreferences";
import type { VehicleType } from "../types/vehicle";

const VEHICLE_TYPES: VehicleType[] = ["SEDAN", "SUV", "HATCHBACK", "LUXURY", "VAN", "PICKUP"];

export const CustomerPreferencesPage = () => {
  const { t } = useTranslation();
  const { preferences, loading, savePreferences } = useCustomerPreferences();
  const { showToast } = useToast();
  const [draft, setDraft] = useState<CustomerPreferences>(preferences);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void Promise.resolve().then(() => setDraft(preferences));
  }, [preferences]);

  const update = <K extends keyof CustomerPreferences>(key: K, value: CustomerPreferences[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));
  const toggleType = (type: VehicleType) => update(
    "vehicleTypes",
    draft.vehicleTypes.includes(type)
      ? draft.vehicleTypes.filter((value) => value !== type)
      : [...draft.vehicleTypes, type],
  );

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await savePreferences(draft);
      showToast({ tone: "success", title: t("preferences.savedTitle"), description: t("preferences.savedDescription") });
    } catch (error) {
      showToast({ tone: "error", title: t("preferences.errorTitle"), description: error instanceof Error ? error.message : t("preferences.errorDescription") });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="grid min-h-[70vh] place-items-center" role="status"><LoaderCircle className="h-9 w-9 animate-spin text-blue-600" /></div>;

  const fieldClass = "mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";
  return (
    <main className="min-h-screen bg-slate-50 px-4 pb-20 pt-28 lg:px-8">
      <form onSubmit={save} className="mx-auto max-w-5xl">
        <span className="text-xs font-black uppercase tracking-[.18em] text-blue-600">{t("preferences.eyebrow")}</span>
        <h1 className="mt-2 text-3xl font-black text-slate-950 md:text-4xl">{t("preferences.title")}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">{t("preferences.description")}</p>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
            <div className="flex items-center gap-3"><CarFront className="h-5 w-5 text-blue-600" /><div><h2 className="font-black text-slate-950">{t("preferences.vehicleTitle")}</h2><p className="text-xs text-slate-500">{t("preferences.vehicleDescription")}</p></div></div>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">{VEHICLE_TYPES.map((type) => { const active = draft.vehicleTypes.includes(type); return <button key={type} type="button" aria-pressed={active} onClick={() => toggleType(type)} className={`relative rounded-2xl border px-3 py-4 text-sm font-bold transition ${active ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-600 hover:border-blue-300"}`}>{active && <Check className="absolute end-2 top-2 h-3.5 w-3.5" />}{t(`fleet.types.${type}`)}</button>; })}</div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3"><MapPin className="h-5 w-5 text-blue-600" /><h2 className="font-black text-slate-950">{t("preferences.locationTitle")}</h2></div>
            <label className="mt-5 block text-sm font-bold text-slate-700">{t("preferences.city")}<input value={draft.preferredCity} onChange={(event) => update("preferredCity", event.target.value)} maxLength={100} placeholder={t("preferences.cityPlaceholder")} className={fieldClass} /></label>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3"><SlidersHorizontal className="h-5 w-5 text-blue-600" /><h2 className="font-black text-slate-950">{t("preferences.specTitle")}</h2></div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2"><label className="text-sm font-bold text-slate-700">{t("preferences.transmission")}<select value={draft.transmission} onChange={(event) => update("transmission", event.target.value as CustomerPreferences["transmission"])} className={fieldClass}><option value="ANY">{t("preferences.any")}</option><option value="AUTOMATIC">{t("fleet.transmissions.AUTOMATIC")}</option><option value="MANUAL">{t("fleet.transmissions.MANUAL")}</option></select></label><label className="text-sm font-bold text-slate-700">{t("preferences.fuel")}<select value={draft.fuelType} onChange={(event) => update("fuelType", event.target.value as CustomerPreferences["fuelType"])} className={fieldClass}><option value="ANY">{t("preferences.any")}</option>{["GASOLINE", "DIESEL", "ELECTRIC", "HYBRID"].map((fuel) => <option key={fuel} value={fuel}>{t(`fleet.fuelTypes.${fuel}`)}</option>)}</select></label></div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3"><Clock3 className="h-5 w-5 text-blue-600" /><h2 className="font-black text-slate-950">{t("preferences.scheduleTitle")}</h2></div>
            <div className="mt-5 grid gap-4 sm:grid-cols-3"><label className="text-sm font-bold text-slate-700">{t("preferences.days")}<input type="number" min={1} max={30} value={draft.defaultRentalDays} onChange={(event) => update("defaultRentalDays", Number(event.target.value))} className={fieldClass} /></label><label className="text-sm font-bold text-slate-700">{t("preferences.pickupTime")}<input type="time" value={draft.pickupTime} onChange={(event) => update("pickupTime", event.target.value)} className={fieldClass} /></label><label className="text-sm font-bold text-slate-700">{t("preferences.returnTime")}<input type="time" value={draft.returnTime} onChange={(event) => update("returnTime", event.target.value)} className={fieldClass} /></label></div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3"><CreditCard className="h-5 w-5 text-blue-600" /><h2 className="font-black text-slate-950">{t("preferences.paymentTitle")}</h2></div>
            <div className="mt-5 grid grid-cols-2 gap-3">{(["CARD", "CASH_ON_DELIVERY"] as const).map((method) => <button key={method} type="button" onClick={() => update("paymentMethod", method)} className={`rounded-2xl border px-4 py-4 text-sm font-bold ${draft.paymentMethod === method ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-600"}`}>{t(`preferences.payment.${method}`)}</button>)}</div>
          </section>
        </div>
        <div className="sticky bottom-4 mt-8 flex justify-end rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-xl backdrop-blur"><button type="submit" disabled={saving} className="inline-flex min-w-44 items-center justify-center rounded-xl bg-blue-600 px-6 py-3 text-sm font-black text-white hover:bg-blue-500 disabled:opacity-60">{saving ? t("preferences.saving") : t("preferences.save")}</button></div>
      </form>
    </main>
  );
};

export default CustomerPreferencesPage;
