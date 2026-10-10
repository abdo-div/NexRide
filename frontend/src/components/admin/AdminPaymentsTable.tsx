import React from "react";
import { useTranslation } from "react-i18next";
import {
  CreditCard,
  ExternalLink,
  MoreHorizontal,
  Wallet,
} from "lucide-react";
import type {
  AdminCompanyDto,
  AdminCustomerDto,
  AdminPaymentDto,
  PaginationMeta,
} from "../../types/admin";
import type { BookingDto } from "../../types/booking";
import {
  formatDate,
  formatLYD,
  referenceCodeFrom,
  vehicleTitle,
} from "../../lib/bookingView";
import {
  bookingOfPayment,
  companyOfPayment,
  customerOfPayment,
  paymentTimestamp,
  trxRefOf,
} from "../../lib/paymentView";
import { userPhotoUrl } from "../../lib/customerView";
import { initialsFrom } from "../../lib/vehicleMapper";
import { StatusPill } from "./StatusPill";
import { AdminPagination } from "./AdminPagination";

export interface AdminPaymentsTableProps {
  payments: AdminPaymentDto[];
  bookings: BookingDto[];
  customers: AdminCustomerDto[];
  companies: AdminCompanyDto[];
  selectedId: string;
  onSelect: (payment: AdminPaymentDto) => void;
  openDossier: (payment: AdminPaymentDto) => void;
  viewBooking: (payment: AdminPaymentDto) => void;
  pagination: PaginationMeta;
  onPageChange: (page: number) => void;
  loading?: boolean;
  emptyLabel: string;
}

