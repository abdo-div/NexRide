import React from "react";
import { useTranslation } from "react-i18next";
import { Camera, LayoutGrid } from "lucide-react";
import type { VehicleDetail } from "../../types/vehicleDetail";
import { VehicleImage } from "../VehicleImage";

interface Props {
  detail: VehicleDetail;
}

export const DetailGallery: React.FC<Props> = ({ detail }) => {
  const { t } = useTranslation();
  const images = detail.gallery;
  const master = images.find((i) => i.master);
  const thumbs = images.filter((i) => !i.master);
  const labelFor = (i: (typeof images)[number]) => t(i.label ?? i.alt, { model: detail.vehicle.title });

  return (
    <section className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 mb-12">
      {master && (
        <div className="relative md:col-span-8 rounded-2xl overflow-hidden group shadow-sm border border-[#E2E8F0] bg-white min-h-[360px] md:min-h-[520px]">
          <VehicleImage
            src={master.src}
            alt={t(master.alt, { model: detail.vehicle.title })}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-black/10 pointer-events-none" />
          <div className="absolute top-4 start-4 flex flex-wrap gap-2">
            <span className="px-3 py-1.5 rounded-xl bg-white/90 backdrop-blur-md text-[#0F172A] text-[11px] font-bold flex items-center gap-1.5 shadow-sm border border-slate-200">
              <Camera className="w-4 h-4 text-[#2563EB]" />
              {labelFor(master)}
            </span>
          </div>
          <div className="absolute bottom-4 start-4 end-4 flex items-end justify-between">
            <div>
              <span className="block text-[11px] text-blue-300 font-bold uppercase tracking-widest mb-0.5">
                {t(master.headline ?? "vehicleDetail.showcaseView")}
              </span>
              <p className="text-[18px] font-bold text-white">
                {t(master.alt, { model: detail.vehicle.title })}
              </p>
            </div>
            <span className="hidden sm:flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/90 backdrop-blur-md text-[#0F172A] text-[12px] font-semibold shadow-sm">
              <Camera className="w-4 h-4 text-[#2563EB]" />
              {t(master.meta ?? "vehicleDetail.galleryMasterView")}
            </span>
          </div>
        </div>
      )}

      <div className="md:col-span-4 grid grid-cols-2 md:grid-cols-1 gap-3 md:gap-4">
        {thumbs.slice(0, 3).map((img) => (
          <div
            key={img.src}
            className="relative rounded-2xl overflow-hidden group shadow-sm border border-[#E2E8F0] bg-white h-[170px] md:h-[120px]"
          >
            <VehicleImage
              src={img.src}
              alt={t(img.alt, { model: detail.vehicle.title })}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent" />
            <span className="absolute bottom-2.5 start-3 text-[11px] text-white font-semibold">
              {labelFor(img)}
            </span>
          </div>
        ))}
        <div className="relative rounded-2xl overflow-hidden group cursor-pointer shadow-sm border border-[#E2E8F0] bg-[#F8FAFC] h-[170px] md:h-[120px] flex items-center justify-center text-center p-3 hover:border-blue-400 transition-colors">
          <div className="relative z-10 flex flex-col items-center justify-center gap-1">
            <LayoutGrid className="w-7 h-7 text-[#2563EB] group-hover:scale-110 transition-transform" />
            <span className="text-[14px] font-bold text-[#0F172A]">
              {t("vehicleDetail.moreAngles", { count: Math.max(thumbs.length - 3, 1) })}
            </span>
            <span className="text-[11px] text-[#64748B]">{t("vehicleDetail.cabinTour")}</span>
          </div>
        </div>
      </div>
    </section>
  );
};
