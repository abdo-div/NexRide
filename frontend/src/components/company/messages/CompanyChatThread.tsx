import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  Activity,
  Car,
  Compass,
  MessageSquareText,
  Send,
  Sparkles,
  Zap,
} from "lucide-react";
import { userPhotoUrl } from "../../../lib/customerView";
import { formatLYD } from "../../../lib/bookingView";
import {
  messageDayLabel,
  messageTimeLabel,
  rangeLabel,
} from "../../../lib/messagesView";
import type {
  CompanyChatMessage,
  CompanyConversationThread,
  MessageChannel,
} from "../../../types/companyMessages";

interface CompanyChatThreadProps {
  thread: CompanyConversationThread | null;
  loading: boolean;
  error: boolean;
  hasSelection: boolean;
  lang: string;
  draft: string;
  onDraftChange: (value: string) => void;
  sending: boolean;
  onSend: () => void;
  onRetry: () => void;
}

const CHANNEL_LABEL_KEY: Record<MessageChannel, string> = {
  INQUIRY: "company.messagesPage.channel.inquiry",
  ACTIVE_BOOKING: "company.messagesPage.channel.activeBooking",
  POST_RENTAL_SUPPORT: "company.messagesPage.channel.postRental",
};

const TEMPLATE_KEYS = [
  "company.messagesPage.templates.showroom",
  "company.messagesPage.templates.airportMeet",
  "company.messagesPage.templates.fuelPolicy",
  "company.messagesPage.templates.escrow",
];

const vehicleTitle = (thread: CompanyConversationThread): string => {
  const vehicle = thread.conversation.booking?.vehicle;
  if (!vehicle) return "";
  const base = [vehicle.make, vehicle.model].filter(Boolean).join(" ");
  if (!base) return "";
  return vehicle.year ? `${base} (${vehicle.year})` : base;
};

