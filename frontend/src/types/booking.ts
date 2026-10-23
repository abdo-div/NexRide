/**
 * Populated refs the backend returns for a booking (see booking_model's
 * /^find/ pre-hook: customerId, vehicleId, companyId are auto-populated).
 */
export interface BookingCustomerRef {
  _id: string;
  name?: string;
  email?: string;
  phoneNumber?: string;
}

export interface BookingVehicleRef {
  _id: string;
  make?: string;
  model?: string;
  year?: number;
  dailyPrice?: number;
  photos?: string[];
  transmission?: string;
  fuelType?: string;
  seats?: number;
}

export interface BookingCompanyRef {
  _id: string;
  name?: string;
  phone?: string;
  city?: string;
  logo?: string;
}

export type BookingStatus =
  | "PENDING_PAYMENT"
  | "PAID"
  | "CONFIRMED"
  | "ACTIVE"
  | "COMPLETED"
  | "CANCELLED"
  | "EXPIRED";

export type PaymentStatus = "UNPAID" | "PAID" | "REFUNDED" | "PARTIALLY_REFUNDED";

export interface CancellationQuote {
  bookingId: string;
  canCancel: boolean;
  bookingStatus: BookingStatus;
  currency: string;
  paidAmount: number;
  refundableAmount: number;
  cancellationFee: number;
  refundFraction: number;
  refundRequired: boolean;
  policy: { fullRefundHours: number; partialRefundHours: number };
  refund: null | {
    id: string;
    status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
    requestedAt: string;
    processingAt?: string | null;
    completedAt?: string | null;
    failedAt?: string | null;
    failureReason?: string | null;
  };
}

export interface BookingDto {
  _id: string;
  customerId: string | BookingCustomerRef;
  companyId: string | BookingCompanyRef;
  vehicleId: string | BookingVehicleRef;
  startDate: string;
  endDate: string;
  pickupLocation: string;
  pickupMethod: "BRANCH_PICKUP" | "DELIVERY";
  dailyRate: number;
  totalDays: number;
  rentalPrice: number;
  discountAmount: number;
  addonIds?: string[];
  addons?: Array<{
    id: string;
    unit: "DAY" | "FLAT";
    unitPrice: number;
    quantity: number;
    amount: number;
  }>;
  addonsTotal?: number;
  municipalFee?: number;
  totalAmount: number;
  commissionRate: number;
  commissionAmount: number;
  companyShare: number;
  bookingStatus: BookingStatus;
  paymentStatus: PaymentStatus;
  /** Populated when the API includes the booking's latest payment attempt. */
  paymentMethod?: string;
  paymentId?:
    | string
    | { _id?: string; paymentMethod?: string }
    | null;
  createdAt: string;
  updatedAt?: string;
}
