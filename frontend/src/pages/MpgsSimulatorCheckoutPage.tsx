import React, { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { CreditCard, LockKeyhole, ShieldCheck, XCircle } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router";
import { mpgsSimulatorApi } from "../lib/mpgsSimulatorApi";

type CheckoutState = "ready" | "processing" | "declined" | "error";

const digits = (value: string) => value.replace(/\D/g, "");
const formatCard = (value: string) =>
  digits(value).slice(0, 16).replace(/(.{4})/g, "$1 ").trim();

const MpgsSimulatorCheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [cardNumber, setCardNumber] = useState("5123 4500 0000 0008");
  const [name, setName] = useState("TEST CUSTOMER");
  const [expiry, setExpiry] = useState("12/30");
  const [securityCode, setSecurityCode] = useState("123");
  const [state, setState] = useState<CheckoutState>("ready");
  const [message, setMessage] = useState("");

  const orderId = params.get("orderId") ?? "";
  const sessionId = params.get("sessionId") ?? "";
  const bookingId = params.get("bookingId") ?? "";
  const vehicleId = params.get("vehicleId") ?? "";
  const amount = params.get("amount") ?? "0.000";
  const currency = params.get("currency") ?? "LYD";
  const merchant = params.get("merchant") ?? "NexRide";
  const missingSession = !orderId || !sessionId || !bookingId || !vehicleId;

  const cardError = useMemo(() => {
    if (digits(cardNumber).length !== 16) return "Enter a 16-digit simulator card number.";
    if (!/^\d{2}\/\d{2}$/.test(expiry)) return "Enter expiry as MM/YY.";
    if (securityCode.length !== 3) return "Enter a 3-digit security code.";
    if (!name.trim()) return "Enter the cardholder name.";
    return "";
  }, [cardNumber, expiry, name, securityCode]);

  const cancel = () => navigate(`/payment/${bookingId}?provider=mpgs-simulator`, { replace: true });

  const pay = async (event: FormEvent) => {
    event.preventDefault();
    if (missingSession || cardError) {
      setMessage(missingSession ? "This simulator session is invalid or expired." : cardError);
      setState("error");
      return;
    }

    setMessage("");
    setState("processing");
    await new Promise((resolve) => window.setTimeout(resolve, 900));

    // Dedicated non-sensitive test numbers choose the simulated gateway outcome.
    if (digits(cardNumber) === "5123450000000016") {
      setState("declined");
      setMessage("Transaction declined by the simulated issuer. Try the approved test card.");
      return;
    }

    if (digits(cardNumber) !== "5123450000000008") {
      setState("error");
      setMessage("Unknown test card. Use one of the simulator cards shown below.");
      return;
    }

    try {
      const result = await mpgsSimulatorApi.complete(orderId);
      if (!result.data.verified || !result.data.simulated) throw new Error("Verification failed.");
      navigate(`/booking-confirmed/${vehicleId}?booking=${bookingId}&paid=true`, { replace: true });
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "The simulated gateway could not verify payment.");
    }
  };

  return (
    <main className="min-h-screen bg-[#f3f5f8] text-slate-900">
      <div className="border-b-4 border-[#eb001b] bg-white shadow-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex -space-x-2" aria-hidden="true">
                <span className="h-9 w-9 rounded-full bg-[#eb001b] opacity-90" />
                <span className="h-9 w-9 rounded-full bg-[#f79e1b] opacity-90" />
              </div>
              <div>
                <p className="text-lg font-black tracking-tight">Hosted Checkout Simulator</p>
                <p className="text-xs font-semibold text-slate-500">MPGS development experience</p>
              </div>
            </div>
          </div>
          <div className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-black text-amber-800">
            SIMULATION · NO REAL MONEY
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-5xl gap-6 px-4 py-8 lg:grid-cols-[1fr_340px]">
        <form onSubmit={pay} className="rounded-xl border border-slate-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
            <div>
              <h1 className="text-xl font-black">Pay securely</h1>
              <p className="mt-1 text-sm text-slate-500">Enter a simulator card to continue</p>
            </div>
            <LockKeyhole className="h-6 w-6 text-emerald-600" />
          </div>

          <div className="space-y-5 p-6">
            <label className="block text-sm font-bold text-slate-700">
              Card number
              <div className="relative mt-2">
                <CreditCard className="absolute left-3 top-3.5 h-5 w-5 text-slate-400" />
                <input autoComplete="off" inputMode="numeric" value={cardNumber} onChange={(e) => setCardNumber(formatCard(e.target.value))} className="w-full rounded-lg border border-slate-300 py-3 pl-11 pr-3 font-mono text-base outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" />
              </div>
            </label>
            <label className="block text-sm font-bold text-slate-700">
              Name on card
              <input autoComplete="off" value={name} onChange={(e) => setName(e.target.value.slice(0, 40))} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-3 uppercase outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" />
            </label>
            <div className="grid grid-cols-2 gap-4">
              <label className="block text-sm font-bold text-slate-700">
                Expiry date
                <input autoComplete="off" inputMode="numeric" value={expiry} onChange={(e) => setExpiry(e.target.value.replace(/[^0-9/]/g, "").slice(0, 5))} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" />
              </label>
              <label className="block text-sm font-bold text-slate-700">
                Security code
                <input autoComplete="off" inputMode="numeric" type="password" value={securityCode} onChange={(e) => setSecurityCode(digits(e.target.value).slice(0, 3))} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" />
              </label>
            </div>

            {(state === "declined" || state === "error") && (
              <div className="flex gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">
                <XCircle className="h-5 w-5 shrink-0" />
                <span>{message}</span>
              </div>
            )}

            <button disabled={state === "processing" || missingSession} className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#142b4a] px-5 py-4 text-base font-black text-white hover:bg-[#0c1d34] disabled:cursor-not-allowed disabled:opacity-60">
              {state === "processing" ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <ShieldCheck className="h-5 w-5" />}
              {state === "processing" ? "Authorizing payment…" : `Pay ${amount} ${currency}`}
            </button>
            <button type="button" onClick={cancel} disabled={state === "processing"} className="w-full py-2 text-sm font-bold text-slate-500 hover:text-slate-800 disabled:opacity-50">Cancel and return to merchant</button>
          </div>
        </form>

        <aside className="space-y-5">
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Merchant</p>
            <p className="mt-1 text-lg font-black">{merchant}</p>
            <dl className="mt-5 space-y-3 border-t border-slate-200 pt-4 text-sm">
              <div className="flex justify-between gap-3"><dt className="text-slate-500">Order</dt><dd className="break-all text-right font-mono text-xs font-bold">{orderId}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Amount</dt><dd className="font-black">{amount} {currency}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Status</dt><dd className="font-bold text-amber-700">TEST</dd></div>
            </dl>
          </section>
          <section className="rounded-xl border border-blue-200 bg-blue-50 p-5 text-sm text-blue-950">
            <h2 className="font-black">Simulator test cards</h2>
            <p className="mt-3 text-xs font-bold uppercase text-emerald-700">Approved</p>
            <button type="button" onClick={() => { setCardNumber("5123 4500 0000 0008"); setState("ready"); }} className="mt-1 font-mono font-bold underline">5123 4500 0000 0008</button>
            <p className="mt-3 text-xs font-bold uppercase text-red-700">Declined</p>
            <button type="button" onClick={() => { setCardNumber("5123 4500 0000 0016"); setState("ready"); }} className="mt-1 font-mono font-bold underline">5123 4500 0000 0016</button>
            <p className="mt-4 text-xs leading-relaxed text-blue-800">Use any future expiry and any 3-digit security code. These numbers work only inside this local simulator.</p>
          </section>
          <p className="flex items-center gap-2 px-2 text-xs leading-relaxed text-slate-500"><LockKeyhole className="h-4 w-4 shrink-0" />No card data is sent to Mastercard or stored by NexRide.</p>
        </aside>
      </div>
    </main>
  );
};

export default MpgsSimulatorCheckoutPage;
