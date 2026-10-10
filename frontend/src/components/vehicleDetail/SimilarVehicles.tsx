import React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { ArrowRight, Armchair, Settings } from "lucide-react";
import type { VehicleDetail } from "../../types/vehicleDetail";
import { VehicleImage } from "../VehicleImage";

export const SimilarVehicles: React.FC<{ detail: VehicleDetail }> = ({ detail }) => {
  const { t } = useTranslation();

  const localizeSpec = (label: string) => {
    const match = /^(\d+)\s+Seats$/.exec(label);
    return match ? `${match[1]} ${t("data.common.seats")}` : t(label);
  };

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[20px] font-bold text-[#0F172A]">{t(detail.similarHeading)}</h2>
          <p className="text-[13px] text-[#64748B]">{t(detail.similarSub)}</p>
        </div>
        <Link
          to="/FleetPage"
          className="text-[13px] text-[#2563EB] font-bold hover:underline flex items-center gap-1"
        >
          {t(detail.similarLinkLabel)}
          <ArrowRight className="w-4 h-4 rtl:rotate-180" />
        </Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {detail.similar.map((s) => (
          <Link
            key={s.id}
            to={`/cars/${s.id}`}
            className="bg-white rounded-2xl overflow-hidden group shadow-sm border border-[#E2E8F0] hover:shadow-md hover:-translate-y-0.5 transition-all"
          >
            <div className="relative h-48 w-full overflow-hidden bg-slate-100">
              <VehicleImage
                src={s.image}
                alt={s.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <span className="absolute top-3 start-3 px-3 py-1 rounded-xl bg-white/95 backdrop-blur-md text-[#2563EB] text-[11px] font-bold shadow-sm border border-slate-200">
                {t(s.tag)}
              </span>
            </div>
            <div className="p-5 flex flex-col gap-2">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-[17px] font-bold text-[#0F172A]">{t(s.title)}</h4>
                  <p className="text-[13px] text-[#64748B]">{t(s.subtitle)}</p>
                </div>
                <div className="text-end shrink-0">
                  <span className="text-[22px] text-[#0F172A] font-bold">
                    {s.pricePerDay.toLocaleString()}
                  </span>
                  <span className="block text-[11px] text-[#64748B] font-semibold">
                    LYD {t("vehicleDetail.perDay")}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-[#F1F5F9]">
                <div className="flex items-center gap-3 text-[#64748B] text-[12px]">
                  {s.specs.map(
                    (sp, i) =>
                      sp.value === "" && (
                        <span key={sp.label} className="flex items-center gap-1">
                          {i === 0 ? (
                            <Armchair className="w-4 h-4 text-[#2563EB]" />
                          ) : (
                            <Settings className="w-4 h-4 text-[#2563EB]" />
                          )}
                          {localizeSpec(sp.label)}
                        </span>
                      ),
                  )}
                </div>
                <span className="px-3 py-1.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] hover:bg-[#F1F5F9] text-[#0F172A] text-[12px] font-bold transition-colors">
                  {t("vehicleDetail.viewSpecs")}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
};
