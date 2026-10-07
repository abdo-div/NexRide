export type FleetTier =
  | "BOUTIQUE"
  | "MIDTIER"
  | "SELECTED"
  | "MAJOR"
  | "ENTERPRISE";

export type VehicleCategory =
  | "ECONOMY"
  | "COMPACT"
  | "SEDAN"
  | "SUV"
  | "LUXURY_EXECUTIVE"
  | "PASSENGER_VAN"
  | "PICKUP_UTILITY"
  | "CHAFFEURED_ARMORED";

export type HubCity = "TRIPOLI" | "BENGHAZI" | "MISRATA" | "ZAWIA" | "TOBRUK";

export type DepotType = "PRIMARY" | "AIRPORT_TERMINAL" | "BRANCH";

export type CancellationPolicy = "FLEXIBLE" | "MODERATE" | "STRICT";

export type DocumentKind =
  | "COMMERCIAL_REGISTRY"
  | "OWNER_ID"
  | "TRANSPORT_LICENSE"
  | "INSURANCE"
  | "OTHER";

export interface DepotDraft {
  name: string;
  address: string;
  hubType: DepotType;
  phone: string;
  hours: string;
}

export interface RentalPolicyDraft {
  minDurationDays: number;
  maxDurationDays: number;
  minDriverAge: number;
  cancellationPolicy: CancellationPolicy;
  depositAmountLYD: number;
  additionalDriverAllowed: boolean;
  inVehicleSmokingAllowed: boolean;
}

export interface PayoutDraft {
  bankName: string;
  iban: string;
  accountName: string;
}

export interface DocumentDraft {
  id: string;
  name: string;
  kind: DocumentKind;
  file: File | null;
  size: number;
}

export interface PartnerApplicationDraft {
  applicant: {
    name: string;
    email: string;
    phoneNumber: string;
    password: string;
    passwordConfirm: string;
  };
  company: {
    name: string;
    commercialRegisterNumber: string;
    city: string;
    address: string;
  };
  fleet: {
    tier: FleetTier;
    categories: VehicleCategory[];
  };
  hubs: {
    active: HubCity[];
    depots: DepotDraft[];
  };
  policy: RentalPolicyDraft;
  payout: PayoutDraft;
}

export interface CompanyApplicationPayload {
  applicant: {
    name: string;
    email: string;
    phoneNumber: string;
    password: string;
    passwordConfirm: string;
  };
  company: {
    name: string;
    commercialRegisterNumber: string;
    city: string;
    address: string;
  };
  fleet: {
    tier: FleetTier;
    categories: VehicleCategory[];
  };
  hubs: {
    active: string[];
    depots: DepotDraft[];
  };
  policy: RentalPolicyDraft;
  payout: PayoutDraft;
  documents: { name: string; kind: DocumentKind }[];
}

export interface CompanyApplicationResult {
  user: {
    _id: string;
    name: string;
    email: string;
    phoneNumber: string;
    photo: string;
    role: "customer" | "company" | "admin";
    company: string | null;
    createdAt: string;
    updatedAt: string;
  };
  company: {
    _id: string;
    name: string;
    status: string;
    applicationRef: string;
  };
}

export type CompanyStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "SUSPENDED";

/**
 * The authenticated owner's application record as returned by
 * GET /companies/me/application. Covers every facet the status page renders.
 */
export interface ApplicationStatusCompany {
  _id: string;
  applicationRef: string;
  status: CompanyStatus;
  name: string;
  email: string;
  phone: string;
  city: string;
  address: string;
  commercialRegisterNumber: string;
  fleetSizeTier: FleetTier | null;
  vehicleCategories: VehicleCategory[];
  operatingHubs: string[];
  depots: {
    name: string;
    address: string;
    hubType: string;
    phone: string;
    hours: string;
  }[];
  rentalPolicy: RentalPolicyDraft | null;
  payout: {
    bankName: string;
    iban: string;
    accountName: string;
  } | null;
  applicationDocuments: {
    name: string;
    kind: DocumentKind;
    size: number;
    url: string;
  }[];
  rejectionReason: string | null;
  createdAt: string;
  approvedAt: string | null;
}

export interface ApplicationStatusResponse {
  status: string;
  data: { company: ApplicationStatusCompany };
}

export const EMPTY_APPLICATION_DRAFT: PartnerApplicationDraft = {
  applicant: {
    name: "",
    email: "",
    phoneNumber: "",
    password: "",
    passwordConfirm: "",
  },
  company: {
    name: "",
    commercialRegisterNumber: "",
    city: "",
    address: "",
  },
  fleet: {
    tier: "SELECTED",
    categories: ["SEDAN", "SUV", "LUXURY_EXECUTIVE"],
  },
  hubs: {
    active: ["TRIPOLI", "BENGHAZI"],
    depots: [
      {
        name: "Tripoli Central Depot",
        address: "Airport Road Km 4.5, Industrial District, Tripoli",
        hubType: "PRIMARY",
        phone: "",
        hours: "Sat–Thu: 08:00 – 20:00",
      },
    ],
  },
  policy: {
    minDurationDays: 1,
    maxDurationDays: 30,
    minDriverAge: 23,
    cancellationPolicy: "MODERATE",
    depositAmountLYD: 1000,
    additionalDriverAllowed: true,
    inVehicleSmokingAllowed: false,
  },
  payout: {
    bankName: "",
    iban: "",
    accountName: "",
  },
};