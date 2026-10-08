import { useCallback, useEffect, useState } from "react";
import { companyApi, type CompanyDto } from "../lib/companyApi";
import { vehicleApi } from "../lib/vehicleApi";
import { ApiError } from "../lib/apiClient";
import { initialsFrom, photoUrl } from "../lib/vehicleMapper";
import type { VehicleDto } from "../types/vehicle";
import type {
  CompanyDirectoryEntry,
  CompanyVehiclePreview,
} from "../types/companyDirectory";

const AVATAR_BG = [
  "bg-slate-900 text-white",
  "bg-orange-600 text-white",
  "bg-blue-600 text-white",
  "bg-cyan-600 text-white",
];

const isCompanyRef = (
  value: VehicleDto["companyId"],
): value is Exclude<VehicleDto["companyId"], string | null> =>
  typeof value === "object" && value !== null;

const buildPreview = (vehicle: VehicleDto): CompanyVehiclePreview => ({
  id: vehicle._id,
  title: `${vehicle.make} ${vehicle.model}`,
  year: vehicle.year,
  image: photoUrl(vehicle.photos?.[0]),
  dailyPrice: vehicle.dailyPrice,
  href: `/vehicles/${vehicle._id}`,
});

export interface CompaniesDirectoryState {
  entries: CompanyDirectoryEntry[];
  totalVerified: number;
  cities: string[];
  loading: boolean;
  error: string | null;
  /** Re-issues the request; used by the error state's retry button. */
  reload: () => void;
}

/**
 * Loads the operator directory from real data only: approved companies from
 * GET /companies joined against currently available vehicles from GET
 * /vehicles, so fleet size, ratings and featured previews reflect the live
 * marketplace instead of fabricated numbers.
 */
export const useCompaniesDirectory = (): CompaniesDirectoryState => {
  const [companies, setCompanies] = useState<CompanyDto[]>([]);
  const [vehicles, setVehicles] = useState<VehicleDto[]>([]);
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
        const [companyRes, vehicleRes] = await Promise.all([
          companyApi.listActive({ signal: controller.signal }),
          vehicleApi.listAvailable(controller.signal),
        ]);
        if (!active) return;
        setCompanies(companyRes.data.companies ?? []);
        setVehicles(vehicleRes.data.vehicles ?? []);
      } catch (err) {
        if (!active) return;
        if (err instanceof DOMException && err.name === "AbortError") return;
        setCompanies([]);
        setVehicles([]);
        setError(
          err instanceof ApiError
            ? err.message
            : "Something went wrong while loading the company directory.",
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

  const approved = companies.filter((company) => company.status === "APPROVED");

  const entries: CompanyDirectoryEntry[] = approved.map((company, index) => {
    const id = company._id ?? company.id ?? "";
    const fleet = vehicles.filter(
      (vehicle) =>
        isCompanyRef(vehicle.companyId) && vehicle.companyId._id === id,
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
      avatarBg: AVATAR_BG[index % AVATAR_BG.length],
      name: company.name,
      city: company.city?.trim() ?? "",
      address: company.address?.trim() ?? "",
      description: company.description?.trim() ?? "",
      rating: totalReviews > 0 ? weightedRating / totalReviews : 0,
      reviewsCount: totalReviews,
      fleetSize: fleet.length,
      featured: [...fleet]
        .sort(
          (a, b) =>
            b.ratingsAverage - a.ratingsAverage ||
            b.ratingsQuantity - a.ratingsQuantity,
        )
        .slice(0, 2)
        .map(buildPreview),
      isVerified: company.status === "APPROVED",
    };
  });

  const cities = [
    ...new Set(entries.map((entry) => entry.city).filter(Boolean)),
  ];

  return {
    entries,
    totalVerified: entries.length,
    cities,
    loading,
    error,
    reload,
  };
};