/** Real payment-ledger table with refs joined against the actual datasets. */
export const AdminPaymentsTable: React.FC<AdminPaymentsTableProps> = ({
  payments,
  bookings,
  customers,
  companies,
  selectedId,
  onSelect,
  openDossier,
  viewBooking,
  pagination,
  onPageChange,
  loading = false,
  emptyLabel,
}) => {
  const { t, i18n } = useTranslation();

  if (payments.length === 0) {
    return (
      <div className="flex h-56 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E5EEFF] text-[#2563EB]">
          <CreditCard className="h-7 w-7" />
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
              <th className="rounded-s-2xl px-4 py-3">{t("admin.payments.table.transaction")}</th>
              <th className="px-4 py-3">{t("admin.payments.table.booking")}</th>
              <th className="px-4 py-3">{t("admin.payments.table.renter")}</th>
              <th className="px-4 py-3">{t("admin.payments.table.company")}</th>
              <th className="px-4 py-3">{t("admin.payments.table.amount")}</th>
              <th className="px-4 py-3">{t("admin.payments.table.gateway")}</th>
              <th className="px-4 py-3">{t("admin.payments.table.status")}</th>
              <th className="px-4 py-3">{t("admin.payments.table.date")}</th>
              <th className="rounded-e-2xl px-4 py-3 text-right">
                {t("admin.payments.table.actions")}
              </th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {payments.map((payment) => {
              const booking = bookingOfPayment(bookings, payment);
              const customer = customerOfPayment(customers, payment);
              const company = companyOfPayment(companies, payment);
              const selected = payment._id === selectedId;
              const avatar = userPhotoUrl(customer?.photo);

              return (
                <tr
                  key={payment._id}
                  onClick={() => onSelect(payment)}
                  className={`cursor-pointer border-b border-slate-100 transition-colors last:border-0 ${
                    selected
                      ? "bg-[#EFF4FF]/80"
                      : payment.status === "FAILED"
                        ? "bg-red-50/30 hover:bg-red-50/50"
                        : "hover:bg-[#EFF4FF]/40"
                  }`}
                >
                  <td className="px-4 py-3.5">
                    <div className="flex min-w-[150px] flex-col">
                      <span className="font-mono text-[12px] font-bold text-[#2563EB]">
                        {trxRefOf(payment)}
                      </span>
                      {payment.merchantReference && (
                        <span className="mt-0.5 max-w-[200px] truncate font-mono text-[10px] text-[#565E74]">
                          {payment.merchantReference}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    {booking ? (
                      <div className="min-w-[170px]">
                        <div className="font-mono text-[12px] font-bold text-[#0B1C30]">
                          #{referenceCodeFrom(booking._id)}
                        </div>
                        <div className="truncate text-xs text-[#565E74]">
                          {vehicleTitle(booking)}
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-[#565E74]">
                        {t("admin.payments.table.unknown")}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex min-w-[170px] items-center gap-2.5">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#E5EEFF] text-xs font-bold text-[#2563EB] shadow-sm">
                        {avatar ? (
                          <img src={avatar} alt="" className="h-full w-full object-cover" />
                        ) : (
                          initialsFrom(customer?.name ?? "-")
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-[13px] font-bold text-[#0B1C30]">
                          {customer?.name ?? t("admin.payments.table.unknown")}
                        </div>
                        <div className="truncate text-xs text-[#565E74]">
                          {customer?.phoneNumber ?? customer?.email ?? ""}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="min-w-[170px]">
                      <div className="truncate text-[13px] font-semibold text-[#0B1C30]">
                        {company?.name ?? t("admin.payments.table.unknown")}
                      </div>
                      {company?.city && (
                        <div className="text-xs text-[#565E74]">{company.city}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <div className="text-sm font-extrabold text-[#0B1C30]">
                      {formatLYD(payment.amount)}{" "}
                      <span className="text-xs font-semibold text-[#565E74]">
                        {t("admin.payments.table.lyd")}
                      </span>
                    </div>
                    <span className="text-[11px] text-[#565E74]">
                      {t("admin.payments.table.ledgerNote", {
                        rate: payment.commissionRate,
                        share: formatLYD(payment.companyShare),
                      })}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="inline-flex items-center gap-1.5 rounded-lg bg-[#EFF4FF] px-2.5 py-1 text-xs font-semibold text-[#0B1C30]">
                      {payment.paymentMethod === "CASH_ON_DELIVERY" ? (
                        <Wallet className="h-3.5 w-3.5 text-amber-600" />
                      ) : (
                        <CreditCard className="h-3.5 w-3.5 text-[#2563EB]" />
                      )}
                      {t(`admin.payments.methods.${payment.paymentMethod ?? ""}`, {
                        defaultValue: payment.paymentMethod ?? "—",
                      })}
                    </div>
                    {(payment.transactionId || payment.paymentGateway) && (
                      <div className="mt-0.5 max-w-[150px] truncate font-mono text-[10px] text-[#565E74]">
                        {payment.transactionId ?? payment.paymentGateway}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <StatusPill status={payment.status} kind="payment" />
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="min-w-[140px] text-xs font-semibold text-[#0B1C30]">
                      {formatDate(paymentTimestamp(payment) ?? payment.createdAt ?? "", i18n.language, true)}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => openDossier(payment)}
                        className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
                          selected
                            ? "bg-[#2563EB] text-white shadow-[0_2px_8px_rgba(37,99,235,0.2)]"
                            : "bg-[#EFF4FF] text-[#2563EB] hover:bg-[#2563EB] hover:text-white"
                        }`}
                      >
                        {t("admin.payments.table.openDossier")}
                      </button>
                      {booking && (
                        <button
                          type="button"
                          onClick={() => viewBooking(payment)}
                          className="rounded-lg p-1 text-[#565E74] transition-colors hover:bg-[#EFF4FF] hover:text-[#2563EB] cursor-pointer"
                          aria-label={t("admin.payments.table.viewBooking")}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onSelect(payment)}
                        className="rounded-lg p-1 text-[#565E74] transition-colors hover:bg-[#EFF4FF] hover:text-[#0B1C30] cursor-pointer"
                        aria-label={t("admin.payments.table.actions")}
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
        shownCount={payments.length}
        loading={loading}
      />
    </div>
  );
};

export default AdminPaymentsTable;