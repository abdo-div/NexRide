import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  BadgeCheck,
  Car,
  CheckCircle2,
  CreditCard,
  FolderOpen,
  LoaderCircle,
  Mail,
  MapPin,
  Phone,
  ShieldAlert,
  ShieldCheck,
  Star,
  Wallet,
  XCircle,
} from "lucide-react";
import type { AdminCompanyDto, AdminPaymentDto } from "../../types/admin";
import type { BookingDto } from "../../types/booking";
import type { VehicleDto } from "../../types/vehicle";
import { formatDate, formatLYD, referenceCodeFrom } from "../../lib/bookingView";
import {
  activeBookingsOf,
  bookingsOf,
  completedBookingsOf,
  methodLabelKey,
  paymentsOf,
  settledShare,
  unsettledPaymentsOf,
  unsettledShare,
  vehiclesOf,
} from "../../lib/companyView";
import { customerName, vehicleFullTitle } from "../../lib/fleetView";
import { photoUrl, initialsFrom } from "../../lib/vehicleMapper";
import { StatusPill } from "./StatusPill";

export type CompanyTab = "overview" | "vehicles" | "bookings" | "escrow";

export interface CompanyDossierPanelProps {
  company: AdminCompanyDto;
  vehicles: VehicleDto[];
  bookings: BookingDto[];
  payments: AdminPaymentDto[];
  onViewBooking: (bookingId: string) => void;
  /** True while a status mutation is in flight for this exact company. */
  mutating: boolean;
  mutationError: boolean;
  onApprove: () => void;
  onReject: () => void;
  onSuspend: () => void;
  onReactivate: () => void;
}

