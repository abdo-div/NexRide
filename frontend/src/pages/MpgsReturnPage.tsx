import React, { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router";
import { CheckCircle2, Clock3, ShieldCheck, XCircle } from "lucide-react";
import { mpgsApi } from "../lib/mpgsApi";
import { forgetMpgsAttempt, readMpgsAttempt } from "../lib/mpgsCheckout";

type PageState = "verifying" | "success" | "pending" | "failed" | "cancelled";

const MpgsReturnPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const cancelled = location.pathname.endsWith("/cancel");
  const outerParams = new URLSearchParams(window.location.search);
  const orderId =
    (searchParams.get("orderId") ?? outerParams.get("orderId"))?.trim() ?? "";
  const resultIndicator =
    (searchParams.get("resultIndicator") ?? outerParams.get("resultIndicator"))
      ?.trim() || undefined;
  const remembered = readMpgsAttempt();
  const [state, setState] = useState<PageState>(cancelled ? "cancelled" : "verifying");
  const [message, setMessage] = useState("");

  const verify = useCallback(async () => {
    if (!orderId) {
      setState("failed");
      setMessage("The MPGS return URL did not contain an order reference.");
      return;
    }
    setState("verifying");
    setMessage("");
    try {
      const response = await mpgsApi.verify({ orderId, resultIndicator });
      const result = response.data;
      if (result.verified) {
        setState("success");
        forgetMpgsAttempt();
        const vehicleId = result.booking?.vehicleId || remembered?.vehicleId;
        const bookingId = result.booking?.id || remembered?.bookingId;
        if (vehicleId && bookingId) {
          navigate(
            `/booking-confirmed/${vehicleId}?booking=${bookingId}&paid=true&provider=MPGS&ref=${encodeURIComponent(orderId)}`,
            { replace: true },
          );
        }
        return;
      }
      if (result.outcome === "PENDING" || result.outcome === "UNVERIFIED") {
        setState("pending");
        setMessage("Mastercard is still processing this payment. Verify it again shortly.");
        return;
      }
      setState("failed");
      setMessage("Mastercard did not confirm this payment.");
    } catch (error) {
      setState("pending");
      setMessage(
        error instanceof Error
          ? error.message
          : "Payment verification is temporarily unavailable.",
      );
    }
  }, [navigate, orderId, remembered?.bookingId, remembered?.vehicleId, resultIndicator]);

  useEffect(() => {
    if (!cancelled) void verify();
  }, [cancelled, verify]);

  const icon = state === "success"
    ? <CheckCircle2 className="h-12 w-12 text-emerald-600" />
    : state === "failed" || state === "cancelled"
      ? <XCircle className="h-12 w-12 text-red-500" />
      : <Clock3 className="h-12 w-12 text-amber-600" />;

  const title = {
    verifying: "Verifying your MPGS payment",
    success: "Payment verified",
    pending: "Payment confirmation pending",
    failed: "Payment not confirmed",
    cancelled: "MPGS checkout cancelled",
  }[state];

  return (
    <main className="min-h-screen bg-slate-50 px-4 pt-28 pb-16">
      <section className="mx-auto flex max-w-xl flex-col items-center gap-5 rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl">
        {state === "verifying" ? (
          <span className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-[#142B4A]" />
        ) : icon}
        <div>
          <h1 className="text-xl font-black text-slate-900">{title}</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            {message || (state === "cancelled"
              ? "No payment was confirmed. You can return to your reservation and try again."
              : "NexRide is checking the order directly with Mastercard.")}
          </p>
        </div>
        {orderId && (
          <p className="rounded-lg bg-slate-100 px-3 py-2 font-mono text-xs text-slate-600">
            {orderId}
          </p>
        )}
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
          {state === "pending" && (
            <button type="button" onClick={() => void verify()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#142B4A] px-5 py-3 text-sm font-bold text-white">
              <ShieldCheck className="h-4 w-4" /> Verify again
            </button>
          )}
          {(state === "cancelled" || state === "failed") && remembered?.bookingId && (
            <Link to={`/payment/${remembered.bookingId}?provider=mpgs`} className="rounded-xl bg-[#142B4A] px-5 py-3 text-sm font-bold text-white">
              Return to payment
            </Link>
          )}
          <Link to="/fleet" className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-bold text-slate-700">
            Browse vehicles
          </Link>
        </div>
      </section>
    </main>
  );
};

export default MpgsReturnPage;
