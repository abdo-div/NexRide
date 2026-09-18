import React, { useState } from "react";
import { FeaturedHeader } from "./FeaturedHeader";
import { CategoryTabs } from "./CategoryTabs";
import { CarCard } from "./CarCard";
import { SAMPLE_CARS } from "../../data/carsData";

export const FeaturedCars: React.FC = () => {
  const [selectedFilter, setSelectedFilter] = useState<string>("All");
  const categories = ["All", "Sedan", "SUV", "Luxury", "Sports"];

  const filteredCars =
    selectedFilter === "All"
      ? SAMPLE_CARS
      : SAMPLE_CARS.filter((car) => car.type === selectedFilter);

  return (
    <section
      id="featured-fleet"
      className="w-full py-16 px-6 lg:px-12 bg-slate-50"
    >
      <FeaturedHeader />
      <CategoryTabs
        categories={categories}
        selectedFilter={selectedFilter}
        onSelectCategory={setSelectedFilter}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCars.map((car) => (
          <CarCard key={car.id} car={car} />
        ))}
      </div>
    </section>
  );
};
