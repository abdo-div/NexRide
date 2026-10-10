import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiError } from "../lib/apiClient";
import { companyApi, type CompanyPublicDto } from "../lib/companyApi";
import { vehicleApi } from "../lib/vehicleApi";
import type { VehicleDto } from "../types/vehicle";
import type {
  CompanyProfileReview,
  StarCount,
} from "../types/companyProfile";

const REVIEW_SOURCE_CAP = 8;

const isCompanyRef = (
  value: VehicleDto["companyId"],
): value is Exclude<VehicleDto["companyId"], string | null> =>
  typeof value === "object" && value !== null;

export interface CompanyProfileData {
  company: CompanyPublicDto | null;
  vehicleDtos: VehicleDto[];
  rating: number;
  reviewsCount: number;
  pickupStations: string[];
  reviews: CompanyProfileReview[];
  starCounts: StarCount[];
  loading: boolean;
  /** True when GET /companies/:id answered 404 (unknown or de-listed operator). */
  notFound: boolean;
  error: string | null;
  retry: () => void;
}

/**
 * Loads the public company profile entirely from real data: the company DTO
 * from GET /companies/:id, its currently available fleet from GET /vehicles,
 * and actual Review documents fetched best-effort from the top-rated vehicles
 * so the profile's rating, distribution and review cards are genuine.
 */
export const useCompanyProfile = (companyId: string): CompanyProfileData => {
  const [company, setCompany] = useState<CompanyPublicDto | null>(null);
  const [vehicleDtos, setVehicleDtos] = useState<VehicleDto[]>([]);
  const [reviews, setReviews] = useState<CompanyProfileReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!companyId) return;
    const controller = new AbortController();
    let active = true;

    const load = async () => {
      setLoading(true);
      setError(null);
      setNotFound(false);

      try {
        const [companyRes, fleetRes] = await Promise.all([
          companyApi.getById(companyId, controller.signal),
          vehicleApi.listAvailable(controller.signal),
        ]);
        if (!active) return;

        const fleet = (fleetRes.data.vehicles ?? []).filter(
          (vehicle) =>
            isCompanyRef(vehicle.companyId) &&
            vehicle.companyId._id === companyId,
        );

        setCompany(companyRes.data.company);
        setVehicleDtos(fleet);
        setReviews([]);

        // Best-effort: pull the real review documents of the top-rated units so
        // distribution bars and review cards reflect genuine customer feedback.
        const sources = [...fleet]
          .sort(
            (a, b) =>
              b.ratingsAverage - a.ratingsAverage ||
              b.ratingsQuantity - a.ratingsQuantity,
          )
          .slice(0, REVIEW_SOURCE_CAP);

        const collected: CompanyProfileReview[] = [];
        try {
          const details = await Promise.all(
            sources.map((vehicle) =>
              vehicleApi.getById(vehicle._id, controller.signal),
            ),
          );
          for (const detail of details) {
            const vehicle = detail.data.vehicle;
            for (const review of vehicle.reviews ?? []) {
              collected.push({
                id: review._id,
                rating: review.rating,
                review: review.review,
                author:
                  typeof review.customerId === "object" &&
                  review.customerId?.name
                    ? review.customerId.name
                    : null,
                createdAt: review.createdAt,
                vehicleTitle: `${vehicle.make} ${vehicle.model}`,
              });
            }
          }
        } catch (reviewErr) {
          // Reviews are enhancement data; a failure here never fails the page.
          if (!active) return;
          if (
            reviewErr instanceof DOMException &&
            reviewErr.name === "AbortError"
          ) {
            return;
          }
        }

        if (!active) return;
        const deduped = [
          ...new Map(collected.map((review) => [review.id, review])).values(),
        ];
        setReviews(
          deduped.sort((a, b) =>
            (b.createdAt ?? "").localeCompare(a.createdAt ?? ""),
          ),
        );
      } catch (err) {
        if (!active) return;
        if (err instanceof DOMException && err.name === "AbortError") return;
        if (err instanceof ApiError && err.status === 404) {
          setNotFound(true);
          setCompany(null);
          setVehicleDtos([]);
        } else {
          setError(
            err instanceof ApiError
              ? err.message
              : "Something went wrong while loading this company profile.",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();

    return () => {
      active = false;
      controller.abort();
    };
  }, [companyId, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  // Authoritative aggregate, rolled up from the fleet's real review counters —
  // the same source the home page and the companies directory use.
  const { rating, reviewsCount } = useMemo(() => {
    const total = vehicleDtos.reduce((sum, v) => sum + v.ratingsQuantity, 0);
    const weighted = vehicleDtos.reduce(
      (sum, v) => sum + v.ratingsAverage * v.ratingsQuantity,
      0,
    );
    return {
      rating: total > 0 ? weighted / total : 0,
      reviewsCount: total,
    };
  }, [vehicleDtos]);

  const pickupStations = useMemo(() => {
    const stations = new Set<string>();
    vehicleDtos.forEach((v) => {
      if (v.pickupLocation?.trim()) stations.add(v.pickupLocation.trim());
    });
    return [...stations].slice(0, 8);
  }, [vehicleDtos]);

  const starCounts = useMemo<StarCount[]>(() => {
    const counts: StarCount[] = [];
    for (let star = 5; star >= 1; star -= 1) {
      counts.push({
        star,
        count: reviews.filter((r) => r.rating === star).length,
      });
    }
    return counts;
  }, [reviews]);

  return {
    company,
    vehicleDtos,
    rating,
    reviewsCount,
    pickupStations,
    reviews,
    starCounts,
    loading,
    notFound,
    error,
    retry,
  };
};