/** Inline operator dossier inspected below the Companies register (real data). */
export const CompanyDossierPanel: React.FC<CompanyDossierPanelProps> = ({
  company,
  vehicles,
  bookings,
  payments,
  onViewBooking,
  mutating,
  mutationError,
  onApprove,
  onReject,
  onSuspend,
  onReactivate,
}) => {
  const { t, i18n } = useTranslation();
  const [tab, setTab] = useState<CompanyTab>("overview");

  const fleet = useMemo(() => vehiclesOf(vehicles, company), [vehicles, company]);
  const paymentsOfCompany = useMemo(
    () => paymentsOf(payments, company),
    [payments, company],
  );
  const settled = useMemo(
    () => settledShare(payments, company),
    [payments, company],
  );
  const unsettled = useMemo(
    () => unsettledShare(payments, company),
    [payments, company],
  );

  const statusChip = statusChipFor(company.status);

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_4px_20px_-2px_rgba(15,23,42,0.06)]">
      {/* -------------------------------------------------------------------- */}
      {/* Dossier header banner */}
      {/* -------------------------------------------------------------------- */}
      <div className="flex flex-col justify-between gap-4 border-b border-slate-100 bg-[#EAF0FF] px-6 py-5 xl:flex-row xl:items-center">
        <div className="flex items-start gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#2563EB] text-[22px] font-extrabold text-white shadow-md">
            {initialsFrom(company.name)}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-[22px] font-extrabold tracking-tight text-[#0B1C30]">
                {company.name}
              </h2>
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${statusChip}`}>
                {company.status === "PENDING" && (
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-600" />
                )}
                {company.status === "APPROVED" && (
                  <ShieldCheck className="h-3.5 w-3.5" />
                )}
                {company.status === "SUSPENDED" && (
                  <ShieldAlert className="h-3.5 w-3.5" />
                )}
                {t(`admin.companies.dossier.${company.status === "APPROVED" ? "approved" : company.status === "SUSPENDED" ? "suspended" : company.status === "REJECTED" ? "rejected" : "underReview"}`)}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-[#E5EEFF] px-2.5 py-1 text-[11px] font-bold text-[#2563EB]">
                <BadgeCheck className="h-3.5 w-3.5" />
                {t("admin.companies.dossier.verified")}
              </span>
            </div>
            <p className="mt-1 max-w-2xl truncate text-sm text-[#565E74]">
              {company.description?.trim() || t("admin.companies.dossier.taglineFallback")}
            </p>
          </div>
        </div>

        {/* Governance actions (real status transitions) */}
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {company.status === "PENDING" && (
            <>
              <button
                type="button"
                disabled={mutating}
                onClick={onReject}
                className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-white px-3.5 py-2 text-sm font-semibold text-[#BA1A1A] transition-all hover:bg-[#FFDAD6] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
              >
                <XCircle className="h-4 w-4" />
                {mutating ? t("admin.companies.dossier.saving") : t("admin.companies.dossier.reject")}
              </button>
              <button
                type="button"
                disabled={mutating}
                onClick={onApprove}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow-[0_4px_12px_rgba(5,150,105,0.25)] transition-all hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
              >
                {mutating ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                {mutating ? t("admin.companies.dossier.saving") : t("admin.companies.dossier.approve")}
              </button>
            </>
          )}
          {company.status === "APPROVED" && (
            <button
              type="button"
              disabled={mutating}
              onClick={onSuspend}
              className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-white px-3.5 py-2 text-sm font-semibold text-[#BA1A1A] transition-all hover:bg-[#FFDAD6] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
            >
              <ShieldAlert className="h-4 w-4" />
              {mutating ? t("admin.companies.dossier.saving") : t("admin.companies.dossier.suspend")}
            </button>
          )}
          {company.status === "SUSPENDED" && (
            <button
              type="button"
              disabled={mutating}
              onClick={onReactivate}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow-[0_4px_12px_rgba(5,150,105,0.25)] transition-all hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
            >
              {mutating ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              {mutating ? t("admin.companies.dossier.saving") : t("admin.companies.dossier.reactivate")}
            </button>
          )}
        </div>
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* Tabs */}
      {/* -------------------------------------------------------------------- */}
      <div className="flex items-center gap-4 overflow-x-auto border-b border-slate-100 bg-white px-6 text-sm">
        <TabButton active={tab === "overview"} onClick={() => setTab("overview")}>
          {t("admin.companies.dossier.tabOverview")}
        </TabButton>
        <TabButton active={tab === "vehicles"} onClick={() => setTab("vehicles")}>
          {t("admin.companies.dossier.tabVehicles")}
          <TabCount tone="surface">{fleet.length}</TabCount>
        </TabButton>
        <TabButton active={tab === "bookings"} onClick={() => setTab("bookings")}>
          {t("admin.companies.dossier.tabBookings")}
          <TabCount tone="primary">
            {bookingsOf(bookings, company).length}
          </TabCount>
        </TabButton>
        <TabButton active={tab === "escrow"} onClick={() => setTab("escrow")}>
          {t("admin.companies.dossier.tabEscrow")}
          <TabCount tone="amber">{`${formatLYD(unsettled)} LYD`}</TabCount>
        </TabButton>
      </div>

      {mutationError && (
        <div className="mx-6 mt-4 flex items-center gap-2 rounded-xl bg-red-50 px-4 py-2.5 text-xs font-semibold text-[#BA1A1A]">
          <ShieldAlert className="h-4 w-4 shrink-0" />
          {t("admin.companies.dossier.mutationError")}
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* Tab: Overview & Credentials */}
      {/* -------------------------------------------------------------------- */}
      {tab === "overview" && (
        <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-12">
          {/* Left: corporate & legal profile */}
          <div className="space-y-4 lg:col-span-4">
            <div className="rounded-xl bg-[#EFF4FF] p-4">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#565E74]">
                {t("admin.companies.dossier.creds.title")}
              </h4>
              <div className="mt-3 space-y-2.5 text-sm">
                <CredRow label={t("admin.companies.dossier.creds.storefront")} value={company.subdomain ?? company.slug ?? "—"} mono />
                <CredRow label={t("admin.companies.dossier.creds.city")} value={company.city} />
                <CredRow
                  label={t("admin.companies.dossier.creds.rate")}
                  value={
                    company.customCommissionRate != null
                      ? t("admin.companies.dossier.creds.rateValue", { rate: company.customCommissionRate })
                      : t("admin.companies.dossier.creds.rateDefault")
                  }
                  tone={company.customCommissionRate != null ? "brand" : undefined}
                />
                <CredRow
                  label={t("admin.companies.dossier.creds.founded")}
                  value={formatDate(company.createdAt ?? "", i18n.language)}
                />
              </div>
            </div>

            <div className="rounded-xl bg-[#EFF4FF] p-4">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#565E74]">
                {t("admin.companies.dossier.creds.hq")}
              </h4>
              <div className="mt-3 flex items-start gap-2 text-sm text-[#0B1C30]">
                <MapPin className="mt-0.5 h-[18px] w-[18px] shrink-0 text-[#2563EB]" />
                <span>{company.address || company.city || "—"}</span>
              </div>
            </div>

            <div className="rounded-xl bg-[#EFF4FF] p-4">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#565E74]">
                {t("admin.companies.dossier.creds.contact")}
              </h4>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex items-center gap-2 text-[#0B1C30]">
                  <Mail className="h-4 w-4 shrink-0 text-[#2563EB]" />
                  <span className="truncate">{company.email || "—"}</span>
                </div>
                <div className="flex items-center gap-2 text-[#0B1C30]">
                  <Phone className="h-4 w-4 shrink-0 text-[#2563EB]" />
                  <span className="truncate">{company.phone || "—"}</span>
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-[#EFF4FF] p-4">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#565E74]">
                {t("admin.companies.dossier.creds.settlement")}
              </h4>
              <div className="mt-3 space-y-2 rounded-lg bg-white p-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[#565E74]">{t("admin.companies.dossier.creds.settled")}</span>
                  <span className="font-bold text-emerald-700">{formatLYD(settled)} LYD</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#565E74]">{t("admin.companies.dossier.creds.open")}</span>
                  <span className="font-bold text-[#B54E00]">{formatLYD(unsettled)} LYD</span>
                </div>
                <div className="border-t border-slate-100 pt-2">
                  {t("admin.companies.dossier.creds.channels", {
                    channels:
                      methodChannelsLabel(paymentsOfCompany, t) ?? t("admin.companies.table.none"),
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Right: performance + fleet + ledger */}
          <div className="space-y-5 lg:col-span-8">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <KpiTile
                label={t("admin.companies.dossier.kpis.trips")}
                value={String(bookingsOf(bookings, company).length)}
                sub={
                  completedBookingsOf(bookings, company).length > 0
                    ? t("admin.companies.dossier.kpis.completion", {
                        pct: Math.round(
                          (completedBookingsOf(bookings, company).length /
                            Math.max(1, bookingsOf(bookings, company).length)) *
                            100,
                        ),
                      })
                    : t("admin.companies.dossier.kpis.noTrips")
                }
                tone="neutral"
              />
              <KpiTile
                label={t("admin.companies.dossier.kpis.fleet")}
                value={
                  fleet.length > 0
                    ? `${Math.round(
                        (fleet.filter((v) => v.operationalStatus === "AVAILABLE").length /
                          fleet.length) *
                          100,
                      )}%`
                    : "—"
                }
                sub={
                  fleet.length > 0
                    ? t("admin.companies.dossier.kpis.deployed", {
                        ready: fleet.filter((v) => v.operationalStatus === "AVAILABLE").length,
                        total: fleet.length,
                      })
                    : t("admin.companies.table.noFleet")
                }
                tone="brand"
              />
              <KpiTile
                label={t("admin.companies.dossier.kpis.rating")}
                value={ratingOf(fleet) ?? "—"}
                icon={<Star className="h-5 w-5 text-[#F97316] fill-[#F97316]" />}
                sub={
                  reviewsOf(fleet) > 0
                    ? t("admin.companies.dossier.kpis.ratingCount", { count: reviewsOf(fleet) })
                    : t("admin.companies.dossier.kpis.ratingNone")
                }
                tone="neutral"
              />
              <KpiTile
                label={t("admin.companies.dossier.kpis.escrow")}
                value={formatLYD(unsettled)}
                sub={t("admin.companies.dossier.kpis.escrowDue", {
                  count: unsettledPaymentsOf(payments, company).length,
                })}
                tone="tertiary"
              />
            </div>

            {/* Active fleet register */}
            <div className="rounded-xl bg-[#EFF4FF] p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Car className="h-5 w-5 text-[#2563EB]" />
                  <h3 className="text-sm font-bold text-[#0B1C30]">
                    {t("admin.companies.dossier.dispatches.title")}
                  </h3>
                </div>
                {bookingsOf(bookings, company).length > 0 && (
                  <button
                    type="button"
                    onClick={() => setTab("bookings")}
                    className="cursor-pointer text-xs font-bold text-[#2563EB] hover:underline"
                  >
                    {t("admin.companies.dossier.dispatches.viewBookings")} →
                  </button>
                )}
              </div>
              {fleet.length > 0 ? (
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  {fleet.map((v) => {
                    const active = activeBookingsOf(bookings, company).find(
                      (b) =>
                        typeof b.vehicleId === "object"
                          ? b.vehicleId._id === v._id
                          : b.vehicleId === v._id,
                    );
                    return (
                      <div
                        key={v._id}
                        className="flex items-center justify-between gap-3 rounded-lg bg-white p-3 shadow-sm"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-[#EFF4FF]">
                            <img src={photoUrl(v.photos?.[0])} alt="" className="h-full w-full object-cover" />
                          </div>
                          <div className="min-w-0">
                            <div className="truncate text-sm font-bold text-[#0B1C30]">
                              {vehicleFullTitle(v)}
                            </div>
                            <div className="truncate text-xs text-[#565E74]">
                              {v.pickupLocation || v.city}
                            </div>
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          {active ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-600" />
                              {t(`admin.status.${active.bookingStatus}`)}
                            </span>
                          ) : (
                            <StatusPill status={v.operationalStatus} kind="vehicle" />
                          )}
                          <div className="mt-0.5 font-mono text-[10px] text-[#565E74]">
                            #{referenceCodeFrom(v._id)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-lg bg-white px-4 py-6 text-center text-xs text-[#565E74]">
                  {t("admin.companies.dossier.dispatches.noVehicles")}
                </div>
              )}
            </div>

            {/* Escrow settlement ledger (overview shows recent records) */}
            <div className="rounded-xl bg-[#EFF4FF] p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-bold text-[#0B1C30]">
                  {t("admin.companies.dossier.ledgerTitle")}
                </h3>
                <button
                  type="button"
                  onClick={() => setTab("escrow")}
                  className="cursor-pointer text-xs font-bold text-[#2563EB] hover:underline"
                >
                  {t("admin.companies.dossier.ledgerSubtitle")}
                </button>
              </div>
              <SettlementLedger payments={paymentsOfCompany} limit={6} />
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* Tab: Vehicles */}
      {/* -------------------------------------------------------------------- */}
      {tab === "vehicles" && (
        <div className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-bold text-[#0B1C30]">
              {t("admin.companies.dossier.vehiclesTitle")}
            </h3>
            <span className="rounded-full bg-[#E5EEFF] px-2.5 py-1 text-xs font-bold text-[#2563EB]">
              {t("admin.companies.table.records", { count: fleet.length })}
            </span>
          </div>
          {fleet.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {fleet.map((v) => (
                <div
                  key={v._id}
                  className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
                >
                  <div className="relative h-32 w-full overflow-hidden bg-[#EFF4FF]">
                    <img src={photoUrl(v.photos?.[0])} alt="" className="h-full w-full object-cover" />
                    <div className="absolute left-2 top-2">
                      <span className="rounded-full bg-white/90 px-2 py-0.5 font-mono text-[10px] font-bold text-[#0B1C30] shadow-sm backdrop-blur">
                        #{referenceCodeFrom(v._id)}
                      </span>
                    </div>
                  </div>
                  <div className="p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-bold text-[#0B1C30]">
                        {vehicleFullTitle(v)}
                      </span>
                      <span className="text-sm font-extrabold text-[#0B1C30]">
                        {v.dailyPrice} <span className="text-[10px] font-normal text-[#565E74]">LYD</span>
                      </span>
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-2 text-xs text-[#565E74]">
                      <span className="truncate">
                        {t(`admin.fleet.class.${v.type}`)} • {v.year}
                      </span>
                      <StatusPill status={v.operationalStatus} kind="vehicle" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 py-16 text-center">
              <Car className="h-10 w-10 text-[#94A3B8]" />
              <p className="mt-3 text-sm text-[#64748B]">
                {t("admin.companies.dossier.vehiclesEmpty")}
              </p>
            </div>
          )}
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* Tab: Bookings */}
      {/* -------------------------------------------------------------------- */}
      {tab === "bookings" && (
        <div className="p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-[#0B1C30]">
                {t("admin.companies.dossier.bookingsTitle")}
              </h3>
              <p className="text-xs text-[#565E74]">
                {t("admin.companies.dossier.bookingsSubtitle", {
                  active: activeBookingsOf(bookings, company).length,
                  total: bookingsOf(bookings, company).length,
                })}
              </p>
            </div>
            <span className="rounded-full bg-[#E5EEFF] px-2.5 py-1 text-xs font-bold text-[#2563EB]">
              {t("admin.companies.table.records", { count: bookingsOf(bookings, company).length })}
            </span>
          </div>
          {bookingsOf(bookings, company).length > 0 ? (
            <div className="divide-y divide-slate-100 rounded-xl border border-slate-100">
              {bookingsOf(bookings, company)
                .slice()
                .sort(
                  (a, b) =>
                    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
                )
                .map((b) => (
                  <button
                    key={b._id}
                    type="button"
                    onClick={() => onViewBooking(b._id)}
                    className="flex w-full cursor-pointer items-center justify-between gap-4 px-4 py-3 text-left transition-colors hover:bg-[#EFF4FF]/60"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-sm font-bold text-[#0B1C30]">
                        <span className="font-mono text-[#2563EB]">
                          #{referenceCodeFrom(b._id)}
                        </span>
                        <span className="truncate">{vehicleFullTitleRef(b)}</span>
                      </div>
                      <div className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-[#565E74]">
                        <span className="truncate">
                          {customerName(b) || "—"} • {b.pickupLocation}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#565E74]">
                        {formatDate(b.startDate, i18n.language)} → {formatDate(b.endDate, i18n.language)}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-sm font-bold text-[#0B1C30]">
                        {formatLYD(b.totalAmount)} <span className="text-xs font-normal text-[#565E74]">LYD</span>
                      </div>
                      <StatusPill status={b.bookingStatus} kind="booking" />
                    </div>
                  </button>
                ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 py-16 text-center">
              <FolderOpen className="h-10 w-10 text-[#94A3B8]" />
              <p className="mt-3 text-sm text-[#64748B]">
                {t("admin.companies.dossier.bookingsEmpty")}
              </p>
            </div>
          )}
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* Tab: Escrow Payouts */}
      {/* -------------------------------------------------------------------- */}
      {tab === "escrow" && (
        <div className="p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-[#0B1C30]">
                {t("admin.companies.dossier.ledgerTitle")}
              </h3>
              <p className="text-xs text-[#565E74]">
                {t("admin.companies.dossier.ledgerSubtitle")}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">
                <Wallet className="h-3.5 w-3.5" />
                {t("admin.companies.kpis.escrow")}: {formatLYD(unsettled)} LYD
              </span>
            </div>
          </div>
          <SettlementLedger payments={paymentsOfCompany} />
        </div>
      )}
    </section>
  );
};

// -----------------------------------------------------------------------------
// Small presentational pieces
// -----------------------------------------------------------------------------

const statusChipFor = (status: string): string => {
  switch (status) {
    case "APPROVED":
      return "bg-emerald-100 text-emerald-900";
    case "SUSPENDED":
      return "bg-red-100 text-red-900";
    case "REJECTED":
      return "bg-slate-200 text-slate-600";
    default:
      return "bg-amber-100 text-amber-900";
  }
};

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

const TabButton: React.FC<TabButtonProps> = ({ active, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex shrink-0 items-center gap-1.5 border-b-2 py-3 text-sm transition-all cursor-pointer ${
      active
        ? "border-[#2563EB] font-bold text-[#2563EB]"
        : "border-transparent font-semibold text-[#565E74] hover:text-[#0B1C30]"
    }`}
  >
    {children}
  </button>
);

