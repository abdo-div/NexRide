import type { TFunction } from "i18next";
import type {
  CancellationPolicy,
  CompanyApplicationPayload,
  DepotType,
  DocumentDraft,
  DocumentKind,
  FleetTier,
  HubCity,
  PartnerApplicationDraft,
  VehicleCategory,
} from "../types/companyApplication";

// -----------------------------------------------------------------------------
// Option palettes (enum value -> i18n key suffix under `partner.step3`)
// -----------------------------------------------------------------------------

export const FLEET_TIERS: { value: FleetTier; range: string }[] = [
  { value: "BOUTIQUE", range: "1–5" },
  { value: "MIDTIER", range: "6–20" },
  { value: "SELECTED", range: "21–50" },
  { value: "MAJOR", range: "51–100" },
  { value: "ENTERPRISE", range: "100+" },
];

export const VEHICLE_CATEGORIES: VehicleCategory[] = [
  "ECONOMY",
  "COMPACT",
  "SEDAN",
  "SUV",
  "LUXURY_EXECUTIVE",
  "PASSENGER_VAN",
  "PICKUP_UTILITY",
  "CHAFFEURED_ARMORED",
];

export const HUB_CITIES: HubCity[] = [
  "TRIPOLI",
  "BENGHAZI",
  "MISRATA",
  "ZAWIA",
  "TOBRUK",
];

/** English label stored on the Company record for each operating hub. */
export const HUB_LABELS: Record<HubCity, string> = {
  TRIPOLI: "Tripoli",
  BENGHAZI: "Benghazi",
  MISRATA: "Misrata",
  ZAWIA: "Zawiya",
  TOBRUK: "Tobruk",
};

export const DEPOT_TYPES: DepotType[] = ["PRIMARY", "AIRPORT_TERMINAL", "BRANCH"];

export const MIN_DURATION_DAYS = [1, 7, 14, 30];
export const MAX_DURATION_DAYS = [7, 14, 30, 60, 90];
export const MIN_DRIVER_AGES = [21, 23, 25, 27, 30];
export const CANCELLATION_POLICIES: CancellationPolicy[] = [
  "FLEXIBLE",
  "MODERATE",
  "STRICT",
];

export const DOCUMENT_KINDS: DocumentKind[] = [
  "COMMERCIAL_REGISTRY",
  "OWNER_ID",
  "TRANSPORT_LICENSE",
  "INSURANCE",
  "OTHER",
];

// -----------------------------------------------------------------------------
// Payload assembly
// -----------------------------------------------------------------------------

export const buildApplicationPayload = (
  draft: PartnerApplicationDraft,
  documents: DocumentDraft[],
): CompanyApplicationPayload => ({
  applicant: draft.applicant,
  company: draft.company,
  fleet: draft.fleet,
  hubs: {
    active: draft.hubs.active.map((hub) => HUB_LABELS[hub]),
    depots: draft.hubs.depots,
  },
  policy: draft.policy,
  payout: draft.payout,
  documents: documents
    .filter((doc) => doc.file)
    .map((doc) => ({ name: doc.file?.name ?? doc.name, kind: doc.kind })),
});

export const decimalsToLydd = (value: number): string =>
  new Intl.NumberFormat("en-LY", { maximumFractionDigits: 0 }).format(value);

// -----------------------------------------------------------------------------
// Step validation (localized messages keyed by field name)
// -----------------------------------------------------------------------------

export const validateStep = (
  step: number,
  draft: PartnerApplicationDraft,
  documents: DocumentDraft[],
  t: TFunction,
  extra?: { agreed: boolean },
): Record<string, string> => {
  const errors: Record<string, string> = {};

  if (step === 1) {
    if (!draft.applicant.name.trim()) errors.name = t("partner.step1.error.name");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.applicant.email.trim()))
      errors.email = t("partner.step1.error.email");
    if (draft.applicant.phoneNumber.replace(/\D/g, "").length < 8)
      errors.phoneNumber = t("partner.step1.error.phone");
    if (draft.applicant.password.length < 8)
      errors.password = t("partner.step1.error.password");
    if (draft.applicant.password !== draft.applicant.passwordConfirm)
      errors.passwordConfirm = t("partner.step1.error.passwordConfirm");
  }

  if (step === 2) {
    if (!draft.company.name.trim())
      errors.companyName = t("partner.step2.error.companyName");
    if (!draft.company.commercialRegisterNumber.trim())
      errors.commercialRegisterNumber = t("partner.step2.error.crNumber");
    if (!draft.company.city.trim()) errors.city = t("partner.step2.error.city");
    if (!draft.company.address.trim())
      errors.address = t("partner.step2.error.address");
  }

  if (step === 3) {
    if (draft.fleet.categories.length === 0)
      errors.categories = t("partner.step3.error.categories");
    if (draft.hubs.active.length === 0)
      errors.hubs = t("partner.step3.error.hubs");
    if (draft.hubs.depots.length === 0)
      errors.depots = t("partner.step3.error.depots");
    draft.hubs.depots.forEach((depot, index) => {
      if (!depot.name.trim())
        errors[`depots.${index}.name`] = t("partner.step3.error.depotName");
      if (!depot.address.trim())
        errors[`depots.${index}.address`] = t(
          "partner.step3.error.depotAddress",
        );
    });
    if (
      draft.policy.maxDurationDays !== undefined &&
      draft.policy.minDurationDays !== undefined &&
      draft.policy.maxDurationDays < draft.policy.minDurationDays
    ) {
      errors.policyRange = t("partner.step3.error.policyRange");
    }
  }

  if (step === 4) {
    if (documents.filter((doc) => doc.file).length === 0)
      errors.documents = t("partner.step4.error.documents");
    documents.forEach((doc, index) => {
      if (!doc.name.trim()) errors[`documents.${index}.name`] = t("partner.step4.error.name");
    });
  }

  if (step === 5) {
    if (!draft.payout.bankName.trim())
      errors.bankName = t("partner.step5.error.bankName");
    if (draft.payout.iban.trim().length < 5)
      errors.iban = t("partner.step5.error.iban");
    if (!draft.payout.accountName.trim())
      errors.accountName = t("partner.step5.error.accountName");
  }

  if (step === 6 && !extra?.agreed) {
    errors.agreement = t("partner.step6.error.agreement");
  }

  return errors;
};