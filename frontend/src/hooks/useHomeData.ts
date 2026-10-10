import { useCallback, useEffect, useState } from "react";
import { vehicleApi } from "../lib/vehicleApi";
import { companyApi } from "../lib/companyApi";
import type { CompanyDto } from "../lib/companyApi";
import { ApiError } from "../lib/apiClient";
import { photoUrl, initialsFrom } from "../lib/vehicleMapper";
import { CATEGORIES_DATA } from "../data/categoriesData";
import { REGION_HUBS } from "../data/regionData";
import type { VehicleCategory } from "../types/category";
import type { RegionHub } from "../types/region";
import type { FleetOperator } from "../types/operators";
import type { SpecItem, TrendingCar } from "../types/trendingCar";
import type {
  VehicleCompanyRef,
  VehicleDto,
  VehicleFuelType,
  VehicleType,
} from "../types/vehicle";

export interface HomeDataState {
  loading: boolean;
  error: string | null;
  /** Re-issues both requests; used by each section's retry button. */
  reload: () => void;
  /** Bookable vehicles currently listed (capped at 100 by the backend). */
  totalAvailable: number;
  /** Distinct body types present in the live fleet (trending tab labels). */
  types: VehicleType[];
  trending: TrendingCar[];
  categories: VehicleCategory[];
  regions: RegionHub[];
  operators: FleetOperator[];
}

// Marketing category → booking-filter buckets. Each bucket's count and
// starting price are computed from the live bookable fleet; a bucket with no
// matching vehicle reports 0/null instead of a fabricated figure.
const BUCKET_TYPES: Record<string, VehicleType[]> = {
  economy: ["SEDAN", "HATCHBACK"],
  "executive-suv": ["SUV"],
  "ultra-luxury": ["LUXURY"],
  "desert-4x4": ["PICKUP"],
};
const ELECTRIC_FUELS: VehicleFuelType[] = ["ELECTRIC", "HYBRID"];

const AVATAR_BG = [
  "bg-slate-900 text-white",
  "bg-orange-600 text-white",
  "bg-blue-600 text-white",
  "bg-cyan-600 text-white",
];

const inBucket = (bucketId: string, vehicle: VehicleDto): boolean => {
  if (bucketId === "electric-hybrid") {
    return ELECTRIC_FUELS.includes(vehicle.fuelType);
  }
  return BUCKET_TYPES[bucketId]?.includes(vehicle.type) ?? false;
};

const isCompanyRef = (
  value: VehicleDto["companyId"],
): value is Exclude<VehicleCompanyRef, string | null> =>
  typeof value === "object" && value !== null;

/** Honest badges derived from real fields, never marketing copy. */
const buildBadges = (vehicle: VehicleDto, minDailyPrice: number): string[] => {
  const badges: string[] = [];
  if (vehicle.ratingsQuantity > 0 && vehicle.ratingsAverage >= 4.5) {
    badges.push("Top Rated");
  }
  if (vehicle.dailyPrice === minDailyPrice) {
    badges.push("Best Price");
  }
  return badges.slice(0, 2);
};

const buildSpecs = (vehicle: VehicleDto): SpecItem[] => {
  const specs: SpecItem[] = [
    {
      label: "TRANS",
      valueKey: `fleet.transmissions.${vehicle.transmission}`,
    },
    { label: "FUEL", valueKey: `fleet.fuelTypes.${vehicle.fuelType}` },
  ];
  if (vehicle.seats) {
    specs.push({ label: "SEATS", value: String(vehicle.seats) });
  }
  return specs;
};