const TabCount: React.FC<{ tone: "surface" | "primary" | "amber"; children: React.ReactNode }> = ({
  tone,
  children,
}) => (
  <span
    className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
      tone === "primary"
        ? "bg-[#E5EEFF] text-[#2563EB]"
        : tone === "amber"
          ? "bg-amber-100 text-amber-900"
          : "bg-[#EFF4FF] text-[#565E74]"
    }`}
  >
    {children}
  </span>
);

interface CredRowProps {
  label: string;
  value: string;
  mono?: boolean;
  tone?: "brand";
}

const CredRow: React.FC<CredRowProps> = ({ label, value, mono, tone }) => (
  <div className="flex items-center justify-between gap-3">
    <span className="shrink-0 text-xs text-[#565E74]">{label}</span>
    <span
      className={`truncate text-sm font-bold ${
        tone === "brand" ? "text-[#2563EB]" : "text-[#0B1C30]"
      } ${mono ? "font-mono" : ""}`}
    >
      {value}
    </span>
  </div>
);

interface KpiTileProps {
  label: string;
  value: string;
  sub: string;
  tone: "neutral" | "brand" | "tertiary";
  icon?: React.ReactNode;
}

const KpiTile: React.FC<KpiTileProps> = ({ label, value, sub, tone, icon }) => (
  <div className="rounded-xl bg-[#EFF4FF] p-3">
    <div className="text-[10px] font-bold uppercase tracking-wider text-[#565E74]">{label}</div>
    <div
      className={`mt-1 flex items-center gap-1 text-[22px] font-extrabold tracking-tight ${
        tone === "brand" ? "text-[#2563EB]" : tone === "tertiary" ? "text-[#B54E00]" : "text-[#0B1C30]"
      }`}
    >
      {value}
      {icon}
    </div>
    <div className="mt-0.5 text-[11px] text-[#565E74]">{sub}</div>
  </div>
);

const ratingOf = (fleet: VehicleDto[]): string => {
  const rated = fleet.filter((v) => (v.ratingsQuantity ?? 0) > 0);
  if (rated.length === 0) return "";
  const sum = rated.reduce((acc, v) => acc + (v.ratingsAverage ?? 0) * (v.ratingsQuantity ?? 0), 0);
  const count = rated.reduce((acc, v) => acc + (v.ratingsQuantity ?? 0), 0);
  return (sum / count).toFixed(2);
};

const reviewsOf = (fleet: VehicleDto[]): number =>
  fleet.reduce((acc, v) => acc + (v.ratingsQuantity ?? 0), 0);

const vehicleFullTitleRef = (b: BookingDto): string => {
  const vehicle = typeof b.vehicleId === "object" ? b.vehicleId : null;
  const title = [vehicle?.make, vehicle?.model].filter(Boolean).join(" ");
  return vehicle?.year && title ? `${title} (${vehicle.year})` : title || "NexRide Vehicle";
};

const methodChannelsLabel = (
  payments: AdminPaymentDto[],
  t: (key: string) => string,
): string | null => {
  const seen = new Set<string>();
  payments.forEach((p) => {
    if (p.paymentMethod) seen.add(p.paymentMethod);
  });
  if (seen.size === 0) return null;
  return Array.from(seen)
    .map((m) => t(`admin.companies.dossier.ledger.${methodLabelKey(m)}`))
    .join(", ");
};

interface SettlementLedgerProps {
  payments: AdminPaymentDto[];
  limit?: number;
}

const SettlementLedger: React.FC<SettlementLedgerProps> = ({ payments, limit }) => {
  const { t } = useTranslation();
  const rows = useMemo(
    () =>
      payments
        .slice()
        .sort(
          (a, b) =>
            new Date(b.paidAt ?? b.createdAt ?? 0).getTime() -
            new Date(a.paidAt ?? a.createdAt ?? 0).getTime(),
        )
        .slice(0, limit),
    [payments, limit],
  );

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white py-10 text-center">
        <CreditCard className="h-8 w-8 text-[#94A3B8]" />
        <p className="mt-3 text-xs text-[#64748B]">
          {t("admin.companies.dossier.ledgerEmpty")}
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="text-[10px] font-bold uppercase tracking-wider text-[#565E74]">
            <th className="px-3 py-2">{t("admin.companies.dossier.ledger.record")}</th>
            <th className="px-3 py-2">{t("admin.companies.dossier.ledger.amount")}</th>
            <th className="px-3 py-2">{t("admin.companies.dossier.ledger.rate")}</th>
            <th className="px-3 py-2">{t("admin.companies.dossier.ledger.net")}</th>
            <th className="px-3 py-2 text-right">{t("admin.companies.dossier.ledger.status")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((p) => (
            <tr key={p._id} className="text-xs">
              <td className="px-3 py-2">
                <div className="font-mono font-bold text-[#2563EB]">
                  #{referenceCodeFrom(paymentRefOf(p))}
                </div>
                <div className="text-[10px] text-[#565E74]">{methodLabel(p, t)}</div>
              </td>
              <td className="px-3 py-2 font-bold text-[#0B1C30]">{formatLYD(p.amount)} LYD</td>
              <td className="px-3 py-2 text-[#565E74]">{p.commissionRate}%</td>
              <td className="px-3 py-2 font-bold text-emerald-700">{formatLYD(p.companyShare)} LYD</td>
              <td className="px-3 py-2 text-right">
                <StatusPill status={p.payoutStatus} kind="payout" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {limit !== undefined && payments.length > limit && (
        <div className="border-t border-slate-100 px-3 py-2 text-right text-[10px] font-semibold text-[#565E74]">
          +{payments.length - limit} {t("admin.companies.kpis.escrowSub", { count: payments.length - limit })}
        </div>
      )}
    </div>
  );
};

const paymentRefOf = (p: AdminPaymentDto): string => {
  if (typeof p.bookingId === "object" && p.bookingId?._id) return p.bookingId._id;
  if (typeof p.bookingId === "string") return p.bookingId;
  return p._id;
};

const methodLabel = (
  p: AdminPaymentDto,
  t: (key: string) => string,
): string => {
  const paidAt = p.paidAt ?? p.createdAt;
  const dateLabel = paidAt ? formatDate(paidAt, "en") : "";
  return `${t(`admin.companies.dossier.ledger.${methodLabelKey(p.paymentMethod)}`)}${dateLabel ? ` • ${dateLabel}` : ""}`;
};

export default CompanyDossierPanel;