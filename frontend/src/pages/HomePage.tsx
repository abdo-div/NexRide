import { Hero } from "../components/home/Hero";
import { VehicleCategories } from "../components/home/VehicleCatigories";
import { TrendingRentals } from "../components/home/TrendingRentals";
import { NationwidePresence } from "../components/home/NationwidePresence";
import { HowItWorks } from "../components/home/HowItWorks";
import { PartnerSection } from "../components/home/PartnerSection";
import { TrustedOperators } from "../components/home/trustedOperators";
import { UncompromisingStandards } from "../components/home/UncompromisingStandards";

export const HomePage: React.FC = () => {
  return (
    <>
      <Hero />
      <VehicleCategories />
      <TrendingRentals />
      <NationwidePresence />
      <HowItWorks />
      <PartnerSection />
      <TrustedOperators />
      <UncompromisingStandards />
    </>
  );
};

export default HomePage;