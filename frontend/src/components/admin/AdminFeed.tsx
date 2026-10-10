import React from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { Car, ShieldCheck, Wrench } from "lucide-react";
import type { FeedItem } from "../../lib/adminMetrics";

interface AdminFeedProps {
  items: FeedItem[];
}

const kindConfig = {
  approval: {
    icon: ShieldCheck,
    box: "bg-[#2563EB] text-white",
    actionKey: "admin.feed.reviewDossier",
    actionClass: "text-white bg-[#2563EB]/[0.92] hover:bg-[#2563EB]",
    metaClass: "bg-white text-[#565E74]",
  },
  vehicle: {
    icon: Car,
    box: "bg-white text-[#2563EB] shadow-[0_1px_4px_rgba(15,23,42,0.08)]",
    actionKey: "admin.feed.verifyVin",
    actionClass: "text-[#565E74] bg-white shadow-[0_1px_4px_rgba(15,23,42,0.08)]",
    metaClass: "bg-[#EFF4FF] text-[#2563EB]",
  },
  maintenance: {
    icon: Wrench,
    box: "bg-amber-500 text-white",
    actionKey: "admin.feed.schedule",
    actionClass: "text-amber-900 bg-white shadow-[0_1px_4px_rgba(15,23,42,0.08)]",
    metaClass: "bg-amber-100 text-amber-900",
  },
} as const;

const relativeLabel = (time: Date, t: (key: string, opts?: object) => string): string => {
  const minutes = Math.max(0, Math.round((Date.now() - time.getTime()) / 60000));
  if (minutes < 1) return t("admin.feed.justNow");
  if (minutes < 60) return t("admin.feed.minutesAgo", { count: minutes });
  const hours = Math.round(minutes / 60);
  if (hours < 24) return t("admin.feed.hoursAgo", { count: hours });
  return t("admin.feed.daysAgo", { count: Math.round(hours / 24) });
};

/** Real-time operations feed — every row is derived from live endpoint data. */
export const AdminFeed: React.FC<AdminFeedProps> = ({ items }) => {
  const { t } = useTranslation();

  return (
    <section className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.05)]">
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#0B1C30]">{t("admin.feed.title")}</h2>
          <span className="rounded-full bg-[#EFF4FF] px-2 py-0.5 text-[11px] font-bold text-[#2563EB]">
            {t("admin.feed.actionItems", { count: items.length })}
          </span>
        </div>

        {items.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center rounded-xl bg-[#F8FAFC] text-center">
            <p className="text-sm font-semibold text-[#0B1C30]">{t("admin.feed.emptyTitle")}</p>
            <p className="mt-1 text-xs text-[#64748B]">{t("admin.feed.emptyBody")}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item) => {
              const config = kindConfig[item.kind];
              const Icon = config.icon;
              return (
                <div
                  key={item.id}
                  className="flex items-start justify-between gap-3 rounded-xl bg-[#EFF4FF] p-3 transition-all hover:bg-[#E5EEFF]"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <div
                      className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${config.box}`}
                    >
                      <Icon className="h-[18px] w-[18px]" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-bold text-[#0B1C30]">
                          {item.title}
                        </span>
                        {item.meta && (
                          <span
                            className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${config.metaClass}`}
                          >
                            {item.meta}
                          </span>
                        )}
                      </div>
                      {item.detail && (
                        <p className="mt-0.5 truncate text-xs text-[#565E74]">
                          {item.detail}
                        </p>
                      )}
                      <span className="mt-1 block text-[11px] text-[#737686]">
                        {relativeLabel(item.time, t as (key: string, opts?: object) => string)}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled
                    title={t("admin.layout.soon")}
                    className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all cursor-not-allowed opacity-80 ${config.actionClass}`}
                  >
                    {t(config.actionKey)}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-4 border-t border-slate-100 pt-3 text-center">
        <Link
          to="/admin/bookings"
          className="inline-flex items-center gap-1 text-sm font-bold text-[#2563EB] hover:underline"
        >
          {t("admin.feed.openLog")}
        </Link>
      </div>
    </section>
  );
};

export default AdminFeed;