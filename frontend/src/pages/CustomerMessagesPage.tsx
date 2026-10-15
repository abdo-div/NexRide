import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import { Building2, LoaderCircle, Mail, MessageCircle, Send } from "lucide-react";
import { customerMessagesApi } from "../lib/customerMessagesApi";
import { companyLogoUrl } from "../lib/vehicleMapper";
import type {
  CustomerConversation,
  CustomerConversationThread,
} from "../types/customerMessages";

const copy = {
  en: {
    title: "Messages",
    subtitle: "Talk directly with the rental company about your booking.",
    inbox: "Conversations",
    empty: "No conversations yet",
    emptyHint: "A conversation will appear here when a rental company messages you.",
    select: "Select a conversation to read and reply.",
    booking: "Booking",
    type: "Write a reply…",
    send: "Send",
    loadError: "We couldn't load your messages. Please try again.",
    sendError: "Your reply could not be sent. Please try again.",
  },
  ar: {
    title: "الرسائل",
    subtitle: "تواصل مباشرةً مع شركة التأجير بخصوص حجزك.",
    inbox: "المحادثات",
    empty: "لا توجد محادثات بعد",
    emptyHint: "ستظهر المحادثة هنا عندما ترسل لك شركة التأجير رسالة.",
    select: "اختر محادثة لقراءتها والرد عليها.",
    booking: "الحجز",
    type: "اكتب ردك…",
    send: "إرسال",
    loadError: "تعذر تحميل الرسائل. يرجى المحاولة مرة أخرى.",
    sendError: "تعذر إرسال ردك. يرجى المحاولة مرة أخرى.",
  },
};

