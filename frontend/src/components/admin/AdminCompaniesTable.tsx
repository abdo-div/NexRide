import React from "react";
import { useTranslation } from "react-i18next";
import { BadgeCheck, Building2, Mail, MoreHorizontal, Phone } from "lucide-react";
import type {
  AdminCompanyDto,
  AdminPaymentDto,
  PaginationMeta,
} from "../../types/admin";
import type { BookingDto } from "../../types/booking";
import type { VehicleDto } from "../../types/vehicle";
import { formatDate, formatLYD } from "../../lib/bookingView";
import {
  activeBookingsOf,
  grossInWindow,
  partnerTenure,
  paymentsOf,
  settledPaymentsOf,
  unsettledPaymentsOf,
  unsettledShare,
  vehiclesOf,
} from "../../lib/companyView";
import { initialsFrom } from "../../lib/vehicleMapper";
import { AdminPagination } from "./AdminPagination";
import { StatusPill } from "./StatusPill";

export interface AdminCompaniesTableProps {
  /** Exactly the rows the server selected for the current page. */
  companies: AdminCompanyDto[];
  vehicles: VehicleDto[];
  bookings: BookingDto[];
  payments: AdminPaymentDto[];
  selectedId: string;
  onSelect: (company: AdminCompanyDto) => void;
  openDossier: (company: AdminCompanyDto) => void;
  /** Server-resolved pagination block; drives the "showing X of Y" + controls. */
  pagination: PaginationMeta;
  onPageChange: (page: number) => void;
  emptyLabel: string;
  loading?: boolean;
}

