import { API_ORIGIN } from "./vehicleApi";
import type {
  Vehicle,
  VehicleDto,
  VehicleOperator,
  VehicleTransmission,
  VehicleType,
} from "../types/vehicle";

/** Structural type so the mapper stays independent of i18next. */
type Translate = (key: string, fallback: string) => string;

const noTranslate: Translate = (_key, fallback) => fallback;

// Shown when a vehicle has no uploaded photo. Rendered instead of a remote
// stock image so a missing photo is never disguised as a real car.
const PLACEHOLDER_IMAGE = `data:image/svg+xml;utf8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="667" viewBox="0 0 1000 667">' +
    '<rect width="1000" height="667" fill="#E2E8F0"/>' +
    '<g fill="none" stroke="#94A3B8" stroke-width="14" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M250 430h500"/><path d="M280 430l40-120h360l40 120"/>' +
    '<path d="M280 430v50M720 430v50"/></g>' +
    '<circle cx="330" cy="470" r="34" fill="#94A3B8"/>' +
    '<circle cx="670" cy="470" r="34" fill="#94A3B8"/>' +
    "</svg>",
)}`;

/** Neutral grey artwork used whenever a vehicle has no uploaded photo. */
export const vehiclePlaceholderImage = PLACEHOLDER_IMAGE;

/**
 * The fleet sidebar's taxonomy was hand-written for a richer vehicle schema.
 * The database only models body, transmission, fuel and city, so each real
 * value is bucketed into the closest sidebar option. Types with no equivalent
 * map to "" and are therefore never matched by that filter.
 */
const BODY_BY_TYPE: Record<VehicleType, string> = {
  SEDAN: "sedan",
  // Closest available bucket; the sidebar has no hatchback option.
  HATCHBACK: "sedan",
  SUV: "suv",
  LUXURY: "suv",
  PICKUP: "offroad",
  // The sidebar has no van/coupe option.
  VAN: "",
};

const DRIVE_BY_TRANSMISSION: Record<VehicleTransmission, string> = {
  AUTOMATIC: "auto",
  MANUAL: "manual",
};

const SEGMENT_BY_TYPE: Record<VehicleType, string> = {
  LUXURY: "luxury",
  PICKUP: "offroad",
  SEDAN: "economy",
  HATCHBACK: "economy",
  SUV: "economy",
  VAN: "economy",
};

export const initialsFrom = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("") || "?";

/** Resolves a stored photo filename to a URL, falling back to the placeholder. */
export const photoUrl = (photo: string | undefined): string => {
  if (!photo) return PLACEHOLDER_IMAGE;
  if (/^https?:\/\//i.test(photo)) return photo;
  return `${API_ORIGIN}/vehicles/${photo}`;
};

const isCompanyRef = (
  value: VehicleDto["companyId"],
): value is Exclude<VehicleDto["companyId"], string | null> =>
  typeof value === "object" && value !== null;

const buildOperator = (dto: VehicleDto, t: Translate): VehicleOperator => {
  const company = isCompanyRef(dto.companyId) ? dto.companyId : null;
  const name = company?.name?.trim() || t("fleet.unknownOperator", "Independent owner");

  return {
    id: company?._id ?? "",
    name,
    initials: initialsFrom(name),
    rating: dto.ratingsAverage,
    reviewsCount: dto.ratingsQuantity,
    // Only an approved company may display the verified-partner mark.
    isVerified: company?.status === "APPROVED",
  };
};

/**
 * Projects a vehicle document from MongoDB onto the shape the fleet UI renders.
 * A weekly price is preferred when the company published one; otherwise a
 * five-day rental is priced at the daily rate.
 */
export const mapVehicle = (dto: VehicleDto, translate: Translate = noTranslate): Vehicle => {
  const periodDays = dto.weeklyPrice ? 7 : 5;
  const totalForPeriod = dto.weeklyPrice ?? dto.dailyPrice * 5;

  return {
    id: dto._id ?? dto.id ?? "",
    title: `${dto.make} ${dto.model}`,
    category: translate(`fleet.types.${dto.type}`, dto.type),
    segment: SEGMENT_BY_TYPE[dto.type] ?? "economy",
    pricePerDay: dto.dailyPrice,
    totalForPeriod,
    periodDays,
    image: photoUrl(dto.photos?.[0]),
    // The sidebar's location options are fixed hub ids (mitiga, downtown, ...)
    // that have no counterpart in the `city` field, so nothing is matched by
    // that filter. The real city is still the correct value to display.
    location: dto.city ?? "",
    body: BODY_BY_TYPE[dto.type] ?? "",
    drive: DRIVE_BY_TRANSMISSION[dto.transmission] ?? "",
    operatorId: isCompanyRef(dto.companyId) ? dto.companyId._id : "",
    operator: buildOperator(dto, translate),
    specs: {
      // The schema stores no engine size or output.
      engine: "—",
      seats: `${dto.seats} ${translate("fleet.seatsUnit", "Seats")}`,
      gearbox: translate(
        `fleet.transmissions.${dto.transmission}`,
        dto.transmission === "AUTOMATIC" ? "Automatic" : "Manual",
      ),
      fuel: translate(
        `fleet.fuelTypes.${dto.fuelType}`,
        dto.fuelType.charAt(0) + dto.fuelType.slice(1).toLowerCase(),
      ),
    },
    // Only genuine database strings are promoted to perks.
    perks: [dto.pickupLocation, dto.description].filter(
      (value): value is string => Boolean(value && value.trim()),
    ),
  };
};

export const mapVehicles = (
  dtos: VehicleDto[],
  translate?: Translate,
): Vehicle[] => dtos.map((dto) => mapVehicle(dto, translate));
