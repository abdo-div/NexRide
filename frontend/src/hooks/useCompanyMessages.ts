import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiError } from "../lib/apiClient";
import { companyMessagesApi } from "../lib/companyMessagesApi";
import { EMPTY_PAGINATION } from "./usePaginatedList";
import type {
  CompanyConversationThread,
  CompanyMessagesChannelFilter,
  CompanyMessagesData,
  CompanyMessagesView,
} from "../types/companyMessages";

export const DEFAULT_MESSAGES_LIMIT = 10;

const EMPTY: CompanyMessagesData = {
  company: null,
  summary: {
    total: 0,
    active: 0,
    unreadConversations: 0,
    unreadMessages: 0,
    avgFirstReplyMinutes: null,
    satisfactionPct: null,
    satisfactionAvg: null,
  },
  filters: { total: 0, needsReply: 0, activeRentals: 0, postRental: 0 },
  conversations: [],
  pagination: EMPTY_PAGINATION,
};

export interface CompanyMessagesMutationResult {
  ok: boolean;
  message: string;
}

const errorMessage = (error: unknown): string =>
  error instanceof ApiError
    ? error.message
    : error instanceof Error
      ? error.message
      : "";

/**
 * Drives the operator Messages inbox. The KPI ribbon is always the tenant's
 * full conversation set; the directory page re-fetches on every filter change
 * (keyed on the whole filter object so a stale response can never overwrite a
 * newer one). The thread worries about its own conversation: opening it clears
 * the unread receipt server-side and mirrors the cleared badge in the local
 * list so the feed stays truthful without an extra round-trip.
 */
export const useCompanyMessages = () => {
  const [view, setViewState] = useState<CompanyMessagesView>("all");
  const [channel, setChannelState] =
    useState<CompanyMessagesChannelFilter>("all");
  const [q, setQState] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_MESSAGES_LIMIT);
  const [data, setData] = useState<CompanyMessagesData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [thread, setThread] = useState<CompanyConversationThread | null>(null);
  const [threadLoading, setThreadLoading] = useState(false);
  const [threadError, setThreadError] = useState(false);
  const [threadAttempt, setThreadAttempt] = useState(0);

  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [broadcasting, setBroadcasting] = useState(false);

  const resetPage = () => setPage(1);

  const setView = (next: CompanyMessagesView) => {
    resetPage();
    setViewState(next);
  };
  const setChannel = (next: CompanyMessagesChannelFilter) => {
    resetPage();
    setChannelState(next);
  };
  const setQ = (next: string) => {
    resetPage();
    setQState(next);
  };

  const query = useMemo(
    () => ({ view, channel, q, page, limit }),
    [view, channel, q, page, limit],
  );

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    const load = async () => {
      setLoading(true);
      setError(false);

      try {
        const response = await companyMessagesApi.list(query, controller.signal);
        if (!active) return;
        setData(response.data ?? EMPTY);
      } catch {
        if (!active) return;
        setError(true);
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();

    return () => {
      active = false;
      controller.abort();
    };
  }, [query, attempt]);

  // The thread to show is a direct user selection, or the first conversation of
  // the current directory when nothing has been opened yet. Computed during
  // render so selecting/clearing never needs a synchronous setState in an
  // effect.
  const activeId =
    selectedId ?? data.conversations[0]?.id ?? null;

  useEffect(() => {
    if (!activeId) return;
    const controller = new AbortController();
    let active = true;

    const load = async () => {
      setThreadLoading(true);
      setThreadError(false);

      try {
        const response = await companyMessagesApi.thread(
          activeId,
          controller.signal,
        );
        if (!active) return;
        setThread(response.data ?? null);
        setData((prev) => {
          const target = prev.conversations.find((c) => c.id === activeId);
          if (!target || target.unreadForCompany === 0) return prev;
          return {
            ...prev,
            conversations: prev.conversations.map((c) =>
              c.id === activeId ? { ...c, unreadForCompany: 0 } : c,
            ),
            summary: {
              ...prev.summary,
              unreadConversations: Math.max(
                0,
                prev.summary.unreadConversations - 1,
              ),
              unreadMessages: Math.max(
                0,
                prev.summary.unreadMessages - target.unreadForCompany,
              ),
            },
            filters: {
              ...prev.filters,
              needsReply: Math.max(0, prev.filters.needsReply - 1),
            },
          };
        });
      } catch {
        if (active) setThreadError(true);
      } finally {
        if (active) setThreadLoading(false);
      }
    };

    void load();

    return () => {
      active = false;
      controller.abort();
    };
  }, [activeId, threadAttempt]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);
  const reloadThread = useCallback(() => setThreadAttempt((n) => n + 1), []);

  const openConversation = (id: string) => {
    setSelectedId(id);
    setThread(null);
  };

  const clearSelection = () => {
    setSelectedId(null);
    setThread(null);
  };

  const send = useCallback(
    async (text: string): Promise<CompanyMessagesMutationResult> => {
      if (!activeId) return { ok: false, message: "" };
      const body = text.trim();
      if (!body) return { ok: false, message: "" };

      setSending(true);
      try {
        await companyMessagesApi.send(activeId, body);
        setDraft("");
        setThreadAttempt((n) => n + 1);
        setAttempt((n) => n + 1);
        return { ok: true, message: "" };
      } catch (sendError) {
        return { ok: false, message: errorMessage(sendError) };
      } finally {
        setSending(false);
      }
    },
    [activeId],
  );

  const markAllRead = useCallback(async (): Promise<CompanyMessagesMutationResult> => {
    try {
      await companyMessagesApi.markAllRead();
      setAttempt((n) => n + 1);
      setThreadAttempt((n) => n + 1);
      return { ok: true, message: "" };
    } catch (error) {
      return { ok: false, message: errorMessage(error) };
    }
  }, []);

  const broadcast = useCallback(
    async (text: string): Promise<CompanyMessagesMutationResult> => {
      const body = text.trim();
      if (!body) return { ok: false, message: "" };

      setBroadcasting(true);
      try {
        await companyMessagesApi.broadcast(body);
        setAttempt((n) => n + 1);
        return { ok: true, message: "" };
      } catch (error) {
        return { ok: false, message: errorMessage(error) };
      } finally {
        setBroadcasting(false);
      }
    },
    [],
  );

  return {
    data,
    loading,
    error,
    reload,
    reloadThread,
    view,
    setView,
    channel,
    setChannel,
    q,
    setQ,
    page,
    setPage,
    limit,
    setLimit,
    activeId,
    selectedId,
    openConversation,
    clearSelection,
    thread,
    threadLoading,
    threadError,
    draft,
    setDraft,
    sending,
    send,
    markAllRead,
    broadcasting,
    broadcast,
  };
};