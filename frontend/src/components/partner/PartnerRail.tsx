import React from "react";
import { useTranslation } from "react-i18next";
import {
  Check,
  ListChecks,
  Headset,
  MessageCircle,
  PhoneCall,
} from "lucide-react";
import type { PartnerApplicationDraft } from "../../types/companyApplication";

const REQUIREMENT_KEYS = [
  "requirementItems.0",
  "requirementItems.1",
  "requirementItems.2",
  "requirementItems.3",
];

interface RailProps {
  activeStep: number;
  draft: PartnerApplicationDraft;
}

export const PartnerRail: React.FC<RailProps> = ({ activeStep, draft }) => {
  const { t } = useTranslation();
  const percent = Math.round((activeStep / 6) * 100);

  const detailFor = (step: number): string => {
    if (step === 1) return t("partner.rail.stepDetails.1", { name: draft.applicant.name });
    if (step === 2)
      return t("partner.rail.stepDetails.2", {
        company: draft.company.name,
        city: draft.company.city,
      });
    return t(`partner.rail.stepDetails.${step}`);
  };

  return (
    <div className="flex flex-col gap-5 lg:sticky lg:top-24">
      {/* Stepper progress card */}
      <div className="bg-white rounded-xl shadow-md p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#2563EB] block">
              {t("partner.rail.status")}
            </span>
            <span className="text-lg font-bold text-[#0B1C30] block mt-0.5">
              {t("partner.rail.stepOf", { n: activeStep })}
            </span>
          </div>
          <span className="text-xl font-black text-[#2563EB]">
            {t("partner.rail.percent", { p: percent })}
          </span>
        </div>

        <div className="w-full h-2 rounded-full bg-[#E5EEFF] overflow-hidden">
          <div
            className="h-full bg-[#2563EB] rounded-full transition-all duration-500"
            style={{ width: `${percent}%` }}
          />
        </div>

        <div className="flex flex-col gap-2.5 pt-1.5">
          {Array.from({ length: 6 }, (_, index) => index + 1).map((step) => {
            const isActive = step === activeStep;
            const isCompleted = step < activeStep;
            return (
              <div
                key={step}
                className={`flex items-start gap-3 rounded-xl ${
                  isActive ? "bg-[#EFF4FF] p-2.5" : ""
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-[11px] font-bold ${
                    isCompleted
                      ? "bg-[#D3E4FE] text-[#2563EB]"
                      : isActive
                        ? "bg-[#2563EB] text-white"
                        : "bg-[#E5EEFF] text-[#434655]"
                  }`}
                >
                  {isCompleted ? <Check className="w-3.5 h-3.5" /> : step}
                </div>
                <div className="min-w-0">
                  <span
                    className={`text-sm block truncate ${
                      isActive
                        ? "text-[#2563EB] font-bold"
                        : isCompleted
                          ? "text-[#0B1C30] font-bold"
                          : "text-[#0B1C30] font-medium"
                    }`}
                  >
                    {step}. {t(`partner.rail.listItems.${step}`)}
                  </span>
                  <span className="text-[11px] text-[#565E74] block truncate">
                    {isActive
                      ? t("partner.rail.editing")
                      : detailFor(step)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mandatory requirements */}
      <div className="bg-white rounded-xl shadow-md p-6 flex flex-col gap-3.5">
        <div className="flex items-center gap-2 text-[#0B1C30]">
          <ListChecks className="w-5 h-5 text-[#2563EB]" />
          <span className="text-sm font-bold">{t("partner.rail.requirements")}</span>
        </div>
        <ul className="flex flex-col gap-2.5 text-[13px] text-[#434655]">
          {REQUIREMENT_KEYS.map((key) => (
            <li key={key} className="flex items-center gap-2">
              <Check className="w-4 h-4 text-[#2563EB] shrink-0" />
              <span>{t(`partner.rail.${key}`)}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Concierge desk */}
      <div className="bg-[#213145] text-[#EAF1FF] rounded-xl shadow-md p-6 flex flex-col gap-4 relative overflow-hidden">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#2563EB] text-white flex items-center justify-center shrink-0">
            <Headset className="w-5 h-5" />
          </div>
          <div>
            <span className="text-sm font-bold block">{t("partner.rail.conciergeTitle")}</span>
            <span className="text-[11px] text-[#B4C5FF]">{t("partner.rail.conciergeSub")}</span>
          </div>
        </div>
        <p className="text-[13px] text-[#D3E4FE] leading-relaxed">
          {t("partner.rail.conciergeDesc")}
        </p>
        <div className="flex flex-col gap-2 pt-1">
          <a
            href="tel:+218910008820"
            className="flex items-center gap-2 text-sm font-bold hover:text-[#B4C5FF] transition-colors"
          >
            <PhoneCall className="w-[18px] h-[18px] text-[#DBE1FF]" />
            {t("partner.rail.conciergePhone")}
          </a>
          <a
            href="#"
            className="flex items-center gap-2 text-sm font-bold hover:text-[#B4C5FF] transition-colors"
          >
            <MessageCircle className="w-[18px] h-[18px] text-[#FFDBCA]" />
            {t("partner.rail.conciergeWhatsApp")}
          </a>
        </div>
      </div>
    </div>
  );
};