import type { HowItWorksStep } from "../types/step";

export const HOW_IT_WORKS_STEPS: HowItWorksStep[] = [
  {
    stepNumber: "01",
    iconType: "search",
    title: "SEARCH",
    description:
      "Real-time inventories from licensed Libyan agencies with transparent daily rates in LYD. Filter by city, class, and tarmac delivery.",
    footerText: "Verified Fleet Database",
  },
  {
    stepNumber: "02",
    iconType: "compare",
    title: "COMPARE",
    description:
      "Compare technical specs, rental rules, insurance escrows, and verified customer ratings before locking your booking.",
    footerText: "Side-by-Side Clarity",
  },
  {
    stepNumber: "03",
    iconType: "reserve",
    title: "RESERVE",
    description:
      "Lock in vehicle instantly in 60s with digital booking token recognized across commercial checkpoints with escrow security.",
    footerText: "60-Second Escrow Lock",
  },
  {
    stepNumber: "04",
    iconType: "drive",
    title: "DRIVE",
    description:
      "Tarmac handover at Mitiga or Benina, or direct concierge delivery to your hotel or residence with keys ready.",
    footerText: "Instant Tarmac Handover",
  },
];
