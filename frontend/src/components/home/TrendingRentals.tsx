import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { TrendingHeader } from "./TrendingHeader";
import { TrendingCard } from "./TrendingCard";
import { ExploreFleetFooter } from "./ExploreFleetFooter";
import { HomeSectionError } from "./HomeSectionError";
import type { TrendingCar } from "../../types/trendingCar";
import type { VehicleType } from "../../types/vehicle";

interface TrendingRentalsProps {
  cars: TrendingCar[];
  /** Distinct body types present in the live fleet; drives the filter chips. */
  types: VehicleType[];
  totalAvailable: number;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}

export const TrendingRentals: React.FC<TrendingRentalsProps> = ({
  cars,
  types,
  totalAvailable,
  loading,
  error,
  onRetry,
}) => {
  const { t } = useTranslation();
  const [activeCategory, setActiveCategory] = useState<string>("ALL");

  const categories = [
    { key: "ALL", label: t("home.trending.categories.allFleet") },
    ...types.map((type) => ({
      key: type,
      label: t(`fleet.types.${type}`),
    })),
  ];

  const filteredCars =
    activeCategory === "ALL"
      ? cars
      : cars.filter((car) => car.category === activeCategory);

  const showError = error !== null && !loading;

  return (
    <section className="w-full py-16 px-6 lg:px-12 bg-slate-50/60 border-b border-slate-200/80">
      <TrendingHeader
        categories={categories}
        activeCategory={activeCategory}
        onSelectCategory={setActiveCategory}
      />

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="rounded-3xl border border-slate-200/80 h-[420px] bg-slate-200/60 animate-pulse"
            />
          ))}
        </div>
      ) : showError ? (
        <HomeSectionError onRetry={onRetry} />
      ) : filteredCars.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center">
          <p className="text-sm font-bold text-slate-700">
            {t(
              cars.length === 0
                ? "home.trending.empty.title"
                : "home.trending.emptyTab.title",
            )}
          </p>
          <p className="text-xs text-slate-500 font-medium mt-1">
            {t(
              cars.length === 0
                ? "home.trending.empty.desc"
                : "home.trending.emptyTab.desc",
            )}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCars.map((car, index) => (
            <TrendingCard key={car.id} car={car} index={index} />
          ))}
        </div>
      )}

      <ExploreFleetFooter count={totalAvailable} />
    </section>
  );
};