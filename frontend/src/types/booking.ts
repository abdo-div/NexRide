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

export type PaymentStatus = "UNPAID" | "PAID" | "REFUNDED";

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
  createdAt: string;
  updatedAt?: string;
}
