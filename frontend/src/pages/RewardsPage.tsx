import { useEffect, useState } from "react";
import { Crown, Gift, LoaderCircle, Route } from "lucide-react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { rewardApi } from "../lib/rewardApi";
import type { RewardsSummary } from "../types/rewards";

export const RewardsPage = () => {
  const { t } = useTranslation();
  const [rewards, setRewards] = useState<RewardsSummary | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    rewardApi.mine(controller.signal).then((response) => { if (!controller.signal.aborted) setRewards(response.data.rewards); }).catch(() => { if (!controller.signal.aborted) setFailed(true); });
    return () => controller.abort();
  }, []);
  if (!rewards && !failed) return <main className="grid min-h-screen place-items-center bg-slate-50"><LoaderCircle className="h-8 w-8 animate-spin text-blue-600" /></main>;
  if (failed || !rewards) return <main className="grid min-h-screen place-items-center bg-slate-50 px-4"><p className="text-sm font-bold text-rose-700">{t("rewards.error")}</p></main>;
  const progress = rewards.nextTier ? Math.max(4, 100 - (rewards.pointsToNextTier / (rewards.tier === "EXPLORER" ? 500 : 1000)) * 100) : 100;
  return <main className="min-h-screen bg-slate-50 px-4 pb-20 pt-28 lg:px-8"><div className="mx-auto max-w-5xl"><span className="text-xs font-black uppercase tracking-[.18em] text-blue-600">{t("rewards.eyebrow")}</span><h1 className="mt-2 text-4xl font-black text-slate-950">{t("rewards.title")}</h1><p className="mt-3 text-sm leading-7 text-slate-600">{t("rewards.description")}</p>
    <section className="mt-8 overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#07182d] to-[#17457c] p-7 text-white shadow-xl"><div className="flex flex-wrap items-center justify-between gap-6"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-blue-200">{t(`rewards.tiers.${rewards.tier}`)}</p><p className="mt-2 text-5xl font-black tabular-nums">{rewards.points.toLocaleString()}</p><p className="text-sm text-blue-100">{t("rewards.points")}</p></div><Crown className="h-16 w-16 text-amber-300" /></div><div className="mt-7 h-2 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-gradient-to-r from-blue-400 to-cyan-300" style={{ width: `${progress}%` }} /></div><p className="mt-3 text-xs text-blue-100">{rewards.nextTier ? t("rewards.nextTier", { points: rewards.pointsToNextTier, tier: t(`rewards.tiers.${rewards.nextTier}`) }) : t("rewards.topTier")}</p></section>
    <div className="mt-6 grid gap-4 sm:grid-cols-2"><div className="rounded-3xl border border-slate-200 bg-white p-5"><Route className="h-6 w-6 text-blue-600" /><p className="mt-4 text-3xl font-black text-slate-950">{rewards.trips}</p><p className="text-sm text-slate-500">{t("rewards.paidTrips")}</p></div><div className="rounded-3xl border border-slate-200 bg-white p-5"><Gift className="h-6 w-6 text-blue-600" /><p className="mt-4 text-3xl font-black text-slate-950">{rewards.paidAmount.toLocaleString()} LYD</p><p className="text-sm text-slate-500">{t("rewards.eligibleSpend")}</p></div></div>
    <h2 className="mt-10 text-2xl font-black text-slate-950">{t("rewards.offers")}</h2><div className="mt-4 grid gap-4 sm:grid-cols-2">{rewards.promotions.map((promotion) => <article key={promotion.code} className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm"><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">{promotion.code}</span><p className="mt-4 text-2xl font-black text-slate-950">{t("rewards.percentOff", { percent: promotion.percent })}</p><p className="mt-2 text-xs leading-5 text-slate-500">{t("rewards.offerTerms", { minimum: promotion.minSubtotal, maximum: promotion.maxDiscount })}</p></article>)}</div><Link to="/fleet" className="mt-8 inline-flex rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white">{t("rewards.findCar")}</Link>
  </div></main>;
};
export default RewardsPage;
