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
  '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="750" viewBox="0 0 1200 750">' +
    '<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#071426"/><stop offset="1" stop-color="#173B68"/></linearGradient><radialGradient id="glow" cx="50%" cy="38%" r="58%"><stop stop-color="#60A5FA" stop-opacity=".18"/><stop offset="1" stop-color="#60A5FA" stop-opacity="0"/></radialGradient></defs>' +
    '<rect width="1200" height="750" fill="url(#bg)"/><rect width="1200" height="750" fill="url(#glow)"/>' +
    '<g fill="none" stroke="#93C5FD" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" opacity=".9">' +
    '<path d="M315 435h570M350 435l52-142h396l52 142"/><path d="M350 435v62M850 435v62"/></g>' +
    '<circle cx="430" cy="492" r="43" fill="#0B1C30" stroke="#BFDBFE" stroke-width="11"/>' +
    '<circle cx="770" cy="492" r="43" fill="#0B1C30" stroke="#BFDBFE" stroke-width="11"/>' +
    '<text x="600" y="625" fill="#DBEAFE" font-family="Arial, sans-serif" font-size="27" font-weight="700" letter-spacing="8" text-anchor="middle">NEXRIDE</text>' +
    "</svg>",
)}`;

/** Branded artwork used whenever a vehicle has no uploaded photo. */
export const vehiclePlaceholderImage = PLACEHOLDER_IMAGE;

/** Swaps a failed vehicle request for the branded local fallback exactly once. */
export const applyVehicleImageFallback = (event: {
  currentTarget: HTMLImageElement;
}) => {
  if (event.currentTarget.getAttribute("src") !== vehiclePlaceholderImage) {
    event.currentTarget.src = vehiclePlaceholderImage;
  }
};

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

const mediaUrl = (value: string, fallbackDirectory: string): string => {
  if (/^(https?:\/\/|data:|blob:)/i.test(value)) return value;

  let normalizedPath = value.replaceAll("\\", "/").replace(/^\/+/, "");
  normalizedPath = normalizedPath.replace(/^public\//i, "");

  const parts = normalizedPath.split("/").filter(Boolean);
  const knownDirectory = /^(cars|vehicles|companies|users)$/i.test(parts[0] ?? "")
    ? parts.shift()!.toLowerCase()
    : fallbackDirectory;
  const encodedPath = parts.length > 0
    ? parts.map((part) => encodeURIComponent(part)).join("/")
    : encodeURIComponent(normalizedPath);

  return `${API_ORIGIN}/public/${knownDirectory}/${encodedPath}`;
};

export const companyLogoUrl = (logo: string | null | undefined): string | null => {
  if (!logo || logo === "default-company-logo.png") return null;
  return mediaUrl(logo, "companies");
};

/** Resolves a stored photo filename to a URL, falling back to the placeholder. */
export const photoUrl = (photo: string | undefined): string => {
  if (!photo) return PLACEHOLDER_IMAGE;
  const normalizedPath = photo.replaceAll("\\", "/").replace(/^\/+/, "");
  const storagePath = normalizedPath.replace(/^public\//i, "");
  if (/^(cars|vehicles)\//i.test(storagePath)) return mediaUrl(photo, "vehicles");
  const directory = normalizedPath.startsWith("vehicle-") ? "vehicles" : "cars";
  return mediaUrl(photo, directory);
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
    logo: company?.logo,
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
    vehicleType: dto.type,
    fuelType: dto.fuelType,
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
