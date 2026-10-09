import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ImagePlus, Sparkles, Star, X } from "lucide-react";
import type { CompanyVehicleEditForm } from "../../hooks/useCompanyVehicleEditForm";
import { photoUrl } from "../../lib/vehicleMapper";
import { SectionCard } from "./CompanyVehicleBits";

/**
 * Card 3 — Features & amenities. The record has no feature-set field yet, so
 * the whole section is a clearly-labelled coming-soon placeholder.
 */
export const CompanyVehicleEditFeatures: React.FC<CompanyVehicleEditMediaProps> = ({ form }) => {
  const { t } = useTranslation();
  const { draft, setField, fieldErrors } = form;

  return (
    <SectionCard
      icon={Sparkles}
      iconStyle="bg-[#FFF0E1] text-[#B54E00]"
      title={t("company.editVehiclePage.features.title")}
      titleAr={t("company.editVehiclePage.features.titleAr")}
      subtitle={t("company.editVehiclePage.features.subtitle")}
      action={
        <span className="text-[11px] font-bold text-[#9AA4B5]">
          {t("company.editVehiclePage.features.count", { count: draft.features.split(",").filter((v) => v.trim()).length })}
        </span>
      }
    >
      <label htmlFor="vehicle-features" className="mb-1.5 block text-xs font-bold text-[#0B1C30] dark:text-white">
        {t("company.editVehiclePage.features.fieldLabel")}
      </label>
      <textarea id="vehicle-features" value={draft.features} onChange={(e) => setField("features", e.target.value)} rows={3}
        placeholder={t("company.editVehiclePage.features.placeholder")}
        className="w-full resize-none rounded-xl border border-[#E5E7EB] bg-white px-3.5 py-2.5 text-sm text-[#0B1C30] outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15" />
      <p className={`mt-1 text-[11px] ${fieldErrors.features ? "text-[#DC2626]" : "text-[#9AA4B5]"}`}>{fieldErrors.features || t("company.editVehiclePage.features.hint")}</p>
    </SectionCard>
  );
};

interface CompanyVehicleEditMediaProps {
  form: CompanyVehicleEditForm;
}

/**
 * Live preview of a staged upload. The object URL is created once (lazy state
 * initialiser, never inside an effect) and revoked when the tile unmounts.
 */
const LocalFilePreview: React.FC<{ file: File; alt: string }> = ({ file, alt }) => {
  const [src, setSrc] = useState("");
  useEffect(() => {
    let active = true;
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      if (active && typeof reader.result === "string") setSrc(reader.result);
    });
    reader.readAsDataURL(file);
    return () => {
      active = false;
      if (reader.readyState === FileReader.LOADING) reader.abort();
    };
  }, [file]);
  return src ? <img src={src} alt={alt} className="aspect-[4/3] w-full object-cover" /> : <div className="aspect-[4/3] w-full animate-pulse bg-[#E2E8F0]" />;
};

/**
 * Card 4 — Photos & media. The album is fully editable: the first image is the
 * primary cover (reorderable), photos can be removed, and new files are staged
 * before saving. Staged uploads replace the current photo set on save (the
 * upload middleware persists exactly the uploaded files).
 */
export const CompanyVehicleEditMedia: React.FC<CompanyVehicleEditMediaProps> = ({
  form,
}) => {
  const { t } = useTranslation();
  const { photos, newImages, setCover, removePhoto, addNewImages, removeNewImage } = form;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const pickFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    const candidates = Array.from(fileList);
    const invalid = candidates.find((file) => !file.type.startsWith("image/") || file.size > 5 * 1024 * 1024);
    if (invalid) {
      setUploadError(t("company.editVehiclePage.media.invalidFile"));
    } else if (total + candidates.length > 8) {
      setUploadError(t("company.editVehiclePage.media.maxPhotos"));
    } else {
      setUploadError(null);
      addNewImages(candidates);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const total = photos.length + newImages.length;

  return (
    <SectionCard
      icon={ImagePlus}
      iconStyle="bg-[#E7E2FD] text-[#4C19C4]"
      title={t("company.editVehiclePage.media.title")}
      titleAr={t("company.editVehiclePage.media.titleAr")}
      subtitle={t("company.editVehiclePage.media.subtitle")}
      action={
        <span className="rounded-full bg-[#F1F5F9] px-2.5 py-1 text-[11px] font-bold text-[#565E74]">
          {t("company.editVehiclePage.media.count", { count: total })}
        </span>
      }
    >
      {total === 0 ? (
        <p className="rounded-xl border border-dashed border-[#E5E7EB] bg-[#F7F9FC] p-5 text-sm text-[#9AA4B5]">
          {t("company.editVehiclePage.media.noPhoto")}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {photos.map((photo, index) => (
            <div
              key={photo}
              className="relative overflow-hidden rounded-xl border border-[#E5E7EB] bg-[#F1F5F9] shadow-sm"
            >
              <img
                src={photoUrl(photo)}
                alt={`${index + 1}`}
                className="aspect-[4/3] w-full object-cover"
                loading="lazy"
              />
              <button
                type="button"
                onClick={() => removePhoto(index)}
                className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80 cursor-pointer"
                title={t("company.editVehiclePage.media.remove")}
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-gradient-to-t from-black/70 to-transparent p-2">
                {index === 0 ? (
                  <span className="rounded-full bg-[#2563EB] px-2 py-0.5 text-[10px] font-bold text-white">
                    {t("company.editVehiclePage.media.primary")}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setCover(index)}
                    className="inline-flex items-center gap-1 rounded bg-white/90 px-2 py-0.5 text-[10px] font-bold text-[#0B1C30] transition-colors hover:bg-white cursor-pointer"
                  >
                    <Star className="h-3 w-3 text-[#F59E0B]" aria-hidden="true" />
                    {t("company.editVehiclePage.media.setCover")}
                  </button>
                )}
              </div>
            </div>
          ))}

          {newImages.map((file, index) => (
            <div
              key={`${file.name}-${file.size}-${index}`}
              className="relative overflow-hidden rounded-xl border border-[#2563EB] bg-[#F1F5F9] shadow-sm"
            >
              <LocalFilePreview file={file} alt={file.name} />
              <button
                type="button"
                onClick={() => removeNewImage(index)}
                className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80 cursor-pointer"
                title={t("company.editVehiclePage.media.remove")}
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                <span className="rounded-full bg-[#2563EB] px-2 py-0.5 text-[10px] font-bold text-white">
                  {t("company.editVehiclePage.media.pending", { count: newImages.length })}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(event) => pickFiles(event.target.files)}
      />
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center gap-2 rounded-xl bg-[#F1F5F9] px-4 py-2.5 text-sm font-semibold text-[#0B1C30] transition-colors hover:bg-[#E5EEFF] cursor-pointer"
        >
          <ImagePlus className="h-4 w-4 text-[#2563EB]" aria-hidden="true" />
          {t("company.editVehiclePage.media.selectFile")}
        </button>
        <span className="text-[11px] text-[#9AA4B5]">
          {t("company.editVehiclePage.media.replaceHint")}
        </span>
      </div>
      {uploadError && <p className="mt-2 text-[11px] font-semibold text-[#DC2626]">{uploadError}</p>}
    </SectionCard>
  );
};