/** Operator management table (real data only) for the Rental Companies page. */
export const AdminCompaniesTable: React.FC<AdminCompaniesTableProps> = ({
  companies,
  vehicles,
  bookings,
  payments,
  selectedId,
  onSelect,
  openDossier,
  pagination,
  onPageChange,
  emptyLabel,
  loading = false,
}) => {
  const { t, i18n } = useTranslation();

  if (companies.length === 0) {
    return (
      <div className="flex h-56 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F0FDF4] text-[#059669]">
          <Building2 className="h-7 w-7" />
        </div>
        <p className="mt-4 max-w-sm text-sm text-[#64748B]">{emptyLabel}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="w-full overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="bg-[#EFF4FF] text-[11px] font-bold uppercase tracking-wider text-[#565E74]">
              <th className="rounded-s-2xl px-4 py-3">{t("admin.companies.table.company")}</th>
              <th className="px-4 py-3">{t("admin.companies.table.contact")}</th>
              <th className="px-4 py-3">{t("admin.companies.table.fleetSize")}</th>
              <th className="px-4 py-3">{t("admin.companies.table.activeBookings")}</th>
              <th className="px-4 py-3">{t("admin.companies.table.financials")}</th>
              <th className="px-4 py-3">{t("admin.companies.table.escrow")}</th>
              <th className="px-4 py-3">{t("admin.companies.table.registration")}</th>
              <th className="px-4 py-3">{t("admin.companies.table.status")}</th>
              <th className="rounded-e-2xl px-4 py-3 text-right">
                {t("admin.companies.table.actions")}
              </th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {companies.map((c) => {
              const fleet = vehiclesOf(vehicles, c);
              const ready = fleet.filter(
                (v) => v.operationalStatus === "AVAILABLE",
              ).length;
              const inShop = fleet.length - ready;
              const active = activeBookingsOf(bookings, c);
              const gross30 = grossInWindow(payments, c, 30);
              const grossRate = diffCommissionRate(payments, c);
              const escrow = unsettledShare(payments, c);
              const settledCount = settledPaymentsOf(payments, c).length;
              const unsettledCount = unsettledPaymentsOf(payments, c).length;
              const tenure = partnerTenure(c.createdAt);
              const selected = c._id === selectedId;

              return (
                <tr
                  key={c._id}
                  onClick={() => onSelect(c)}
                  className={`cursor-pointer border-b border-slate-100 transition-colors last:border-0 ${
                    selected
                      ? "bg-[#EFF4FF]/80"
                      : c.status === "SUSPENDED"
                        ? "bg-red-50/30 hover:bg-red-50/50"
                        : c.status === "PENDING"
                          ? "hover:bg-amber-50/30"
                          : "hover:bg-[#EFF4FF]/40"
                  }`}
                >
                  <td className="py-3.5 pl-4 pr-4">
                    <div className="flex min-w-[190px] items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#E5EEFF] text-sm font-bold text-[#2563EB] shadow-sm">
                        {initialsFrom(c.name)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate text-sm font-bold text-[#0B1C30]">
                            {c.name}
                          </span>
                          {c.status === "APPROVED" && (
                            <BadgeCheck className="h-4 w-4 shrink-0 text-[#2563EB]" />
                          )}
                        </div>
                        <div className="mt-0.5 flex items-center gap-1 truncate text-xs text-[#565E74]">
                          <span className="truncate">{c.city}</span>
                          <span>•</span>
                          <span className="truncate">{c.address ?? c.subdomain ?? ""}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="min-w-[160px]">
                      <div className="flex items-center gap-1.5 text-[13px] font-semibold text-[#0B1C30]">
                        <Mail className="h-3.5 w-3.5 shrink-0 text-[#565E74]" />
                        <span className="truncate">{c.email ?? "—"}</span>
                      </div>
                      <div className="mt-0.5 flex items-center gap-1.5 text-xs text-[#565E74]">
                        <Phone className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{c.phone ?? "—"}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <div className="text-sm font-bold text-[#0B1C30]">
                      {fleet.length}{" "}
                      <span className="text-xs font-normal text-[#565E74]">
                        {t("admin.companies.table.vehicles")}
                      </span>
                    </div>
                    <span className={`text-xs font-semibold ${ready > 0 ? "text-emerald-700" : "text-[#565E74]"}`}>
                      {fleet.length > 0
                        ? `${t("admin.companies.table.ready", { count: ready })} / ${t("admin.companies.table.inShop", { count: inShop })}`
                        : t("admin.companies.table.noFleet")}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <div
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${
                        active.length > 0
                          ? "bg-[#EFF4FF] text-[#2563EB]"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${active.length > 0 ? "animate-pulse bg-[#2563EB]" : "bg-slate-400"}`}
                      />
                      {t("admin.companies.table.activeBookings")}: {active.length}
                    </div>
                    <div className="mt-0.5 text-xs text-[#565E74]">
                      {fleet.length > 0
                        ? t("admin.companies.table.occupancy", {
                            pct: Math.round((active.length / fleet.length) * 100),
                          })
                        : t("admin.companies.table.noBooking")}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <div className="text-sm font-bold text-[#0B1C30]">
                      {gross30 > 0 ? formatLYD(gross30) : 0}{" "}
                      <span className="text-xs font-semibold text-[#565E74]">LYD</span>
                    </div>
                    <span className="text-xs text-[#565E74]">
                      {gross30 > 0 && grossRate !== null
                        ? t("admin.companies.table.commissionLine", {
                            rate: grossRate,
                            amount: formatLYD((gross30 * grossRate) / 100),
                          })
                        : t("admin.companies.table.noDispatches")}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <div
                      className={`text-sm font-bold ${escrow > 0 ? "text-[#B54E00]" : "text-[#0B1C30]"}`}
                    >
                      {escrow > 0 ? formatLYD(escrow) : "0"}{" "}
                      <span className="text-xs font-semibold text-[#565E74]">LYD</span>
                    </div>
                    <span
                      className={`text-xs ${escrow > 0 ? "text-[#565E74]" : "text-slate-400"}`}
                    >
                      {unsettledCount > 0
                        ? `${t("admin.companies.table.escrowReady")} • ${unsettledCount}`
                        : settledCount > 0
                          ? t("admin.companies.table.escrowNone")
                          : t("admin.companies.table.none")}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    {c.status === "PENDING" && c.applicationRef ? (
                      <div className="mb-1 inline-flex items-center rounded-md bg-amber-50 px-1.5 py-0.5 font-mono text-[11px] font-bold text-amber-700">
                        {c.applicationRef}
                      </div>
                    ) : null}
                    <div className="text-sm font-semibold text-[#0B1C30]">
                      {c.createdAt ? formatDate(c.createdAt, i18n.language) : "—"}
                    </div>
                    <span className="text-xs text-[#565E74]">
                      {tenure
                        ? t(
                            `admin.companies.table.partner${tenure.kind === "days" ? "Since" : capitalize(tenure.kind)}`,
                            { count: tenure.value },
                          )
                        : ""}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <StatusPill status={c.status} kind="company" />
                  </td>
                  <td className="px-4 py-3.5 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => openDossier(c)}
                        className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
                          selected
                            ? "bg-[#2563EB] text-white shadow-[0_2px_8px_rgba(37,99,235,0.2)]"
                            : "bg-[#EFF4FF] text-[#2563EB] hover:bg-[#2563EB] hover:text-white"
                        }`}
                      >
                        {c.status === "PENDING"
                          ? t("admin.companies.table.review")
                          : t("admin.companies.table.open")}
                      </button>
                      <button
                        type="button"
                        onClick={() => onSelect(c)}
                        className="rounded-lg p-1 text-[#565E74] transition-colors hover:bg-[#EFF4FF] hover:text-[#0B1C30] cursor-pointer"
                        aria-label={t("admin.companies.table.actions")}
                      >
                        <MoreHorizontal className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <AdminPagination
        pagination={pagination}
        onPageChange={onPageChange}
        shownCount={companies.length}
        loading={loading}
      />
    </div>
  );
};

/** Effective commission rate applied on an operator's completed payments. */
const diffCommissionRate = (
  payments: AdminPaymentDto[],
  company: AdminCompanyDto,
): number | null => {
  const rates = new Set<number>();
  paymentsOf(payments, company)
    .filter((p) => p.status === "COMPLETED")
    .forEach((p) => rates.add(p.commissionRate));
  return rates.size === 1 ? Array.from(rates)[0] : null;
};

const capitalize = (value: string): string =>
  value.charAt(0).toUpperCase() + value.slice(1);

export default AdminCompaniesTable;