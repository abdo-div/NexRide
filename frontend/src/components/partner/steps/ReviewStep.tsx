import React, { type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { ClipboardCheck } from "lucide-react";
import type {
  DocumentDraft,
  PartnerApplicationDraft,
} from "../../../types/companyApplication";
import { HUB_LABELS } from "../../../lib/partnerApplicationView";

interface Props {
  draft: PartnerApplicationDraft;
  documents: DocumentDraft[];
  agreed: boolean;
  setAgreed: (value: boolean) => void;
  errors: Record<string, string>;
}

const SummaryRow: React.FC<{ label: string; value: ReactNode }> = ({
  label,
  value,
}) => (
  <div className="flex items-start justify-between gap-4 py-2.5 border-b border-[#E5EEFF] last:border-0">
    <span className="text-[11px] font-bold uppercase tracking-wider text-[#737686] shrink-0">
      {label}
    </span>
    <span className="text-[13px] font-semibold text-[#0B1C30] text-right">
      {value}
    </span>
  </div>
);

export const ReviewStep: React.FC<Props> = ({
  draft,
  documents,
  agreed,
  setAgreed,
  errors,
}) => {
  const { t } = useTranslation();
  const { applicant, company, fleet, hubs, payout } = draft;
  const uploaded = documents.filter((doc) => doc.file);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-[#2563EB] text-white flex items-center justify-center shrink-0">
          <ClipboardCheck className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-base font-bold text-[#0B1C30]">{t("partner.step6.title")}</h3>
          <p className="text-[13px] text-[#434655]">{t("partner.step6.subtitle")}</p>
        </div>
      </div>

      <div className="rounded-xl bg-[#F8F9FF] border border-[#E5EEFF] px-5 py-2">
        <SummaryRow
          label={t("partner.step6.summary.applicant")}
          value={
            <>
              {applicant.name} · <span dir="ltr">{applicant.email}</span> ·{" "}
              <span dir="ltr">{applicant.phoneNumber}</span>
            </>
          }
        />
        <SummaryRow
          label={t("partner.step6.summary.company")}
          value={`${company.name} · ${company.commercialRegisterNumber} · ${company.city}`}
        />
        <SummaryRow
          label={t("partner.step6.summary.rentalBusiness")}
          value={
            <>
              {t(`partner.step3.tierValues.${fleet.tier}`)}{" "}
              {t(`partner.step3.tiers.${fleet.tier}`)}
            </>
          }
        />
        <SummaryRow
          label={t("partner.step6.summary.categories")}
          value={fleet.categories.map((item) => t(`partner.step3.categoryOptions.${item}`)).join(", ")}
        />
        <SummaryRow
          label={t("partner.step6.summary.hubs")}
          value={t("partner.step6.summary.hubsCount", {
            count: hubs.active.length,
          })}
        />
        <SummaryRow
          label={t("partner.step6.summary.depots")}
          value={t("partner.step6.summary.depotsCount", {
            count: hubs.depots.length,
          })}
        />
        {hubs.active.length > 0 ? (
          <SummaryRow
            label={t("partner.step6.summary.policy")}
            value={hubs.active.map((hub) => HUB_LABELS[hub]).join(", ")}
          />
        ) : null}
        <SummaryRow
          label={t("partner.step6.summary.payout")}
          value={`${payout.bankName} · ${payout.iban} · ${payout.accountName}`}
        />
        <SummaryRow
          label={t("partner.step6.summary.documents")}
          value={t("partner.step6.summary.documentCount", {
            count: uploaded.length,
          })}
        />
      </div>

      <label className="flex items-start gap-3 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(event) => setAgreed(event.target.checked)}
          className="w-4 h-4 mt-0.5 accent-[#2563EB]"
        />
        <span className="text-[13px] text-[#0B1C30] leading-relaxed">
          {t("partner.step6.agreementLabel")}
        </span>
      </label>
      {errors.agreement ? (
        <span className="text-[11px] font-semibold text-[#BA1A1A]">{errors.agreement}</span>
      ) : null}
    </div>
  );
};