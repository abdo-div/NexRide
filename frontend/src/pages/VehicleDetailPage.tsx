import React, { useState } from "react";
import { useParams } from "react-router";
import { getVehicleDetail } from "../data/vehicleDetailData";
import { DetailBreadcrumbs } from "../components/vehicleDetail/DetailBreadcrumbs";
import { DetailTitleBar } from "../components/vehicleDetail/DetailTitleBar";
import { DetailGallery } from "../components/vehicleDetail/DetailGallery";
import { MetricHighlights } from "../components/vehicleDetail/MetricHighlights";
import { VehicleDescription } from "../components/vehicleDetail/VehicleDescription";
import { SpecificationsTable } from "../components/vehicleDetail/SpecificationsTable";
import { RentalRequirements } from "../components/vehicleDetail/RentalRequirements";
import { PickupHubs } from "../components/vehicleDetail/PickupHubs";
import { OperatorProfile } from "../components/vehicleDetail/OperatorProfile";
import { CustomerReviews } from "../components/vehicleDetail/CustomerReviews";
import { SimilarVehicles } from "../components/vehicleDetail/SimilarVehicles";
import { BookingSidebar } from "../components/vehicleDetail/BookingSidebar";

export const VehicleDetailPage: React.FC = () => {
  const { vehicleId } = useParams<{ vehicleId: string }>();
  const [saved, setSaved] = useState(true);
  const detail = getVehicleDetail(vehicleId);

  return (
    <div className="bg-[#F8FAFC] min-h-screen">
      <div className="max-w-[1360px] mx-auto px-4 lg:px-8 pt-24 pb-20">
        <DetailBreadcrumbs crumbs={detail.crumbs} saved={saved} onToggleSave={() => setSaved((s) => !s)} />
        <DetailTitleBar detail={detail} />
        <DetailGallery images={detail.gallery} />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-8 flex flex-col gap-8">
            <MetricHighlights metrics={detail.metrics} />
            <VehicleDescription detail={detail} />
            <SpecificationsTable groups={detail.specGroups} />
            <RentalRequirements requirements={detail.requirements} meta={detail.policyMeta} />
            <PickupHubs detail={detail} />
            <OperatorProfile detail={detail} />
            <CustomerReviews detail={detail} />
            <SimilarVehicles detail={detail} />
          </div>
          <BookingSidebar detail={detail} />
        </div>
      </div>
    </div>
  );
};

export default VehicleDetailPage;