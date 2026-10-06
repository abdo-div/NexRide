import React from "react";
import { useTranslation } from "react-i18next";

const anchorOrder = [
  "info",
  "specs",
  "features",
  "media",
  "pricing",
  "location",
  "policies",
  "publish",
] as const;

/** Sticky section anchors that scroll the form cards into view (plain links). */
export const CompanyVehicleEditAnchors: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="sticky top-[72px] z-30 -mx-1 overflow-x-auto px-1 py-1">
      <div className="flex w-max items-center gap-1.5 rounded-2xl border border-[#E5E7EB] bg-white/95 p-1.5 shadow-sm backdrop-blur-sm">
        {anchorOrder.map((key, index) => (
          <a
            key={key}
            href={`#section-${key}`}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[#F7F9FC] px-3.5 py-1.5 text-xs font-semibold text-[#565E74] transition-colors hover:bg-[#E5EEFF] hover:text-[#2563EB]"
          >
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white font-mono text-[10px] font-bold text-[#0B1C30]">
              {index + 1}
            </span>
            {t(`company.editVehiclePage.anchors.${key}.label`)}
            <span className="text-[10px] font-normal text-[#9AA4B5]">
              ({t(`company.editVehiclePage.anchors.${key}.ar`)})
            </span>
          </a>
        ))}
      </div>
    </div>
  );
};

export default CompanyVehicleEditAnchors;