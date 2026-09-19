import React, { useMemo, useState } from "react";
import { useParams } from "react-router";
import { getCheckout, computeCheckoutTotals } from "../data/checkoutData";
import { CheckoutHeader } from "../components/checkout/CheckoutHeader";
import { ItinerarySection } from "../components/checkout/ItinerarySection";
import { DriverSection } from "../components/checkout/DriverSection";
import { OptionsSection } from "../components/checkout/OptionsSection";
import { PaymentSection } from "../components/checkout/PaymentSection";
import { BookingSummary } from "../components/checkout/BookingSummary";

export const CheckoutPage: React.FC = () => {
  const { vehicleId } = useParams<{ vehicleId: string }>();
  const { vehicle, meta } = getCheckout(vehicleId);

  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(meta.addons.filter((a) => a.defaultOn).map((a) => a.id)),
  );
  const [tab, setTab] = useState<"card" | "cash">("card");
  const [phase, setPhase] = useState<"idle" | "processing" | "done">("idle");

  const totals = useMemo(() => computeCheckoutTotals(vehicle, meta, selected), [vehicle, meta, selected]);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });

  const confirm = () => {
    if (phase !== "idle") return;
    setPhase("processing");
    window.setTimeout(() => setPhase("done"), 1800);
  };

  return (
    <div className="bg-[#F8FAFC] min-h-screen">
      <div className="pt-20">
        <CheckoutHeader vehicleId={vehicle.id} meta={meta} />
      </div>
      <div className="max-w-[1360px] mx-auto px-4 lg:px-8 py-8 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-7 flex flex-col gap-6">
            <ItinerarySection meta={meta} />
            <DriverSection meta={meta} />
            <OptionsSection meta={meta} selected={selected} onToggle={toggle} />
            <PaymentSection
              meta={meta}
              tab={tab}
              onTab={setTab}
              cashDeposit={totals.cashDeposit}
              cashRemaining={totals.cashRemaining}
              vehicleTitle={vehicle.title}
            />
          </div>
          <BookingSummary
            vehicle={vehicle}
            meta={meta}
            totals={totals}
            phase={phase}
            onConfirm={confirm}
          />
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;