export const useHomeData = (): HomeDataState => {
  const [vehicles, setVehicles] = useState<VehicleDto[]>([]);
  const [companies, setCompanies] = useState<CompanyDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const [vehicleRes, companyRes] = await Promise.all([
          vehicleApi.listAvailable(controller.signal),
          companyApi.listActive({ signal: controller.signal }),
        ]);
        if (!active) return;
        setVehicles(vehicleRes.data.vehicles ?? []);
        setCompanies(companyRes.data.companies ?? []);
      } catch (err) {
        if (!active) return;
        if (err instanceof DOMException && err.name === "AbortError") return;
        setVehicles([]);
        setCompanies([]);
        setError(
          err instanceof ApiError
            ? err.message
            : "Something went wrong while loading the home page.",
        );
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();

    return () => {
      active = false;
      controller.abort();
    };
  }, [attempt]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  const buildTrending = (): TrendingCar[] => {
    const minDailyPrice =
      vehicles.length > 0
        ? Math.min(...vehicles.map((vehicle) => vehicle.dailyPrice))
        : Infinity;

    return [...vehicles]
      .sort(
        (a, b) =>
          b.ratingsAverage - a.ratingsAverage ||
          b.ratingsQuantity - a.ratingsQuantity,
      )
      .slice(0, 3)
      .map((vehicle) => {
        const company = isCompanyRef(vehicle.companyId) ? vehicle.companyId : null;
        return {
        id: vehicle._id,
        companyId: company?._id ?? "",
        companyName: company?.name?.trim() || "NexRide partner",
        companyLogo: company?.logo,
        location: vehicle.city,
        rating: vehicle.ratingsAverage,
        reviewCount: vehicle.ratingsQuantity,
        title: `${vehicle.make} ${vehicle.model}`,
        year: vehicle.year,
        image: photoUrl(vehicle.photos?.[0]),
        badges: buildBadges(vehicle, minDailyPrice),
        category: vehicle.type,
        specs: buildSpecs(vehicle),
        dailyPrice: vehicle.dailyPrice,
        currency: "LYD",
        href: `/vehicles/${vehicle._id}`,
      };
      });
  };

  const buildCategories = (): VehicleCategory[] =>
    CATEGORIES_DATA.map((base) => {
      const matches = vehicles.filter((vehicle) => inBucket(base.id, vehicle));
      return {
        ...base,
        availableCount: matches.length,
        startingPrice:
          matches.length > 0
            ? Math.min(...matches.map((vehicle) => vehicle.dailyPrice))
            : base.startingPrice,
      };
    });

  const buildRegions = (): RegionHub[] =>
    REGION_HUBS.map((hub) => ({
      ...hub,
      vehiclesAvailable: vehicles.filter(
        (vehicle) =>
          (vehicle.city ?? "").toLowerCase() === hub.cityName.toLowerCase(),
      ).length,
    }));

  const buildOperators = (): FleetOperator[] =>
    companies
      .filter((company) => company.status === "APPROVED")
      .map((company, index) => {
        const id = company._id ?? company.id ?? "";
        const fleet = vehicles.filter(
          (vehicle) =>
            isCompanyRef(vehicle.companyId) &&
            vehicle.companyId._id === id,
        );
        const totalReviews = fleet.reduce(
          (sum, vehicle) => sum + vehicle.ratingsQuantity,
          0,
        );
        const weightedRating = fleet.reduce(
          (sum, vehicle) =>
            sum + vehicle.ratingsAverage * vehicle.ratingsQuantity,
          0,
        );

        return {
          id,
          initials: initialsFrom(company.name),
          logo: company.logo,
          avatarBg: AVATAR_BG[index % AVATAR_BG.length],
          name: company.name,
          locations: company.city ?? "",
          // A weighted average of the fleet's real review scores; 0 until
          // customers have actually left reviews.
          rating: totalReviews > 0 ? weightedRating / totalReviews : 0,
          reviewsCount: totalReviews,
          fleetSize: fleet.length,
          specialty: "data.operators.generic",
          isVerified: company.status === "APPROVED",
        };
      })
      .sort((a, b) => b.rating - a.rating);

  const types = [...new Set(vehicles.map((vehicle) => vehicle.type))];

  return {
    loading,
    error,
    reload,
    totalAvailable: vehicles.length,
    types,
    trending: buildTrending(),
    categories: buildCategories(),
    regions: buildRegions(),
    operators: buildOperators(),
  };
};
