import React, { useState } from "react";
import { useParams } from "react-router";
import { getBookingConfirmation } from "../data/bookingConfirmationData";
import { ConfirmationHeader } from "../components/bookingConfirmation/ConfirmationHeader";
import { ConfirmationToast } from "../components/bookingConfirmation/ConfirmationToast";
import { ReferenceBar } from "../components/bookingConfirmation/ReferenceBar";
import { ExecutionTimeline } from "../components/bookingConfirmation/ExecutionTimeline";
import { VehicleConfirmationCard } from "../components/bookingConfirmation/VehicleConfirmationCard";
import { IdentificationCard } from "../components/bookingConfirmation/IdentificationCard";
import { RouteSchedule } from "../components/bookingConfirmation/RouteSchedule";
import { PaymentSummary } from "../components/bookingConfirmation/PaymentSummary";
import { HandoverProtocol } from "../components/bookingConfirmation/HandoverProtocol";
import { ActionDock } from "../components/bookingConfirmation/ActionDock";

const TOAST_MS = 2500;

export const BookingConfirmationPage: React.FC = () => {
  const { vehicleId } = useParams<{ vehicleId: string }>();
  const data = getBookingConfirmation(vehicleId);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (text: string) => {
    setToast(text);
    window.setTimeout(() => setToast(null), TOAST_MS);
  };

  const copyRef = async () => {
    try {
      await navigator.clipboard.writeText(data.meta.reference.code);
    } catch {
      /* clipboard unavailable */
    }
    showToast(data.meta.reference.copyToast);
  };

  return (
    <div className="bg-[#F8FAFC] min-h-screen">
      <div className="max-w-[1360px] mx-auto px-4 lg:px-8 pt-24 md:pt-28 pb-8 md:pb-12 flex flex-col gap-6">
        <ConfirmationHeader
          vehicleTitle={data.vehicle.title}
          vehicleId={data.vehicle.id}
          meta={data.meta}
          onPrint={() => {
            showToast(data.meta.success.toastPrint);
            window.print();
          }}
          onDownload={() => {
            showToast(data.meta.success.toastDownload);
            window.setTimeout(() => setToast(null), TOAST_MS);
          }}
        />
        <ReferenceBar meta={data.meta} onCopy={copyRef} />
        <ExecutionTimeline meta={data.meta} />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 flex flex-col gap-5">
            <VehicleConfirmationCard data={data} />
            <IdentificationCard meta={data.meta} />
          </div>
          <div className="lg:col-span-5 flex flex-col gap-5">
            <RouteSchedule data={data} />
            <PaymentSummary data={data} />
          </div>
        </div>

        <HandoverProtocol meta={data.meta} />
        <ActionDock meta={data.meta} />
      </div>

      <ConfirmationToast text={toast} />
    </div>
  );
};

export default BookingConfirmationPage;