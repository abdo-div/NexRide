import React from "react";
import { motion } from "framer-motion";
import { useHomeData } from "../hooks/useHomeData";
import { Hero } from "../components/home/Hero";
import { VehicleCategories } from "../components/home/VehicleCatigories";
import { TrendingRentals } from "../components/home/TrendingRentals";
import { NationwidePresence } from "../components/home/NationwidePresence";
import { HowItWorks } from "../components/home/HowItWorks";
import { PartnerSection } from "../components/home/PartnerSection";
import { TrustedOperators } from "../components/home/trustedOperators";
import { UncompromisingStandards } from "../components/home/UncompromisingStandards";
import { ReadyToHitTheRoad } from "../components/layouts/ReadyToHitTheRoad";

export const HomePage: React.FC = () => {
  const home = useHomeData();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="w-full overflow-hidden"
    >
      <Hero />
      <VehicleCategories
        categories={home.categories}
        loading={home.loading}
        error={home.error}
        onRetry={home.reload}
      />
      <TrendingRentals
        cars={home.trending}
        types={home.types}
        totalAvailable={home.totalAvailable}
        loading={home.loading}
        error={home.error}
        onRetry={home.reload}
      />
      <NationwidePresence
        hubs={home.regions}
        loading={home.loading}
        error={home.error}
        onRetry={home.reload}
      />
      <HowItWorks />
      <PartnerSection />
      <TrustedOperators
        operators={home.operators}
        loading={home.loading}
        error={home.error}
        onRetry={home.reload}
      />
      <UncompromisingStandards />
      <ReadyToHitTheRoad />
    </motion.div>
  );
};

export default HomePage;