import React from "react";
import { motion } from "framer-motion";
import { useHomeData } from "../hooks/useHomeData";
import { Hero } from "../components/home/Hero";
import { TrendingRentals } from "../components/home/TrendingRentals";
import { TrustedOperators } from "../components/home/trustedOperators";
import { UncompromisingStandards } from "../components/home/UncompromisingStandards";
import { TrustStrip } from "../components/home/TrustStrip";
import { BrandStrip } from "../components/home/BrandStrip";
import { VehicleCategories } from "../components/home/VehicleCatigories";
import { SpecialOffer } from "../components/home/SpecialOffer";
import { ReadyToHitTheRoad } from "../components/layouts/ReadyToHitTheRoad";
import { IconContext } from "@phosphor-icons/react";

export const HomePage: React.FC = () => {
  const home = useHomeData();

  return (
    <IconContext.Provider value={{ weight: "duotone", mirrored: false }}>
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="landing-shell w-full overflow-x-clip overflow-y-visible"
    >
      <Hero />
      <TrustStrip />
      <VehicleCategories categories={home.categories} loading={home.loading} error={home.error} onRetry={home.reload} />
      <TrustedOperators
        operators={home.operators}
        loading={home.loading}
        error={home.error}
        onRetry={home.reload}
      />
      <BrandStrip />
      <TrendingRentals
        cars={home.trending}
        totalAvailable={home.totalAvailable}
        loading={home.loading}
        error={home.error}
        onRetry={home.reload}
      />
      <UncompromisingStandards />
      <SpecialOffer />
      <ReadyToHitTheRoad />
    </motion.div>
    </IconContext.Provider>
  );
};

export default HomePage;
