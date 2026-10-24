import React, { useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, LoaderCircle, MessageCircle, Send, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { supportApi } from "../../lib/supportApi";
import type { SupportCategory, SupportTicket } from "../../types/support";

const categories: SupportCategory[] = [
  "BOOKING_CHANGE",
  "PAYMENT",
  "PICKUP_RETURN",
  "VEHICLE",
  "REFUND",
  "OTHER",
];

export const BookingSupportDialog: React.FC<{ bookingId: string; onClose: () => void }> = ({ bookingId, onClose }) => {
  const { t, i18n } = useTranslation();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [category, setCategory] = useState<SupportCategory>("BOOKING_CHANGE");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [urgent, setUrgent] = useState(false);

  const selected = useMemo(
    () => tickets.find((ticket) => ticket._id === selectedId) ?? null,
    [tickets, selectedId],
  );

  useEffect(() => {
    const controller = new AbortController();
    supportApi.listForBooking(bookingId, controller.signal)
      .then((result) => {
        setTickets(result.data.tickets);
        setSelectedId(result.data.tickets[0]?._id ?? null);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [bookingId]);

  const submit = async () => {
    if (busy || !message.trim()) return;
    setBusy(true);
    setError(false);
    try {
      if (selected) {
        const result = await supportApi.reply(selected._id, message.trim());
        setTickets((items) => items.map((item) => item._id === selected._id ? result.data.ticket : item));
      } else {
        const result = await supportApi.create({
          bookingId,
          category,
          subject: subject.trim(),
          message: message.trim(),
          priority: urgent ? "URGENT" : "NORMAL",
        });
        setTickets((items) => [result.data.ticket, ...items]);
        setSelectedId(result.data.ticket._id);
      }
      setMessage("");
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };

  const closeTicket = async () => {
    if (!selected || busy) return;
    setBusy(true);
    try {
      const result = await supportApi.updateStatus(selected._id, "CLOSED");
      setTickets((items) => items.map((item) => item._id === selected._id ? result.data.ticket : item));
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="support-title">
      <div className="bg-white w-full max-w-2xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        <header className="p-5 border-b border-slate-200 flex items-start justify-between gap-4">
          <div><h2 id="support-title" className="font-extrabold text-lg text-slate-950">{t("bookingSupport.title")}</h2><p className="text-sm text-slate-500 mt-1">{t("bookingSupport.subtitle")}</p></div>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 cursor-pointer" aria-label={t("bookingSupport.close")}><X className="w-5 h-5" /></button>
        </header>

        {loading ? <div className="p-16 flex justify-center"><LoaderCircle className="w-7 h-7 animate-spin text-blue-600" /></div> : (
          <div className="p-5 overflow-y-auto space-y-4">
            {tickets.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {tickets.map((ticket) => <button key={ticket._id} type="button" onClick={() => setSelectedId(ticket._id)} className={`shrink-0 rounded-xl border px-3 py-2 text-start cursor-pointer ${selectedId === ticket._id ? "border-blue-600 bg-blue-50" : "border-slate-200"}`}><span className="block text-xs font-black text-slate-900" dir="ltr">{ticket.reference}</span><span className="text-[11px] text-slate-500">{t(`bookingSupport.status.${ticket.status}`)}</span></button>)}
                <button type="button" onClick={() => setSelectedId(null)} className="shrink-0 rounded-xl border border-dashed border-slate-300 px-4 text-sm font-bold text-blue-700 cursor-pointer">+ {t("bookingSupport.new")}</button>
              </div>
            )}

            {selected ? (
              <>
                <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3"><div><strong className="text-sm text-slate-950">{selected.subject}</strong><span className="block text-xs text-slate-500 mt-0.5" dir="ltr">{selected.reference}</span></div><span className="rounded-full bg-blue-100 text-blue-800 px-2.5 py-1 text-xs font-bold">{t(`bookingSupport.status.${selected.status}`)}</span></div>
                <div className="space-y-3 max-h-72 overflow-y-auto rounded-xl border border-slate-200 p-3">
                  {selected.messages.map((item) => <div key={item._id} className={`flex ${item.authorRole === "customer" ? "justify-end" : "justify-start"}`}><div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${item.authorRole === "customer" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-800"}`}><span className="block text-[10px] font-bold opacity-70 mb-1">{item.authorRole === "customer" ? t("bookingSupport.you") : t("bookingSupport.team")}</span><p className="whitespace-pre-wrap">{item.body}</p><time className="block text-[10px] opacity-60 mt-1" dir="ltr">{new Date(item.sentAt).toLocaleString(i18n.language)}</time></div></div>)}
                </div>
              </>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                <label className="text-sm font-bold text-slate-700">{t("bookingSupport.category")}<select value={category} onChange={(e) => setCategory(e.target.value as SupportCategory)} className="mt-2 w-full h-11 rounded-xl border border-slate-300 px-3 bg-white font-normal">{categories.map((item) => <option key={item} value={item}>{t(`bookingSupport.categories.${item}`)}</option>)}</select></label>
                <label className="text-sm font-bold text-slate-700">{t("bookingSupport.subject")}<input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={120} className="mt-2 w-full h-11 rounded-xl border border-slate-300 px-3 font-normal" /></label>
                <label className="sm:col-span-2 flex items-center gap-2 text-sm text-rose-700"><input type="checkbox" checked={urgent} onChange={(e) => setUrgent(e.target.checked)} />{t("bookingSupport.urgent")}</label>
              </div>
            )}

            {selected?.status !== "CLOSED" && <label className="block text-sm font-bold text-slate-700">{selected ? t("bookingSupport.reply") : t("bookingSupport.message")}<textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} maxLength={2000} className="mt-2 w-full resize-none rounded-xl border border-slate-300 p-3 font-normal" /></label>}
            {error && <p className="flex items-center gap-2 text-sm text-rose-600"><AlertCircle className="w-4 h-4" />{t("bookingSupport.error")}</p>}
            <div className="flex items-center justify-between gap-3">
              {selected && selected.status !== "CLOSED" ? <button type="button" onClick={closeTicket} disabled={busy} className="text-sm font-bold text-slate-500 hover:text-slate-900 cursor-pointer"><CheckCircle2 className="w-4 h-4 inline me-1" />{t("bookingSupport.closeRequest")}</button> : <span />}
              {selected?.status !== "CLOSED" && <button type="button" onClick={submit} disabled={busy || !message.trim() || (!selected && subject.trim().length < 3)} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-3 disabled:opacity-50 cursor-pointer">{busy ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}{selected ? t("bookingSupport.send") : t("bookingSupport.create")}</button>}
            </div>
            {!selected && tickets.length === 0 && <p className="text-xs text-slate-500 flex items-center gap-2"><MessageCircle className="w-4 h-4" />{t("bookingSupport.firstResponse")}</p>}
          </div>
        )}
      </div>
    </div>
  );
};
