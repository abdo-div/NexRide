import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  BadgeCheck,
  ChevronRight,
  MailCheck,
  Megaphone,
  Radio,
  ShieldCheck,
} from "lucide-react";
import type {
  CompanyMessagesChannelFilter,
  CompanyMessagesCompany,
} from "../../../types/companyMessages";

interface CompanyMessagesHeaderProps {
  company: CompanyMessagesCompany | null;
  loading: boolean;
  channel: CompanyMessagesChannelFilter;
  onChannelChange: (channel: CompanyMessagesChannelFilter) => void;
  onMarkAllRead: () => void;
  onOpenBroadcast: () => void;
}

const CHANNEL_OPTIONS: {
  value: CompanyMessagesChannelFilter;
  labelKey: string;
}[] = [
  { value: "all", labelKey: "company.messagesPage.actions.allChannels" },
  { value: "INQUIRY", labelKey: "company.messagesPage.actions.channelInquiry" },
  {
    value: "ACTIVE_BOOKING",
    labelKey: "company.messagesPage.actions.channelActiveBooking",
  },
  {
    value: "POST_RENTAL_SUPPORT",
    labelKey: "company.messagesPage.actions.channelPostRental",
  },
];

export const CompanyMessagesHeader: React.FC<CompanyMessagesHeaderProps> = ({
  company,
  loading,
  channel,
  onChannelChange,
  onMarkAllRead,
  onOpenBroadcast,
}) => {
  const { t } = useTranslation();
  const [channelOpen, setChannelOpen] = useState(false);

  const activeOption =
    CHANNEL_OPTIONS.find((option) => option.value === channel) ??
    CHANNEL_OPTIONS[0];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1 text-xs font-semibold text-[#565E74]">
          <span>{t("company.messagesPage.breadcrumb")}</span>
          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="text-[#0B1C30]">{t("company.messagesPage.primary")}</span>
        </div>
        {company && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EFF4FF] px-3 py-1 text-[11px] font-semibold text-[#565E74]">
            <ShieldCheck className="h-3.5 w-3.5 text-[#2563EB]" aria-hidden="true" />
            {t("company.messagesPage.scopedTenant", { code: company.slug })}
          </span>
        )}
      </div>

      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.05)] md:flex-row md:items-center">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-[28px] font-extrabold leading-tight tracking-tight text-[#0B1C30]">
              {t("company.messagesPage.title")}
            </h1>
            <span className="text-base font-semibold text-[#565E74]">
              {t("company.messagesPage.titleAr")}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
              <BadgeCheck className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true" />
              {t("company.messagesPage.liveBadge")}
            </span>
          </div>
          <p className="text-sm text-[#565E74]">
            {t("company.messagesPage.subtitle")}{" "}
            <span className="font-medium text-[#434655]">
              {t("company.messagesPage.subtitleAr")}
            </span>
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-3">
          <div className="relative">
            <button
              type="button"
              onClick={() => setChannelOpen((open) => !open)}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl bg-[#EFF4FF] px-4 py-2.5 text-sm font-semibold text-[#0B1C30] shadow-sm transition-all hover:bg-[#E5EEFF] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
            >
              <Radio className="h-[18px] w-[18px] text-[#565E74]" aria-hidden="true" />
              {t(activeOption.labelKey)}
            </button>
            {channelOpen && (
              <>
                <button
                  type="button"
                  aria-label={t("company.messagesPage.actions.closeMenu")}
                  tabIndex={-1}
                  onClick={() => setChannelOpen(false)}
                  className="fixed inset-0 z-10 cursor-default"
                />
                <div className="absolute end-0 z-20 mt-2 w-60 rounded-xl border border-slate-200 bg-white p-1 shadow-2xl">
                  {CHANNEL_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setChannelOpen(false);
                        onChannelChange(option.value);
                      }}
                      className={`flex w-full items-center rounded-lg px-3 py-2 text-left text-[13px] font-semibold transition-colors ${
                        option.value === channel
                          ? "bg-[#EFF4FF] text-[#2563EB]"
                          : "text-[#0B1C30] hover:bg-[#F8FAFF]"
                      }`}
                    >
                      {t(option.labelKey)}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={onMarkAllRead}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-[#EFF4FF] px-4 py-2.5 text-sm font-semibold text-[#0B1C30] shadow-sm transition-all hover:bg-[#E5EEFF] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
          >
            <MailCheck className="h-[18px] w-[18px] text-[#565E74]" aria-hidden="true" />
            {t("company.messagesPage.actions.markAllRead")}
          </button>

          <button
            type="button"
            onClick={onOpenBroadcast}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-[#2563EB] px-4 py-2.5 text-sm font-bold text-white shadow-[0_4px_14px_rgba(37,99,235,0.25)] transition-all hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
          >
            <Megaphone className="h-[18px] w-[18px]" aria-hidden="true" />
            {t("company.messagesPage.actions.broadcast")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CompanyMessagesHeader;