const formatTime = (value: string | null | undefined, language: string) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(language === "ar" ? "ar-LY" : "en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const stringOrNull = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value : null;

const normalizeConversation = (value: unknown): CustomerConversation | null => {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const id = stringOrNull(raw.id);
  if (!id) return null;
  const rawCompany = raw.company && typeof raw.company === "object"
    ? (raw.company as Record<string, unknown>)
    : {};
  const rawLast = raw.lastMessage && typeof raw.lastMessage === "object"
    ? (raw.lastMessage as Record<string, unknown>)
    : {};
  const rawBooking = raw.booking && typeof raw.booking === "object"
    ? (raw.booking as Record<string, unknown>)
    : null;
  const rawVehicle = rawBooking?.vehicle && typeof rawBooking.vehicle === "object"
    ? (rawBooking.vehicle as Record<string, unknown>)
    : null;

  return {
    id,
    subject: stringOrNull(raw.subject) ?? "",
    status: raw.status === "RESOLVED" || raw.status === "ARCHIVED" ? raw.status : "OPEN",
    unreadForCustomer:
      typeof raw.unreadForCustomer === "number" && Number.isFinite(raw.unreadForCustomer)
        ? Math.max(0, raw.unreadForCustomer)
        : 0,
    lastMessage: {
      preview: stringOrNull(rawLast.preview) ?? "",
      at: stringOrNull(rawLast.at),
      sender: stringOrNull(rawLast.sender) ?? "system",
    },
    company: {
      id: stringOrNull(rawCompany.id),
      name: stringOrNull(rawCompany.name) ?? "Rental company",
      logo: stringOrNull(rawCompany.logo),
      phone: stringOrNull(rawCompany.phone),
      city: stringOrNull(rawCompany.city),
    },
    booking: rawBooking
      ? {
          id: stringOrNull(rawBooking.id) ?? "",
          status: stringOrNull(rawBooking.status) ?? "",
          pickupLocation: stringOrNull(rawBooking.pickupLocation),
          startDate: stringOrNull(rawBooking.startDate),
          endDate: stringOrNull(rawBooking.endDate),
          vehicle: rawVehicle
            ? {
                make: stringOrNull(rawVehicle.make) ?? "",
                model: stringOrNull(rawVehicle.model) ?? "",
                year: typeof rawVehicle.year === "number" ? rawVehicle.year : 0,
                photo: stringOrNull(rawVehicle.photo),
              }
            : null,
        }
      : null,
  };
};

export default function CustomerMessagesPage() {
  const { i18n } = useTranslation();
  const language = i18n.language.startsWith("ar") ? "ar" : "en";
  const text = copy[language];
  const [searchParams] = useSearchParams();
  const bookingTarget = searchParams.get("booking");
  const [conversations, setConversations] = useState<CustomerConversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [thread, setThread] = useState<CustomerConversationThread | null>(null);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const loadInbox = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await customerMessagesApi.list(signal);
      const rows = Array.isArray(response?.data?.conversations)
        ? response.data.conversations
            .map((item) => normalizeConversation(item))
            .filter((item): item is CustomerConversation => item !== null)
        : [];
      setConversations(rows);
      setSelectedId((current) => {
        if (current && rows.some((item) => item.id === current)) return current;
        const bookingMatch = bookingTarget
          ? rows.find((item) => item.booking?.id === bookingTarget)
          : null;
        return bookingMatch?.id ?? rows[0]?.id ?? null;
      });
      setError("");
    } catch (caught) {
      if (!(caught instanceof DOMException && caught.name === "AbortError")) setError(text.loadError);
    } finally {
      setLoading(false);
    }
  }, [bookingTarget, text.loadError]);

  const loadThread = useCallback(async (id: string, signal?: AbortSignal) => {
    try {
      const response = await customerMessagesApi.thread(id, signal);
      const nextConversation = normalizeConversation(response?.data?.conversation);
      const nextMessages = Array.isArray(response?.data?.messages)
        ? response.data.messages.filter(
            (message) =>
              message &&
              typeof message.id === "string" &&
              typeof message.body === "string",
          )
        : null;
      if (!nextConversation || !nextMessages) {
        throw new Error("Invalid conversation response");
      }
      setThread({ conversation: nextConversation, messages: nextMessages });
      setConversations((rows) =>
        rows.map((row) => (row.id === id ? { ...row, unreadForCustomer: 0 } : row)),
      );
      setError("");
    } catch (caught) {
      if (!(caught instanceof DOMException && caught.name === "AbortError")) setError(text.loadError);
    }
  }, [text.loadError]);

  useEffect(() => {
    const controller = new AbortController();
    void loadInbox(controller.signal);
    return () => controller.abort();
  }, [loadInbox]);

  useEffect(() => {
    if (!selectedId) {
      setThread(null);
      return;
    }
    const controller = new AbortController();
    void loadThread(selectedId, controller.signal);
    return () => controller.abort();
  }, [selectedId, loadThread]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void loadInbox();
      if (selectedId) void loadThread(selectedId);
    }, 15000);
    return () => window.clearInterval(timer);
  }, [loadInbox, loadThread, selectedId]);

  const sendReply = async () => {
    const body = draft.trim();
    if (!body || !selectedId || sending) return;
    setSending(true);
    try {
      const response = await customerMessagesApi.send(selectedId, body);
      if (response?.data?.message) {
        setThread((current) =>
          current
            ? { ...current, messages: [...current.messages, response.data.message] }
            : current,
        );
      } else {
        await loadThread(selectedId);
      }
      setDraft("");
      void loadInbox();
    } catch {
      setError(text.sendError);
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="min-h-screen bg-slate-50 px-4 pb-16 pt-28 sm:px-6 lg:px-8" dir={language === "ar" ? "rtl" : "ltr"}>
      <div className="mx-auto max-w-7xl">
        <div className="mb-7">
          <h1 className="flex items-center gap-3 text-3xl font-black text-slate-950">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#142B4A] text-white"><MessageCircle className="h-5 w-5" /></span>
            {text.title}
          </h1>
          <p className="mt-2 text-slate-500">{text.subtitle}</p>
        </div>

        {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}

        <div className="grid min-h-[620px] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm lg:grid-cols-[360px_1fr]">
          <aside className="border-b border-slate-200 lg:border-b-0 lg:border-e">
            <div className="border-b border-slate-100 px-5 py-4 text-sm font-extrabold text-slate-900">{text.inbox}</div>
            {loading ? (
              <div className="grid h-56 place-items-center"><LoaderCircle className="h-7 w-7 animate-spin text-slate-400" /></div>
            ) : conversations.length === 0 ? (
              <div className="px-7 py-16 text-center">
                <Mail className="mx-auto h-10 w-10 text-slate-300" />
                <p className="mt-4 font-bold text-slate-800">{text.empty}</p>
                <p className="mt-2 text-sm leading-6 text-slate-500">{text.emptyHint}</p>
              </div>
            ) : (
              <div className="max-h-[620px] overflow-y-auto">
                {conversations.map((item) => (
                  <button key={item.id} type="button" onClick={() => setSelectedId(item.id)} className={`w-full border-b border-slate-100 px-5 py-4 text-start transition ${selectedId === item.id ? "bg-blue-50" : "hover:bg-slate-50"}`}>
                    <div className="flex items-center gap-3">
                      <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full bg-slate-100">
                        {companyLogoUrl(item.company.logo) ? <img src={companyLogoUrl(item.company.logo) ?? ""} alt="" className="h-full w-full object-cover" /> : <Building2 className="h-5 w-5 text-slate-500" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate font-extrabold text-slate-900">{item.company.name || (language === "ar" ? "شركة التأجير" : "Rental company")}</p>
                          {item.unreadForCustomer > 0 && <span className="grid min-w-5 place-items-center rounded-full bg-blue-600 px-1.5 py-0.5 text-[11px] font-bold text-white">{item.unreadForCustomer}</span>}
                        </div>
                        <p className="mt-1 truncate text-sm text-slate-500">{item.lastMessage.preview || item.subject}</p>
                        <p className="mt-1 text-xs text-slate-400">{formatTime(item.lastMessage.at, language)}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </aside>

          {!thread ? (
            <div className="hidden place-items-center p-8 text-center text-slate-500 lg:grid">
              <div><MessageCircle className="mx-auto mb-4 h-12 w-12 text-slate-200" /><p>{text.select}</p></div>
            </div>
          ) : (
            <div className="flex min-h-[620px] min-w-0 flex-col">
              <header className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-7">
                <div>
                  <h2 className="font-black text-slate-950">{thread.conversation.company.name}</h2>
                  <p className="mt-1 text-xs text-slate-500">
                    {thread.conversation.booking?.vehicle ? `${thread.conversation.booking.vehicle.year ?? ""} ${thread.conversation.booking.vehicle.make ?? ""} ${thread.conversation.booking.vehicle.model ?? ""}`.trim() : thread.conversation.subject}
                    {thread.conversation.booking?.id && ` · ${text.booking} ${thread.conversation.booking.id.slice(-7).toUpperCase()}`}
                  </p>
                </div>
              </header>
              <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50/60 p-5 sm:p-7">
                {thread.messages.map((message) => {
                  const mine = message.senderRole === "CUSTOMER";
                  const system = message.senderRole === "SYSTEM";
                  return system ? (
                    <div key={message.id} className="mx-auto max-w-xl rounded-xl bg-slate-200/70 px-4 py-2 text-center text-xs text-slate-600">{message.body}</div>
                  ) : (
                    <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${mine ? "rounded-ee-md bg-[#142B4A] text-white" : "rounded-es-md border border-slate-200 bg-white text-slate-800"}`}>
                        {!mine && <p className="mb-1 text-xs font-bold text-blue-600">{message.senderName || thread.conversation.company.name}</p>}
                        <p className="whitespace-pre-wrap text-sm leading-6">{message.body}</p>
                        <p className={`mt-1 text-[11px] ${mine ? "text-blue-200" : "text-slate-400"}`}>{formatTime(message.createdAt, language)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="border-t border-slate-200 bg-white p-4 sm:p-5">
                <div className="flex items-end gap-3">
                  <textarea value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void sendReply(); } }} rows={2} maxLength={2000} placeholder={text.type} className="min-h-[54px] flex-1 resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100" />
                  <button type="button" onClick={() => void sendReply()} disabled={!draft.trim() || sending} className="inline-flex h-[54px] items-center gap-2 rounded-2xl bg-[#142B4A] px-5 font-bold text-white transition hover:bg-[#1c3b63] disabled:cursor-not-allowed disabled:opacity-45">
                    {sending ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                    <span className="hidden sm:inline">{text.send}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

