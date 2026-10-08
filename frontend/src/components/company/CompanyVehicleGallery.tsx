import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Camera, ImagePlus } from "lucide-react";
import type { CompanyVehicleProfile } from "../../types/companyVehicle";

interface CompanyVehicleGalleryProps {
  vehicle: CompanyVehicleProfile;
}

/**
 * Real photo gallery: main image with the actual photo count, plus the
 * first thumbnails when the vehicle has album photos. Falls back to the
 * single registry photo, then to an empty placeholder.
 */
export const CompanyVehicleGallery: React.FC<CompanyVehicleGalleryProps> = ({
  vehicle,
}) => {
  const { t } = useTranslation();
  const [activePhoto, setActivePhoto] = useState<string | null>(null);

  const photos = useMemo(() => {
    if (vehicle.photos.length > 0) return vehicle.photos;
    return vehicle.photo ? [vehicle.photo] : [];
  }, [vehicle.photo, vehicle.photos]);

  // A tapped thumbnail from a previous vehicle must never leak into this one:
  // only trust activePhoto while it is actually part of the current album.
  const current = photos.includes(activePhoto as string)
    ? (activePhoto as string)
    : photos[0] ?? null;
  const thumbs = photos.slice(1, 5);

  return (
    <section className="rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-sm">
      <div className="group relative h-[360px] w-full overflow-hidden rounded-xl bg-[#213145]">
        {current ? (
          <img
            src={current}
            alt={`${vehicle.make} ${vehicle.model}`}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-white/60">
            <Camera className="h-10 w-10" aria-hidden="true" />
            <span className="text-sm font-semibold">{t("company.vehiclePage.gallery.noPhoto")}</span>
          </div>
        )}
        <div className="absolute left-4 top-4 flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-black/70 px-3 py-1 text-xs font-bold text-white backdrop-blur-md">
            <Camera className="h-4 w-4" aria-hidden="true" />
            {t("company.vehiclePage.gallery.count", { photos: photos.length })}
          </span>
        </div>
        <button
          type="button"
          disabled
          title={t("company.vehiclePage.soon")}
          className="absolute bottom-4 right-4 inline-flex items-center gap-2 rounded-xl bg-black/70 px-3.5 py-2 text-sm font-semibold text-white backdrop-blur-md disabled:cursor-not-allowed disabled:opacity-60"
        >
          <ImagePlus className="h-4 w-4" aria-hidden="true" />
          {t("company.vehiclePage.gallery.manageMedia")}
        </button>
      </div>

      {thumbs.length > 0 && (
        <div className="mt-3 grid grid-cols-4 gap-3">
          {thumbs.map((photo, index) => (
            <button
              key={photo}
              type="button"
              onClick={() => setActivePhoto(photo)}
              className={`relative h-20 overflow-hidden rounded-lg transition-opacity hover:opacity-90 md:h-24 cursor-pointer ${
                current === photo ? "ring-2 ring-[#2563EB]" : ""
              }`}
              aria-label={`${vehicle.make} ${vehicle.model} photo ${index + 2}`}
            >
              <img
                src={photo}
                alt={`${vehicle.make} ${vehicle.model} ${index + 2}`}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </button>
          ))}
        </div>
      )}
    </section>
  );
};

export default CompanyVehicleGallery;