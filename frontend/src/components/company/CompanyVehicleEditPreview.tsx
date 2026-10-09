import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { CheckCircle2, ExternalLink, Eye, Loader2, UserRound } from "lucide-react";
import { formatLYD } from "../../lib/bookingView";
import { photoUrl } from "../../lib/vehicleMapper";
import type { CompanyVehicleEditForm } from "../../hooks/useCompanyVehicleEditForm";
import { FleetStatusPill } from "./CompanyFleetBits";
import { categoryLabel } from "./companyFleetUi";

interface CompanyVehicleEditPreviewProps {
  form: CompanyVehicleEditForm;
}

const readyGreen = "bg-[#DDF4E4] text-[#0E6B34]";

const LocalPreviewImage: React.FC<{ file: File; alt: string }> = ({ file, alt }) => {
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
  return src ? <img src={src} alt={alt} className="h-full w-full object-cover" /> : <div className="h-full w-full animate-pulse bg-[#E2E8F0]" />;
};

/**
 * Right sticky column: live marketplace preview (reflects every pending edit),
 * onboarding readiness and the real action card. Save changes / save draft call
 * the tenant-gated PATCH endpoint; discard reverts the local draft to the
 * showcased values; "view public" opens the genuine public listing.
 */
export const CompanyVehicleEditPreview: React.FC<CompanyVehicleEditPreviewProps> = ({
  form,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const {
    previewVehicle,
    dirty,
    dirtyCount,
    saving,
    saved,
    saveError,
    saveChanges,
    saveDraft,
    reset,
    newImages,
  } = form;

  const stagedPhoto = newImages[0] ?? null;
  const photo = previewVehicle.photos[0] ?? previewVehicle.photo ?? null;
  const photosReady = newImages.length > 0 || previewVehicle.photos.length > 0;

  const readiness = [
    {
      key: "registry",
      state: "coming" as const,
      label: t("company.editVehiclePage.readiness.registry"),
      value: t("company.vehiclePage.soon"),
    },
    {
      key: "escrow",
      state: "coming" as const,
      label: t("company.editVehiclePage.readiness.escrow"),
      value: t("company.editVehiclePage.readiness.coming"),
    },
    {
      key: "photos",
      state: photosReady ? ("ok" as const) : ("pending" as const),
      label: t("company.editVehiclePage.readiness.photos"),
      value: t("company.editVehiclePage.readiness.photosValue", {
        count: previewVehicle.photos.length + newImages.length,
      }),
    },
    {
      key: "telematics",
      state: previewVehicle.gpsActive ? ("ok" as const) : ("pending" as const),
      label: t("company.editVehiclePage.readiness.telematics"),
      value: previewVehicle.gpsActive
        ? t("company.editVehiclePage.readiness.online")
        : t("company.editVehiclePage.readiness.offline"),
    },
  ];

  const readyCount = readiness.filter((item) => item.state === "ok").length;

  return (
    <div className="flex flex-col gap-5 lg:sticky lg:top-[132px]">
      <section className="rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Eye className="h-4 w-4 text-[#2563EB]" aria-hidden="true" />
            <span className="text-sm font-bold text-[#0B1C30]">
              {t("company.editVehiclePage.preview.title")}
            </span>
          </div>
          <span className="text-[11px] text-[#9AA4B5]">
            {t("company.editVehiclePage.preview.appView", {
              city: previewVehicle.city ?? "",
            })}
          </span>
        </div>

        <div className="mt-3 overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-sm">
          <div className="relative aspect-[16/9] w-full bg-[#F1F5F9]">
            {stagedPhoto ? (
              <LocalPreviewImage file={stagedPhoto} alt={`${previewVehicle.make} ${previewVehicle.model}`} />
            ) : photo ? (
              <img
                src={photoUrl(photo)}
                alt={`${previewVehicle.make} ${previewVehicle.model}`}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-[#9AA4B5]">
                {t("company.editVehiclePage.media.noPhoto")}
              </div>
            )}
            <div className="absolute left-2.5 top-2.5 flex items-center gap-1.5">
              <FleetStatusPill status={previewVehicle.displayStatus} />
              {previewVehicle.city && (
                <span className="rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm">
                  {previewVehicle.city}
                </span>
              )}
            </div>
            {previewVehicle.listingStatus === "PUBLISHED" && (
              <span className="absolute bottom-2.5 right-2.5 inline-flex items-center gap-1 rounded-full bg-[#2563EB]/90 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-white" />
                {t("company.editVehiclePage.preview.instant")}
              </span>
            )}
          </div>

          <div className="flex flex-col gap-2 p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-[#0B1C30]">
                  {previewVehicle.make} {previewVehicle.model}
                  {previewVehicle.year ? ` (${previewVehicle.year})` : ""}
                </h3>
                <span className="text-[11px] text-[#9AA4B5]">
                  {categoryLabel(t, previewVehicle.type)}
                  {previewVehicle.transmission
                    ? ` • ${t(`company.fleetPage.transmission.${previewVehicle.transmission}`)}`
                    : ""}
                  {previewVehicle.seats
                    ? ` • ${previewVehicle.seats} ${t("company.editVehiclePage.specs.seatsUnit")}`
                    : ""}
                </span>
              </div>
              {previewVehicle.rating.average !== null && (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-[#F7F9FC] px-2 py-0.5 text-xs font-bold text-[#0B1C30]">
                  <span className="text-[#F59E0B]">★</span>
                  {previewVehicle.rating.average.toFixed(1)}
                  <span className="text-[10px] font-normal text-[#9AA4B5]">
                    ({previewVehicle.rating.count})
                  </span>
                </span>
              )}
            </div>

            <div className="flex items-end justify-between gap-2 border-t border-[#F1F5F9] pt-3">
              <div>
                <p className="text-xl font-extrabold text-[#004AC6]">
                  {formatLYD(previewVehicle.dailyPrice)}
                  <span className="ml-1 text-xs font-normal text-[#0B1C30]">
                    {t("company.editVehiclePage.preview.day")}
                  </span>
                </p>
                {previewVehicle.weeklyPrice && (
                  <p className="text-[11px] font-bold text-[#0BA05F]">
                    {formatLYD(previewVehicle.weeklyPrice)} LYD /{" "}
                    {t("company.fleetPage.price.weekly")}
                  </p>
                )}
              </div>
              <button
                type="button"
                disabled
                title={t("company.vehiclePage.soon")}
                className="rounded-xl bg-[#2563EB] px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {t("company.editVehiclePage.preview.bookNow")}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-[#0B1C30]">
            {t("company.editVehiclePage.readiness.title")}
          </h3>
          <span className="rounded-full bg-[#ECFDF5] px-2.5 py-0.5 text-[11px] font-bold text-[#0E6B34]">
            {t("company.editVehiclePage.readiness.readyCount", {
              ready: readyCount,
              total: readiness.length,
            })}
          </span>
        </div>
        <div className="mt-3 flex flex-col gap-2">
          {readiness.map((item) => (
            <div
              key={item.key}
              className="flex items-center justify-between rounded-lg bg-[#F7F9FC] px-3 py-2"
            >
              <span className="flex items-center gap-2 text-xs font-semibold text-[#0B1C30]">
                {item.state === "ok" ? (
                  <CheckCircle2 className="h-4 w-4 text-[#0BA05F]" aria-hidden="true" />
                ) : (
                  <span className="h-4 w-4 rounded-full border border-[#C3C6D7]" aria-hidden="true" />
                )}
                {item.label}
              </span>
              <span
                className={`text-[11px] font-bold ${
                  item.state === "ok" ? readyGreen : "text-[#9AA4B5]"
                }`}
              >
                {item.value}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-sm">
        {saved && (
          <div className="mb-3 flex items-center gap-2 rounded-lg bg-[#ECFDF5] px-3 py-2 text-xs font-bold text-[#0E6B34]">
            <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
            {t("company.editVehiclePage.actions.saved")}
          </div>
        )}
        {saveError && !saved && (
          <div className="mb-3 rounded-lg bg-[#FFF0F0] px-3 py-2 text-xs font-semibold text-[#BA1A1A]">
            {saveError}
          </div>
        )}

        <button
          type="button"
          onClick={saveChanges}
          disabled={!dirty || saving}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#2563EB] px-4 py-3 text-sm font-bold text-white shadow-[0_4px_14px_rgba(37,99,235,0.3)] transition-colors hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          {saving
            ? t("company.editVehiclePage.actions.saving")
            : t("company.editVehiclePage.actions.save")}{" "}
          {!saving && (
            <span className="text-[11px] font-normal text-white/80">
              ({t("company.editVehiclePage.actions.saveAr")})
            </span>
          )}
        </button>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={saveDraft}
            disabled={!dirty || saving}
            className="rounded-xl bg-[#F1F5F9] px-3 py-2.5 text-xs font-bold text-[#0B1C30] transition-colors hover:bg-[#E5EEFF] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {t("company.editVehiclePage.actions.saveDraft")}
          </button>
          <button
            type="button"
            onClick={() => navigate(`/cars/${previewVehicle.id}`)}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#E5E7EB] bg-white px-3 py-2.5 text-xs font-bold text-[#565E74] transition-colors hover:bg-[#F7F9FC] cursor-pointer"
          >
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            {t("company.editVehiclePage.actions.viewPublic")}
          </button>
        </div>
        <button
          type="button"
          onClick={reset}
          disabled={!dirty || saving}
          className="mt-2 w-full text-center text-xs font-semibold text-[#BA1A1A] underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
        >
          {t("company.editVehiclePage.actions.discard")}
        </button>
        <p className="mt-3 flex items-center gap-1.5 border-t border-[#F1F5F9] pt-3 text-[11px] text-[#9AA4B5]">
          <UserRound className="h-3.5 w-3.5" aria-hidden="true" />
          {dirty
            ? t("company.editVehiclePage.actions.unsaved", { count: dirtyCount })
            : t("company.editVehiclePage.editableNote")}
        </p>
      </section>
    </div>
  );
};

export default CompanyVehicleEditPreview;
