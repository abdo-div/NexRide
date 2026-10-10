export type CompanyStatus = "PENDING" | "APPROVED" | "SUSPENDED" | "REJECTED";

/** Direct RTGS settlement rail: bank + IBAN the platform wires payouts to. */
export interface CompanySettingsPayout {
  bankName: string;
  iban: string;
  accountName: string;
}

/** The operator's own profile document as surfaced by GET /companies/settings. */
export interface CompanySettingsProfile {
  _id: string;
  name: string;
  subdomain: string;
  slug: string;
  description: string;
  logo: string;
  coverImage: string;
  email: string;
  phone: string;
  city: string;
  address: string;
  commercialRegisterNumber: string;
  status: CompanyStatus;
  approvedAt: string | null;
  createdAt: string | null;
  customCommissionRate: number | null;
  payout: CompanySettingsPayout | null;
  settingsPreferences: CompanySettingsPreferences;
}

export interface CompanySettingsPreferences {
  policies: Record<"minimumAge" | "allowedLicenses" | "idRequired" | "fuel" | "km" | "smoking", boolean>;
  booking: Record<"instant" | "securityDeposit" | "lead" | "channel" | "extensions" | "cc", boolean>;
  notifications: Record<"newBooking" | "dispatches" | "maintenance" | "payout" | "sms" | "weeklyEmail", boolean>;
}

/** A pickup hub derived from the fleet's distinct pickup locations in use. */
export interface CompanySettingsHub {
  name: string;
  city: string;
  vehicles: number;
  primary: boolean;
}

/** Live readiness deck counted from real records (vehicles/status/completeness). */
export interface CompanySettingsReadiness {
  verified: boolean;
  completeness: number;
  hubs: number;
  fleet: number;
  published: number;
}

export interface CompanySettingsData {
  profile: CompanySettingsProfile;
  readiness: CompanySettingsReadiness;
  hubs: CompanySettingsHub[];
}

/** Editable profile subset accepted by PATCH /companies/settings. */
export interface CompanySettingsPatch {
  name?: string;
  description?: string;
  email?: string;
  phone?: string;
  city?: string;
  address?: string;
  payout?: CompanySettingsPayout;
  settingsPreferences?: CompanySettingsPreferences;
}

/** Body accepted by PATCH /users/update-my-password. */
export interface CompanySettingsPasswordInput {
  passwordCurrent: string;
  password: string;
  passwordConfirm: string;
}

/** Fields the operator can actually persist today (PATCH whitelist). */
export const SETTINGS_EDITABLE_FIELDS = [
  "name",
  "description",
  "email",
  "phone",
  "city",
  "address",
] as const;

export type EditableCompanyField = (typeof SETTINGS_EDITABLE_FIELDS)[number];
