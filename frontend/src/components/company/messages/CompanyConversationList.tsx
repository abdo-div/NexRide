import React from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight, Inbox, Search } from "lucide-react";
import { userPhotoUrl } from "../../../lib/customerView";
import { conversationListTime } from "../../../lib/messagesView";
import type { PaginationMeta } from "../../../types/admin";
import type {
  CompanyConversation,
  CompanyMessagesFilters,
  CompanyMessagesView,
  MessageChannel,
} from "../../../types/companyMessages";

interface CompanyConversationListProps {
  conversations: CompanyConversation[];
  filters: CompanyMessagesFilters;
  view: CompanyMessagesView;
  onViewChange: (view: CompanyMessagesView) => void;
  loading: boolean;
  activeId: string | null;
  onSelect: (id: string) => void;
  q: string;
  onSearch: (value: string) => void;
  pagination: PaginationMeta;
  onPageChange: (page: number) => void;
  lang: string;
}

const CHANNEL_LABEL_KEY: Record<MessageChannel, string> = {
  INQUIRY: "company.messagesPage.channel.inquiry",
  ACTIVE_BOOKING: "company.messagesPage.channel.activeBooking",
  POST_RENTAL_SUPPORT: "company.messagesPage.channel.postRental",
};

const PILLS: { value: CompanyMessagesView; labelKey: string }[] = [
  { value: "all", labelKey: "company.messagesPage.filters.all" },
  { value: "needsReply", labelKey: "company.messagesPage.filters.needsReply" },
  { value: "activeRentals", labelKey: "company.messagesPage.filters.activeRentals" },
  { value: "postRental", labelKey: "company.messagesPage.filters.postRental" },
];

export const CompanyConversationList: React.FC<
  CompanyConversationListProps
> = ({
  conversations,
  filters,
  view,
  onViewChange,
  loading,
  activeId,
  onSelect,
  q,
  onSearch,
  pagination,
  onPageChange,
  lang,
}) => {
  const { t } = useTranslation();

  const countFor = (value: CompanyMessagesView): number => {
    switch (value) {
      case "needsReply":
        return filters.needsReply;
      case "activeRentals":
        return filters.activeRentals;
      case "postRental":
        return filters.postRental;
      default:
        return filters.total;
    }
  };

  const from = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;
  const to = Math.min(pagination.page * pagination.limit, pagination.total);

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_4px_20px_-2px_rgba(15,23,42,0.05)]">
      {/* Search */}
      <div className="border-b border-slate-100 p-4">
        <div className="flex items-center gap-2 rounded-xl bg-[#F1F5F9] px-3 py-2.5">
          <Search className="h-4 w-4 shrink-0 text-[#565E74]" aria-hidden="true" />
          <input
            type="search"
            value={q}
            onChange={(event) => onSearch(event.target.value)}
            placeholder={t("company.messagesPage.searchPlaceholder")}
            className="w-full bg-transparent text-sm text-[#0B1C30] outline-none placeholder:text-[#8A93A6]"
          />
        </div>

        {/* Filter pills */}
        <div className="mt-3 flex flex-wrap gap-2">
          {PILLS.map((pill) => (
            <button
              key={pill.value}
              type="button"
              onClick={() => onViewChange(pill.value)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors cursor-pointer ${
                view === pill.value
                  ? "bg-[#2563EB] text-white"
                  : "bg-[#EFF4FF] text-[#434655] hover:bg-[#E5EEFF]"
              }`}
            >
              {t(pill.labelKey)}
              <span
                className={`rounded-full px-1.5 text-[11px] font-bold ${
                  view === pill.value
                    ? "bg-white/25 text-white"
                    : "bg-white text-[#565E74]"
                }`}
              >
                {countFor(pill.value)}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto">
        {loading && conversations.length === 0 ? (
          <div className="space-y-3 p-4">
            {[0, 1, 2, 3, 4].map((row) => (
              <div key={row} className="flex gap-3">
                <div className="h-11 w-11 shrink-0 animate-pulse rounded-full bg-[#E5EEFF]" />
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-3 w-1/2 animate-pulse rounded-full bg-[#E5EEFF]" />
                  <div className="h-3 w-3/4 animate-pulse rounded-full bg-[#F1F5F9]" />
                </div>
              </div>
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-6 py-16 text-center">
            <Inbox className="h-10 w-10 text-[#94A3B8]" aria-hidden="true" />
            <p className="mt-4 text-sm font-semibold text-[#434655]">
              {t("company.messagesPage.list.empty")}
            </p>
            <p className="mt-1 max-w-xs text-[12px] text-[#8A93A6]">
              {t("company.messagesPage.list.emptyHint")}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {conversations.map((conversation) => {
              const photo = userPhotoUrl(conversation.customer.photo ?? undefined);
              const isActive = conversation.id === activeId;
              return (
                <li key={conversation.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(conversation.id)}
                    className={`flex w-full gap-3 p-4 text-left transition-colors cursor-pointer ${
                      isActive ? "bg-[#EFF4FF]" : "hover:bg-[#F8FAFF]"
                    }`}
                  >
                    {photo ? (
                      <img
                        src={photo}
                        alt={conversation.customer.name}
                        className="h-11 w-11 shrink-0 rounded-full border border-slate-200 object-cover"
                      />
                    ) : (
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#2563EB] text-sm font-bold text-white">
                        {conversation.customer.initials}
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-bold text-[#0B1C30]">
                          {conversation.customer.name}
                        </span>
                        <span className="shrink-0 text-[11px] text-[#8A93A6]">
                          {conversationListTime(conversation.lastMessage.at, lang)}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-[13px] font-semibold text-[#434655]">
                        {conversation.subject}
                      </p>
                      <p className="mt-0.5 truncate text-[12px] text-[#8A93A6]">
                        {conversation.lastMessage.preview ||
                          t("company.messagesPage.list.noMessages")}
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="inline-flex items-center rounded-full bg-[#F1F5F9] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#565E74]">
                          {t(CHANNEL_LABEL_KEY[conversation.channel])}
                        </span>
                        {conversation.booking && (
                          <span className="truncate text-[11px] font-semibold text-[#2563EB]">
                            {conversation.booking.reference}
                          </span>
                        )}
                        {conversation.unreadForCompany > 0 && (
                          <span className="ms-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#DC2626] px-1.5 text-[11px] font-bold text-white">
                            {conversation.unreadForCompany}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-4 py-3">
        <span className="text-[11px] text-[#8A93A6]">
          {t("company.messagesPage.list.range", {
            from,
            to,
            total: pagination.total,
          })}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onPageChange(pagination.page - 1)}
            disabled={!pagination.hasPreviousPage}
            aria-label={t("company.messagesPage.list.previous")}
            className="rounded-lg border border-slate-200 p-1.5 text-[#565E74] transition-colors hover:bg-[#F1F5F9] disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => onPageChange(pagination.page + 1)}
            disabled={!pagination.hasNextPage}
            aria-label={t("company.messagesPage.list.next")}
            className="rounded-lg border border-slate-200 p-1.5 text-[#565E74] transition-colors hover:bg-[#F1F5F9] disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
          >
            <ChevronRight className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CompanyConversationList;