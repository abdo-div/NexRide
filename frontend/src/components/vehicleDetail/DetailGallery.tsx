import React from "react";
import { useTranslation } from "react-i18next";
import { Camera, Expand, X, ChevronLeft, ChevronRight } from "lucide-react";
import type { VehicleDetail } from "../../types/vehicleDetail";
import { VehicleImage } from "../VehicleImage";

interface Props {
  detail: VehicleDetail;
}

export const DetailGallery: React.FC<Props> = ({ detail }) => {
  const { t } = useTranslation();
  const images = detail.gallery.filter((_, index) => index !== 1);
  const initialIndex = Math.max(0, images.findIndex((image) => image.master));
  const [activeIndex, setActiveIndex] = React.useState(initialIndex);
  const [viewerOpen, setViewerOpen] = React.useState(false);
  const active = images[activeIndex] ?? images[0];
  const labelFor = (i: (typeof images)[number]) => t(i.label ?? i.alt, { model: detail.vehicle.title });

  React.useEffect(() => {
    if (!viewerOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setViewerOpen(false);
      if (event.key === "ArrowRight") setActiveIndex((index) => (index + 1) % images.length);
      if (event.key === "ArrowLeft") setActiveIndex((index) => (index - 1 + images.length) % images.length);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [images.length, viewerOpen]);

  return (
    <section className="mb-12" aria-label={t("vehicleDetail.galleryLabel")}>
      <div className="grid grid-cols-1 gap-3 rounded-[2rem] border border-slate-200/80 bg-white p-2 shadow-[0_28px_80px_-45px_rgba(15,23,42,.55)] md:grid-cols-12 md:gap-2">
      {active && (
        <button type="button" onClick={() => setViewerOpen(true)} className={`relative min-h-[360px] overflow-hidden rounded-[1.5rem] bg-slate-100 text-start group md:min-h-[540px] ${images.length > 1 ? "md:col-span-9" : "md:col-span-12"}`}>
          <VehicleImage
            src={active.src}
            alt={t(active.alt, { model: detail.vehicle.title })}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-black/10 pointer-events-none" />
          <div className="absolute top-4 start-4 flex flex-wrap gap-2">
            <span className="px-3 py-1.5 rounded-xl bg-white/90 backdrop-blur-md text-[#0F172A] text-[11px] font-bold flex items-center gap-1.5 shadow-sm border border-slate-200">
              <Camera className="w-4 h-4 text-[#142B4A]" />
              {labelFor(active)}
            </span>
          </div>
          <div className="absolute bottom-4 start-4 end-4 flex items-end justify-between">
            <div>
              <span className="block text-[11px] text-blue-300 font-bold uppercase tracking-widest mb-0.5">
                {t(active.headline ?? "vehicleDetail.showcaseView")}
              </span>
              <p className="text-[18px] font-bold text-white">
                {t(active.alt, { model: detail.vehicle.title })}
              </p>
            </div>
            <span className="hidden sm:flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/90 backdrop-blur-md text-[#0F172A] text-[12px] font-semibold shadow-sm">
              <Expand className="w-4 h-4 text-[#142B4A]" />
              {t("vehicleDetail.openGallery")}
            </span>
          </div>
        </button>
      )}

      {images.length > 1 && (
      <div className="grid grid-cols-3 gap-2 md:col-span-3 md:grid-cols-1">
        {images.slice(0, 4).map((img, index) => (
          <button
            type="button"
            key={img.src}
            onClick={() => setActiveIndex(index)}
            aria-pressed={activeIndex === index}
            className={`relative h-24 overflow-hidden rounded-2xl border-2 bg-slate-100 text-start transition-all md:h-auto ${activeIndex === index ? "border-[#2563EB] shadow-md" : "border-transparent opacity-80 hover:opacity-100"}`}
          >
            <VehicleImage
              src={img.src}
              alt={t(img.alt, { model: detail.vehicle.title })}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/75 to-transparent" />
            <span className="absolute bottom-2.5 start-3 hidden text-[11px] font-semibold text-white sm:block">
              {labelFor(img)}
            </span>
          </button>
        ))}
      </div>
      )}
      </div>

      {viewerOpen && active && (
        <div role="dialog" aria-modal="true" aria-label={t("vehicleDetail.galleryLabel")} className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/95 p-4 backdrop-blur-md">
          <button type="button" onClick={() => setViewerOpen(false)} aria-label={t("vehicleDetail.closeGallery")} className="absolute end-5 top-5 z-10 grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"><X className="h-5 w-5" /></button>
          <button type="button" onClick={() => setActiveIndex((index) => (index - 1 + images.length) % images.length)} aria-label={t("vehicleDetail.previousImage")} className="absolute start-5 z-10 grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"><ChevronLeft className="h-6 w-6 rtl:rotate-180" /></button>
          <VehicleImage src={active.src} alt={t(active.alt, { model: detail.vehicle.title })} className="max-h-[82vh] max-w-[92vw] rounded-2xl object-contain shadow-2xl" />
          <button type="button" onClick={() => setActiveIndex((index) => (index + 1) % images.length)} aria-label={t("vehicleDetail.nextImage")} className="absolute end-5 z-10 grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"><ChevronRight className="h-6 w-6 rtl:rotate-180" /></button>
          <div className="absolute bottom-5 rounded-full bg-white/10 px-4 py-2 text-xs font-semibold text-white">{activeIndex + 1} / {images.length} · {labelFor(active)}</div>
        </div>
      )}
    </section>
  );
};