export const CompanyChatThread: React.FC<CompanyChatThreadProps> = ({
  thread,
  loading,
  error,
  hasSelection,
  lang,
  draft,
  onDraftChange,
  sending,
  onSend,
  onRetry,
}) => {
  const { t } = useTranslation();

  const rows = useMemo(() => {
    const messages = thread?.messages ?? [];
    const output: { message: CompanyChatMessage; dayLabel: string | null }[] = [];
    let lastDay = "";
    for (const message of messages) {
      const day = message.createdAt?.slice(0, 10) ?? "";
      const showDay = Boolean(day) && day !== lastDay;
      if (showDay) lastDay = day;
      output.push({
        message,
        dayLabel: showDay ? messageDayLabel(message.createdAt, lang) : null,
      });
    }
    return output;
  }, [thread, lang]);

  if (!hasSelection) {
    return (
      <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white px-8 text-center shadow-[0_4px_20px_-2px_rgba(15,23,42,0.05)]">
        <MessageSquareText className="h-12 w-12 text-[#94A3B8]" aria-hidden="true" />
        <p className="mt-4 text-base font-bold text-[#0B1C30]">
          {t("company.messagesPage.thread.selectTitle")}
        </p>
        <p className="mt-1 max-w-xs text-sm text-[#8A93A6]">
          {t("company.messagesPage.thread.selectHint")}
        </p>
      </div>
    );
  }

  if (loading && !thread) {
    return (
      <div className="flex h-full flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.05)]">
        <div className="h-6 w-1/3 animate-pulse rounded-full bg-[#E5EEFF]" />
        <div className="h-16 animate-pulse rounded-xl bg-[#F1F5F9]" />
        <div className="mt-2 space-y-4">
          <div className="h-14 w-2/3 animate-pulse rounded-2xl bg-[#E5EEFF]" />
          <div className="ms-auto h-14 w-1/2 animate-pulse rounded-2xl bg-[#F1F5F9]" />
          <div className="h-20 w-3/4 animate-pulse rounded-2xl bg-[#E5EEFF]" />
        </div>
      </div>
    );
  }

  if (error && !thread) {
    return (
      <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white text-center shadow-[0_4px_20px_-2px_rgba(15,23,42,0.05)]">
        <Activity className="h-10 w-10 text-[#94A3B8]" aria-hidden="true" />
        <p className="mt-4 max-w-md text-sm text-[#64748B]">
          {t("company.messagesPage.states.loadError")}
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 rounded-lg bg-[#2563EB] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#1D4ED8] cursor-pointer"
        >
          {t("company.messagesPage.states.retry")}
        </button>
      </div>
    );
  }

  if (!thread) return null;

  const { conversation } = thread;
  const { customer, booking } = conversation;
  const avatar = userPhotoUrl(customer.photo ?? undefined);
  const vehicle = vehicleTitle(thread);

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_4px_20px_-2px_rgba(15,23,42,0.05)]">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-slate-100 p-4">
        {avatar ? (
          <img
            src={avatar}
            alt={customer.name}
            className="h-11 w-11 shrink-0 rounded-full border border-slate-200 object-cover"
          />
        ) : (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#2563EB] text-sm font-bold text-white">
            {customer.initials}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate text-sm font-bold text-[#0B1C30]">
              {customer.name}
            </span>
            <span className="inline-flex items-center rounded-full bg-[#EFF4FF] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#2563EB]">
              {t(CHANNEL_LABEL_KEY[conversation.channel])}
            </span>
          </div>
          {vehicle && (
            <p className="mt-0.5 truncate text-[12px] text-[#8A93A6]">{vehicle}</p>
          )}
        </div>
      </div>

      {/* Booking strip */}
      {booking && (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-slate-100 bg-[#F8FAFF] px-4 py-3 text-[12px]">
          <span className="font-bold text-[#2563EB]">{booking.reference}</span>
          <span className="font-semibold text-[#434655]">
            {rangeLabel(booking.startDate, booking.endDate, lang)}
          </span>
          {booking.pickupLocation && (
            <span className="text-[#565E74]">{booking.pickupLocation}</span>
          )}
          {booking.totalAmount !== null && (
            <span className="font-semibold text-[#0B1C30]">
              {formatLYD(booking.totalAmount)} LYD
            </span>
          )}
        </div>
      )}

      {/* Message stream */}
      <div className="flex-1 space-y-4 overflow-y-auto bg-[#F8FAFC] p-4">
        {rows.map(({ message, dayLabel }) => (
          <React.Fragment key={message.id}>
            {dayLabel && (
              <div className="flex items-center justify-center">
                <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-[#8A93A6] shadow-sm">
                  {dayLabel}
                </span>
              </div>
            )}

            {message.kind === "SYSTEM" ? (
              <div className="flex justify-center">
                <div className="flex max-w-md items-start gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-center shadow-sm">
                  <Zap className="mt-0.5 h-4 w-4 shrink-0 text-[#D97706]" aria-hidden="true" />
                  <div>
                    <p className="text-[13px] font-medium text-[#434655]">
                      {message.body}
                    </p>
                    <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-[#8A93A6]">
                      {messageTimeLabel(message.createdAt, lang)}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div
                className={`flex ${
                  message.senderRole === "AGENT" ? "justify-end" : "justify-start"
                }`}
              >
                <div className="max-w-[80%]">
                  <div
                    className={`rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed shadow-sm ${
                      message.senderRole === "AGENT"
                        ? "rounded-tr-sm bg-[#2563EB] text-white"
                        : "rounded-tl-sm border border-slate-200 bg-white text-[#0B1C30]"
                    }`}
                  >
                    {message.senderRole === "CUSTOMER" && message.senderName && (
                      <p className="mb-1 text-[11px] font-bold text-[#2563EB]">
                        {message.senderName}
                      </p>
                    )}
                    <p className="whitespace-pre-wrap break-words">{message.body}</p>
                  </div>
                  <p
                    className={`mt-1 text-[10px] text-[#8A93A6] ${
                      message.senderRole === "AGENT" ? "text-end" : "text-start"
                    }`}
                  >
                    {messageTimeLabel(message.createdAt, lang)}
                  </p>
                </div>
              </div>
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Canned replies */}
      <div className="border-t border-slate-100 px-4 pt-3">
        <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-[#8A93A6]">
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          {t("company.messagesPage.thread.templatesLabel")}
        </div>
        <div className="flex gap-2 overflow-x-auto pb-3">
          {TEMPLATE_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => onDraftChange(t(key))}
              className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-[#434655] transition-colors hover:border-[#2563EB] hover:text-[#2563EB] cursor-pointer"
            >
              {t(key)}
            </button>
          ))}
        </div>
      </div>

      {/* Composer */}
      <div className="border-t border-slate-100 p-4">
        <div className="flex items-end gap-3">
          <textarea
            value={draft}
            onChange={(event) => onDraftChange(event.target.value)}
            rows={2}
            placeholder={t("company.messagesPage.thread.composerPlaceholder")}
            className="max-h-32 min-h-[44px] flex-1 resize-y rounded-xl border border-slate-200 bg-[#F8FAFC] px-3 py-2.5 text-[13px] text-[#0B1C30] outline-none transition-colors focus:border-[#2563EB] focus:bg-white"
          />
          <button
            type="button"
            onClick={onSend}
            disabled={sending || draft.trim().length === 0}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#2563EB] px-5 text-sm font-bold text-white shadow-[0_4px_14px_rgba(37,99,235,0.25)] transition-colors hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
          >
            <Send className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
            {t("company.messagesPage.thread.send")}
          </button>
        </div>
        <div className="mt-2 flex items-center gap-1.5 text-[11px] text-[#8A93A6]">
          <Car className="h-3.5 w-3.5" aria-hidden="true" />
          {t("company.messagesPage.thread.composerHint")}
          <Compass className="ms-auto h-3.5 w-3.5" aria-hidden="true" />
          {t("company.messagesPage.thread.replyAs")}
        </div>
      </div>
    </div>
  );
};

export default CompanyChatThread;