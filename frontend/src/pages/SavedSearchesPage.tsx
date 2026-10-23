import { useEffect, useState } from "react";
import { Bell, BellOff, LoaderCircle, Search, Trash2 } from "lucide-react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { savedSearchApi } from "../lib/savedSearchApi";
import { useToast } from "../context/toastContextValue";
import type { SavedSearch } from "../types/savedSearch";

const searchUrl = (search: SavedSearch) => {
  const query = new URLSearchParams();
  const { criteria } = search;
  if (criteria.location) query.set("location", criteria.location);
  if (criteria.type.length) query.set("type", criteria.type.join(","));
  if (criteria.transmission) query.set("transmission", criteria.transmission);
  if (criteria.fuelType) query.set("fuelType", criteria.fuelType);
  if (criteria.maxPrice != null) query.set("maxPrice", String(criteria.maxPrice));
  if (criteria.startDate) query.set("startDate", criteria.startDate.slice(0, 10));
  if (criteria.endDate) query.set("endDate", criteria.endDate.slice(0, 10));
  return `/fleet?${query.toString()}`;
};

export const SavedSearchesPage = () => {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [searches, setSearches] = useState<SavedSearch[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;
    savedSearchApi.list(signal)
      .then((response) => { if (!signal.aborted) setSearches(response.data.searches); })
      .catch((error) => { if ((error as { name?: string })?.name !== "AbortError") showToast({ tone: "error", title: t("savedSearches.errorTitle"), description: t("savedSearches.errorDescription") }); })
      .finally(() => { if (!signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [showToast, t]);

  const toggleAlert = async (search: SavedSearch) => {
    setBusyId(search._id);
    try {
      const response = await savedSearchApi.update(search._id, { alertsEnabled: !search.alertsEnabled });
      setSearches((current) => current.map((item) => item._id === search._id ? response.data.search : item));
    } catch { showToast({ tone: "error", title: t("savedSearches.errorTitle"), description: t("savedSearches.errorDescription") }); }
    finally { setBusyId(""); }
  };
  const remove = async (search: SavedSearch) => {
    setBusyId(search._id);
    try { await savedSearchApi.remove(search._id); setSearches((current) => current.filter((item) => item._id !== search._id)); }
    catch { showToast({ tone: "error", title: t("savedSearches.errorTitle"), description: t("savedSearches.errorDescription") }); }
    finally { setBusyId(""); }
  };

  return <main className="min-h-screen bg-slate-50 px-4 pb-20 pt-28 lg:px-8"><div className="mx-auto max-w-5xl"><span className="text-xs font-black uppercase tracking-[.18em] text-blue-600">{t("savedSearches.eyebrow")}</span><h1 className="mt-2 text-3xl font-black text-slate-950 md:text-4xl">{t("savedSearches.title")}</h1><p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">{t("savedSearches.description")}</p>
    {loading ? <div className="grid min-h-64 place-items-center" role="status"><LoaderCircle className="h-8 w-8 animate-spin text-blue-600" /></div> : searches.length === 0 ? <div className="mt-10 rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center"><Search className="mx-auto h-10 w-10 text-slate-400" /><h2 className="mt-4 text-xl font-black text-slate-900">{t("savedSearches.emptyTitle")}</h2><p className="mt-2 text-sm text-slate-500">{t("savedSearches.emptyDescription")}</p><Link to="/fleet" className="mt-6 inline-flex rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white">{t("savedSearches.browse")}</Link></div> : <div className="mt-10 grid gap-4">{searches.map((search) => <article key={search._id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:flex sm:items-center sm:justify-between sm:gap-6"><div className="min-w-0"><div className="flex items-center gap-2"><h2 className="truncate text-lg font-black text-slate-950">{search.name}</h2><span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${search.alertsEnabled ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{t(search.alertsEnabled ? "savedSearches.alertsOn" : "savedSearches.alertsOff")}</span></div><p className="mt-2 text-xs leading-5 text-slate-500">{[search.criteria.location, search.criteria.type.map((type) => t(`fleet.types.${type}`)).join(", "), search.criteria.transmission ? t(`fleet.transmissions.${search.criteria.transmission}`) : "", search.criteria.maxPrice != null ? t("savedSearches.price", { price: search.criteria.maxPrice }) : ""].filter(Boolean).join(" · ") || t("savedSearches.allVehicles")}</p></div><div className="mt-4 flex shrink-0 flex-wrap gap-2 sm:mt-0"><button disabled={busyId === search._id} type="button" onClick={() => void toggleAlert(search)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">{search.alertsEnabled ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}{t(search.alertsEnabled ? "savedSearches.disable" : "savedSearches.enable")}</button><Link to={searchUrl(search)} className="inline-flex items-center gap-2 rounded-xl bg-[#142B4A] px-4 py-2 text-xs font-bold text-white"><Search className="h-4 w-4" />{t("savedSearches.run")}</Link><button disabled={busyId === search._id} type="button" onClick={() => void remove(search)} aria-label={t("savedSearches.delete", { name: search.name })} className="rounded-xl border border-rose-200 p-2 text-rose-600 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button></div></article>)}</div>}
  </div></main>;
};

export default SavedSearchesPage;
