import React, { useState } from "react";
import { TrendingHeader } from "./TrendingHeader";
import { TrendingCard } from "./TrendingCard";
import { ExploreFleetFooter } from "./ExploreFleetFooter";
import { TRENDING_CARS_DATA } from "../../data/trendingCarsData";

export const TrendingRentals: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<string>("All Fleet");

  const categories = [
    "All Fleet",
    "Luxury SUVs",
    "Sports & Coupe",
    "Desert 4x4",
  ];

  const filteredCars =
    activeCategory === "All Fleet"
      ? TRENDING_CARS_DATA
      : TRENDING_CARS_DATA.filter((car) => car.category === activeCategory);

  return (
    <section className="w-full py-16 px-6 lg:px-12 bg-slate-50/60 border-b border-slate-200/80">
      <TrendingHeader
        categories={categories}
        activeCategory={activeCategory}
        onSelectCategory={setActiveCategory}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCars.map((car) => (
          <TrendingCard key={car.id} car={car} />
        ))}
      </div>

      <ExploreFleetFooter />
    </section>
  );
};
