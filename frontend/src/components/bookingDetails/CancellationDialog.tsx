import React, { useEffect, useState } from "react";
import { AlertTriangle, LoaderCircle, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { bookingApi } from "../../lib/bookingApi";
import { formatLYD } from "../../lib/bookingView";
import type { CancellationQuote } from "../../types/booking";

interface Props {
  bookingId: string;
  onClose: () => void;
  onCancelled: () => void;
}

export const CancellationDialog: React.FC<Props> = ({ bookingId, onClose, onCancelled }) => {
  const { t } = useTranslation();
  const [quote, setQuote] = useState<CancellationQuote | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    bookingApi.cancellationQuote(bookingId, controller.signal)
      .then((result) => setQuote(result.data.quote))
      .catch(() => setError(true));
    return () => controller.abort();
  }, [bookingId]);

  const confirm = async () => {
    if (!quote?.canCancel || busy) return;
    setBusy(true);
    setError(false);
    try {
      await bookingApi.cancel(bookingId, reason.trim() || undefined);
      onCancelled();
    } catch {
      setError(true);
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="cancel-title">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden">
        <div className="flex items-start justify-between gap-4 p-5 border-b border-slate-200">
          <div>
            <h2 id="cancel-title" className="font-extrabold text-lg text-slate-950">{t("cancellation.title")}</h2>
            <p className="text-sm text-slate-500 mt-1">{t("cancellation.subtitle")}</p>
          </div>
          <button type="button" onClick={onClose} aria-label={t("cancellation.close")} className="p-2 rounded-lg hover:bg-slate-100 cursor-pointer"><X className="w-5 h-5" /></button>
        </div>

        {!quote && !error ? (
          <div className="p-10 flex justify-center"><LoaderCircle className="w-7 h-7 animate-spin text-blue-600" /></div>
        ) : quote ? (
          <div className="p-5 space-y-4">
            <div className="rounded-xl bg-slate-50 border border-slate-200 divide-y divide-slate-200 text-sm">
              <div className="flex justify-between p-3"><span className="text-slate-600">{t("cancellation.paid")}</span><strong dir="ltr">{formatLYD(quote.paidAmount)} {quote.currency}</strong></div>
              <div className="flex justify-between p-3"><span className="text-slate-600">{t("cancellation.fee")}</span><strong className="text-rose-600" dir="ltr">{formatLYD(quote.cancellationFee)} {quote.currency}</strong></div>
              <div className="flex justify-between p-3"><span className="text-slate-700 font-semibold">{t("cancellation.refund")}</span><strong className="text-emerald-700 text-base" dir="ltr">{formatLYD(quote.refundableAmount)} {quote.currency}</strong></div>
            </div>
            <p className="text-xs text-slate-500 leading-5">{t("cancellation.policy", { full: quote.policy.fullRefundHours, partial: quote.policy.partialRefundHours })}</p>
            <label className="block text-sm font-semibold text-slate-700">
              {t("cancellation.reason")}
              <textarea value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} rows={3} className="mt-2 w-full resize-none rounded-xl border border-slate-300 px-3 py-2 font-normal outline-none focus:border-blue-500" placeholder={t("cancellation.reasonPlaceholder")} />
            </label>
            <div className="flex gap-2 rounded-xl bg-amber-50 text-amber-900 p-3 text-xs leading-5"><AlertTriangle className="w-5 h-5 shrink-0" /><span>{quote.refundRequired ? t("cancellation.processing") : t("cancellation.noRefund")}</span></div>
            {error && <p className="text-sm text-rose-600">{t("cancellation.error")}</p>}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <button type="button" onClick={onClose} className="py-3 rounded-xl border border-slate-300 font-bold cursor-pointer">{t("cancellation.keep")}</button>
              <button type="button" onClick={confirm} disabled={busy || !quote.canCancel} className="py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold disabled:opacity-50 cursor-pointer">{busy ? t("cancellation.cancelling") : t("cancellation.confirm")}</button>
            </div>
          </div>
        ) : (
          <div className="p-6"><p className="text-rose-600">{t("cancellation.error")}</p><button type="button" onClick={onClose} className="mt-4 px-4 py-2 border rounded-lg cursor-pointer">{t("cancellation.close")}</button></div>
        )}
      </div>
    </div>
  );
};
