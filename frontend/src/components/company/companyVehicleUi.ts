import type {
  CompanyVehiclePayment,
  CompanyVehicleTripStatus,
} from "../../types/companyVehicle";

/** Badge tones for the resolved payment state on a trip row. */
export const paymentTone = (state: CompanyVehiclePayment): string =>
  ({
    PAID: "bg-[#DDF4E4] text-[#0E6B34]",
    PENDING: "bg-[#FFE1CE] text-[#8E3C00]",
    FAILED: "bg-[#FFDBE0] text-[#BA1A1A]",
    REFUNDED: "bg-[#E7E2FD] text-[#4C19C4]",
  })[state] ?? "bg-[#FFE1CE] text-[#8E3C00]";

/** Badge tones for the booking status on a trip row. */
export const tripStatusTone = (status: CompanyVehicleTripStatus): string =>
  ({
    PENDING_PAYMENT: "bg-[#FFE1CE] text-[#8E3C00]",
    PAID: "bg-[#DDF4E4] text-[#0E6B34]",
    CONFIRMED: "bg-[#E5EEFF] text-[#2563EB]",
    ACTIVE: "bg-[#FFEFD6] text-[#8E5E00]",
    COMPLETED: "bg-[#F1F5F9] text-[#64748B]",
    CANCELLED: "bg-[#FFDBE0] text-[#BA1A1A]",
    EXPIRED: "bg-[#FFDBE0] text-[#BA1A1A]",
  })[status] ?? "bg-[#F1F5F9] text-[#64748B]";