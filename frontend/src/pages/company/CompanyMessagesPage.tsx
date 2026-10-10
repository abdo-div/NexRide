import React, { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Activity } from "lucide-react";
import { useCompanyMessages } from "../../hooks/useCompanyMessages";
import { CompanyMessagesHeader } from "../../components/company/messages/CompanyMessagesHeader";
import { CompanyMessagesMetrics } from "../../components/company/messages/CompanyMessagesMetrics";
import { CompanyConversationList } from "../../components/company/messages/CompanyConversationList";
import { CompanyChatThread } from "../../components/company/messages/CompanyChatThread";
import { CompanyConversationContext } from "../../components/company/messages/CompanyConversationContext";
import { CompanyBroadcastModal } from "../../components/company/messages/CompanyBroadcastModal";

/** Company Messages (Inbox) — directory, thread and renter context drawer. */
export const CompanyMessagesPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const {
    data,
    loading,
    error,
    reload,
    view,
    setView,
    channel,
    setChannel,
    q,
    setQ,
    setPage,
    activeId,
    openConversation,
    thread,
    threadLoading,
    threadError,
    reloadThread,
    draft,
    setDraft,
    sending,
    send,
    markAllRead,
    broadcasting,
    broadcast,
  } = useCompanyMessages();

  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [toast, setToast] = useState("");
  const toastTimer = useRef<number | undefined>(undefined);

  const showToast = (message: string) => {
    setToast(message);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(""), 3200);
  };

  const lang = i18n.language;

  const handleMarkAllRead = useCallback(async () => {
    const result = await markAllRead();
    showToast(
      result.ok
        ? t("company.messagesPage.toasts.markedRead")
        : result.message || t("company.messagesPage.toasts.genericError"),
    );
  }, [markAllRead, t]);

  const handleSend = useCallback(async () => {
    const result = await send(draft);
    if (!result.ok && result.message) {
      showToast(result.message);
    }
  }, [send, draft]);

  const handleBroadcast = useCallback(
    async (text: string): Promise<boolean> => {
      const result = await broadcast(text);
      if (result.ok) {
        showToast(t("company.messagesPage.toasts.broadcastSuccess"));
        return true;
      }
      showToast(result.message || t("company.messagesPage.toasts.genericError"));
      return false;
    },
    [broadcast, t],
  );

  return (
    <div className="mx-auto w-full max-w-[1440px] px-8 py-8">
      <div className="flex flex-col gap-6">
        <CompanyMessagesHeader
          company={data.company ?? null}
          loading={loading}
          channel={channel}
          onChannelChange={setChannel}
          onMarkAllRead={() => void handleMarkAllRead()}
          onOpenBroadcast={() => setBroadcastOpen(true)}
        />

        <CompanyMessagesMetrics summary={data.summary} loading={loading} />

        {error ? (
          <div className="flex h-96 flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white text-center">
            <Activity className="h-10 w-10 text-[#94A3B8]" />
            <p className="mt-4 max-w-md text-sm text-[#64748B]">
              {t("company.messagesPage.states.loadError")}
            </p>
            <button
              type="button"
              onClick={reload}
              className="mt-4 rounded-lg bg-[#2563EB] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#1D4ED8] cursor-pointer"
            >
              {t("company.messagesPage.states.retry")}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
            <div className="h-[520px] xl:col-span-4 xl:h-[660px]">
              <CompanyConversationList
                conversations={data.conversations}
                filters={data.filters}
                view={view}
                onViewChange={setView}
                loading={loading}
                activeId={activeId}
                onSelect={openConversation}
                q={q}
                onSearch={setQ}
                pagination={data.pagination}
                onPageChange={setPage}
                lang={lang}
              />
            </div>

            <div className="h-[560px] xl:col-span-5 xl:h-[660px]">
              <CompanyChatThread
                thread={
                  thread && thread.conversation.id === activeId ? thread : null
                }
                loading={threadLoading}
                error={threadError}
                hasSelection={Boolean(activeId)}
                lang={lang}
                draft={draft}
                onDraftChange={setDraft}
                sending={sending}
                onSend={() => void handleSend()}
                onRetry={reloadThread}
              />
            </div>

            <div className="hidden xl:col-span-3 xl:block xl:h-[660px]">
              <CompanyConversationContext
                thread={
                  thread && thread.conversation.id === activeId ? thread : null
                }
                lang={lang}
              />
            </div>
          </div>
        )}
      </div>

      <CompanyBroadcastModal
        open={broadcastOpen}
        sending={broadcasting}
        onClose={() => setBroadcastOpen(false)}
        onSend={handleBroadcast}
      />

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-[#0B1C30] px-4 py-3 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(8,19,31,0.35)]">
          {toast}
        </div>
      )}
    </div>
  );
};

export default CompanyMessagesPage;