import React, { useEffect, useState } from "react";
import { Check, Clock3, RotateCcw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { bookingApi } from "../../lib/bookingApi";
import { formatLYD } from "../../lib/bookingView";
import type { CancellationQuote } from "../../types/booking";

export const RefundTimeline: React.FC<{ bookingId: string }> = ({ bookingId }) => {
  const { t } = useTranslation();
  const [quote, setQuote] = useState<CancellationQuote | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    bookingApi.cancellationQuote(bookingId, controller.signal).then((r) => setQuote(r.data.quote)).catch(() => undefined);
    return () => controller.abort();
  }, [bookingId]);

  if (!quote?.refund) return null;
  const processing = ["PROCESSING", "COMPLETED"].includes(quote.refund.status);
  const completed = quote.refund.status === "COMPLETED";

  return (
    <section className="bg-white rounded-2xl border border-blue-100 shadow-sm p-5 md:p-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="font-extrabold text-slate-950 flex items-center gap-2"><RotateCcw className="w-5 h-5 text-blue-600" />{t("refundTimeline.title")}</h2>
        <strong className="text-emerald-700" dir="ltr">{formatLYD(quote.refundableAmount)} {quote.currency}</strong>
      </div>
      <div className="grid grid-cols-3 gap-2 mt-5">
        {[
          [true, "requested"],
          [processing, "processing"],
          [completed, "completed"],
        ].map(([done, key]) => (
          <div key={String(key)} className="relative flex flex-col items-center text-center gap-2">
            <span className={`w-9 h-9 rounded-full flex items-center justify-center ${done ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-400"}`}>{done ? <Check className="w-4 h-4" /> : <Clock3 className="w-4 h-4" />}</span>
            <span className={`text-xs font-bold ${done ? "text-slate-900" : "text-slate-400"}`}>{t(`refundTimeline.${key}`)}</span>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs text-slate-500 text-center">{quote.refund.status === "FAILED" ? t("refundTimeline.failed") : completed ? t("refundTimeline.done") : t("refundTimeline.estimate")}</p>
    </section>
  );
};
