import React from "react";
import { useTranslation } from "react-i18next";
import { Star, BadgeCheck } from "lucide-react";
import type { VehicleDetail } from "../../types/vehicleDetail";

export const CustomerReviews: React.FC<{ detail: VehicleDetail }> = ({ detail }) => {
  const { t } = useTranslation();

  return (
    <section className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6">
        <div>
          <h2 className="text-[20px] font-bold text-[#0F172A]">
            {t("vehicleDetail.renterFeedback")}
          </h2>
          <p className="text-[13px] text-[#64748B]">
            {t(detail.ratingsSub, { count: detail.ratingReviews })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[36px] font-extrabold text-[#0F172A]">{detail.ratingsBig}</span>
          <div>
            <div className="flex text-[#F97316]">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="w-5 h-5 fill-[#F97316] text-[#F97316]" />
              ))}
            </div>
            <span className="text-[11px] text-[#64748B] font-semibold">
              <BadgeCheck className="inline w-3.5 h-3.5 text-[#142B4A] -mt-0.5" />{" "}
              {t(detail.ratingsTag)}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6 p-4 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0]">
        {detail.ratingBars.map((b) => (
          <div key={b.label} className="space-y-1">
            <div className="flex justify-between text-[12px] text-[#64748B]">
              <span>{t(b.label)}</span>
              <span className="font-bold text-[#0F172A]">{b.score}</span>
            </div>
            <div className="w-full h-1.5 bg-[#E2E8F0] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#142B4A] rounded-full"
                style={{ width: `${b.percent}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-4">
        {detail.reviews.map((r) => (
          <div
            key={r.id}
            className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0]"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-8 h-8 rounded-full font-bold flex items-center justify-center text-[12px] ${r.avatarClass}`}
                >
                  {r.initials}
                </div>
                <div>
                  <h5 className="text-[13px] font-bold text-[#0F172A]">{r.author}</h5>
                  <p className="text-[11px] text-[#64748B]">{t(r.context)}</p>
                  <div className="mt-1 flex gap-0.5 text-amber-500">
                    {Array.from({ length: 5 }, (_, index) => (
                      <Star
                        key={index}
                        className={`h-3.5 w-3.5 ${index < r.rating ? "fill-current" : "text-slate-300"}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <span className="text-[12px] text-[#94A3B8]">{t(r.timeAgo)}</span>
            </div>
            <p className="text-[13px] text-[#64748B]">
              {t(r.body, { model: detail.vehicle.title })}
            </p>
            {r.companyResponse ? (
              <div className="mt-3 rounded-xl border-s-4 border-[#2563EB] bg-white px-4 py-3">
                <p className="text-[11px] font-extrabold uppercase tracking-wide text-[#2563EB]">
                  {t("vehicleDetail.companyResponse")}
                </p>
                <p className="mt-1 text-[13px] leading-6 text-slate-600">{r.companyResponse}</p>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
};
