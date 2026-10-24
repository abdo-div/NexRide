import React from "react";
import { useTranslation } from "react-i18next";
import { TrendingHeader } from "./TrendingHeader";
import { TrendingCard } from "./TrendingCard";
import { ExploreFleetFooter } from "./ExploreFleetFooter";
import { HomeSectionError } from "./HomeSectionError";
import type { TrendingCar } from "../../types/trendingCar";

interface TrendingRentalsProps {
  cars: TrendingCar[];
  totalAvailable: number;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}

export const TrendingRentals: React.FC<TrendingRentalsProps> = ({
  cars,
  totalAvailable,
  loading,
  error,
  onRetry,
}) => {
  const { t } = useTranslation();
  const showError = error !== null && !loading;

  return (
    <section className="w-full border-b border-slate-200/80 bg-white px-6 py-20 lg:px-12">
      <div className="mx-auto max-w-7xl">
      <TrendingHeader />

      {loading ? (
        <div
          className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
          role="status"
          aria-busy="true"
          aria-label={t("common.loading", { defaultValue: "Loading vehicles" })}
        >
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="skeleton-shimmer h-[420px] rounded-3xl border border-slate-200/80"
            />
          ))}
        </div>
      ) : showError ? (
        <HomeSectionError onRetry={onRetry} />
      ) : cars.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center">
          <p className="text-sm font-bold text-slate-700">
            {t(
              "home.trending.empty.title",
            )}
          </p>
          <p className="text-xs text-slate-500 font-medium mt-1">
            {t(
              "home.trending.empty.desc",
            )}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cars.slice(0, 4).map((car, index) => (
            <TrendingCard key={car.id} car={car} index={index} />
          ))}
        </div>
      )}

      <ExploreFleetFooter count={totalAvailable} />
      </div>
    </section>
  );
};
