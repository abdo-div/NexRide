import React, { useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { Car, ArrowLeft, AlertTriangle, RefreshCw } from "lucide-react";
import { getVehicleDetail, hasStaticDetail } from "../data/vehicleDetailData";
import { buildVehicleDetail } from "../lib/vehicleDetailMapper";
import { useVehicleDetail } from "../hooks/useVehicleDetail";
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

const HeroSkeleton = () => (
  <div className="space-y-6">
    <div className="h-4 w-56 bg-slate-200 rounded animate-pulse" />
    <div className="h-10 w-4/5 bg-slate-200 rounded animate-pulse" />
    <div className="h-6 w-80 bg-slate-200 rounded animate-pulse" />
    <div className="h-[420px] w-full bg-slate-200 rounded-2xl animate-pulse" />
  </div>
);

const AsideSkeleton = () => (
  <aside className="lg:col-span-4 flex flex-col gap-4">
    <div className="h-[560px] bg-slate-200 rounded-2xl animate-pulse" />
    <div className="h-24 bg-slate-200 rounded-2xl animate-pulse" />
  </aside>
);

const MainSkeleton = () => (
  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
    <div className="lg:col-span-8 flex flex-col gap-8">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className={i === 1 ? "h-36 bg-slate-200 rounded-2xl animate-pulse" : "h-64 bg-slate-200 rounded-2xl animate-pulse"} />
      ))}
    </div>
    <AsideSkeleton />
  </div>
);

export const VehicleDetailPage: React.FC = () => {
  const { vehicleId } = useParams<{ vehicleId: string }>();
  const { t } = useTranslation();
  const [saved, setSaved] = useState(true);

  const isStatic = hasStaticDetail(vehicleId);
  const { status, vehicle, similar, error, reload } = useVehicleDetail(vehicleId, isStatic);

  const realDetail = useMemo(
    () => (vehicle ? buildVehicleDetail(vehicle, similar) : null),
    [vehicle, similar],
  );

  if (status === "static") {
    const detail = getVehicleDetail(vehicleId);
    return (
      <div className="bg-[#F8FAFC] min-h-screen">
        <div className="max-w-[1360px] mx-auto px-4 lg:px-8 pt-24 pb-20">
          <DetailBreadcrumbs crumbs={detail.crumbs} saved={saved} onToggleSave={() => setSaved((s) => !s)} />
          <DetailTitleBar detail={detail} />
          <DetailGallery detail={detail} />

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
  }

  if (status === "loading") {
    return (
      <div className="bg-[#F8FAFC] min-h-screen">
        <div className="max-w-[1360px] mx-auto px-4 lg:px-8 pt-24 pb-20">
          <HeroSkeleton />
          <div className="mt-12">
            <MainSkeleton />
          </div>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="bg-[#F8FAFC] min-h-screen">
        <div className="max-w-2xl mx-auto px-6 pt-32 pb-20 text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-5">
            <AlertTriangle className="w-7 h-7 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-[#0F172A]">
            {t("vehicleDetail.error.title")}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {t("vehicleDetail.error.desc")}
          </p>
          {error && <p className="mt-2 text-xs text-slate-400">{error}</p>}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={reload}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-bold transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              {t("vehicleDetail.error.retry")}
            </button>
            <Link
              to="/fleet"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] hover:bg-[#F1F5F9] text-slate-700 text-xs font-bold transition-colors"
            >
              <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
              {t("vehicleDetail.unavailable.backToFleet")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (status === "notfound" || !realDetail) {
    return (
      <div className="bg-[#F8FAFC] min-h-screen">
        <div className="max-w-2xl mx-auto px-6 pt-32 pb-20 text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-5">
            <Car className="w-7 h-7 text-slate-400" />
          </div>
          <h1 className="text-2xl font-bold text-[#0F172A]">
            {t("vehicleDetail.notFound.title")}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {t("vehicleDetail.notFound.desc")}
          </p>
          <Link
            to="/fleet"
            className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-bold transition-colors"
          >
            <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
            {t("vehicleDetail.notFound.backToFleet")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#F8FAFC] min-h-screen">
      <div className="max-w-[1360px] mx-auto px-4 lg:px-8 pt-24 pb-20">
        <DetailBreadcrumbs crumbs={realDetail.crumbs} saved={saved} onToggleSave={() => setSaved((s) => !s)} />
        <DetailTitleBar detail={realDetail} />
        <DetailGallery detail={realDetail} />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-8 flex flex-col gap-8">
            <MetricHighlights metrics={realDetail.metrics} />
            <VehicleDescription detail={realDetail} />
            <SpecificationsTable groups={realDetail.specGroups} />
            <RentalRequirements requirements={realDetail.requirements} meta={realDetail.policyMeta} />
            <PickupHubs detail={realDetail} />
            <OperatorProfile detail={realDetail} />
            <CustomerReviews detail={realDetail} />
            <SimilarVehicles detail={realDetail} />
          </div>
          <BookingSidebar detail={realDetail} />
        </div>
      </div>
    </div>
  );
};

export default VehicleDetailPage;