import type { VehicleDetail, Requirement, ProtectionPlan, BookingTimes } from "../types/vehicleDetail";
import { MOCK_VEHICLES } from "./vehicleData";

const DEFAULT_REQUIREMENTS: Requirement[] = [
  {
    icon: "user",
    title: "Age Requirement: 23+",
    body: "Primary driver must hold a clean driving record for at least 2 full calendar years.",
  },
  {
    icon: "credit",
    title: "Security Deposit",
    body: "Refundable 2,500 LYD pre-authorization hold via Local Card, Visa, Mastercard, or Cash escrow.",
  },
  {
    icon: "docs",
    title: "Documentation Required",
    body: "Valid Libyan National ID / Passport, and Libyan Driving License or International Driver's Permit (IDP).",
  },
  {
    icon: "gauge",
    title: "Daily Mileage Allowance",
    body: "300 km / day included free of charge. Excess distance billed at a transparent 2.50 LYD per kilometer.",
  },
];

const DEFAULT_PROTECTION: ProtectionPlan[] = [
  {
    id: "standard",
    name: "Standard Escrow Protection",
    description: "Third-party liability + 2,500 LYD deductible",
    priceNote: "Included",
    pricePerDay: 0,
    included: true,
  },
  {
    id: "executive",
    name: "Comprehensive Executive Shield",
    description: "Zero deductible, rim & glass coverage",
    priceNote: "+120 LYD/d",
    pricePerDay: 120,
  },
];

const DEFAULT_BOOKING: Omit<BookingTimes, "pickupDefault" | "returnDefault"> = {
  pickupTimes: ["10:00 AM", "12:00 PM", "02:00 PM", "06:00 PM", "10:00 PM"],
  returnTimes: ["10:00 AM", "02:00 PM", "06:00 PM", "10:00 PM"],
  deliveryPoints: [
    "Mitiga International Airport (VIP Lounge Concourse)",
    "Corinthia Hotel Tripoli (Valet Deck)",
    "Radisson Blu Al Mahary Hotel",
    "Custom Concierge Address in Greater Tripoli",
  ],
};

export const G63_DETAIL: VehicleDetail = {
  id: "g63-magno",
  vehicle: MOCK_VEHICLES.find((v) => v.id === "g63-magno") ?? MOCK_VEHICLES[0],
  crumbs: ["Cars", "Luxury SUVs", "Mercedes-Benz", "AMG G63 (Tripoli)"],
  badges: [
    { kind: "instant", text: "Instant Confirmation" },
    { kind: "plain", text: "Model Year 2024" },
    { kind: "plain", text: "Chauffeured or Self-Drive" },
  ],
  ratingScore: "4.92",
  ratingCount: "142 verified Libyan bookings",
  ratingReviews: "142",
  operatorTier: "Tier 1",
  locationLine: "Tripoli: Mitiga VIP & Corinthia Tripoli Hub",
  liveStatus: {
    label: "Live Dispatch Status",
    caption: "Inspected & Ready at Mitiga VIP Terminal",
    color: "amber",
  },
  gallery: [
    {
      src: "https://images.unsplash.com/photo-1520031441872-265e4ff70366?auto=format&fit=crop&q=80&w=1400",
      alt: "Mercedes-AMG G63 Black Edition Tripoli Showroom",
      master: true,
      label: "Obsidian Edition · Tripoli Fleet Hub 01",
      meta: "Master View 1 of 12",
      headline: "Showcase View",
    },
    {
      src: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&q=80&w=700",
      alt: "MBUX Dual Cockpit & Carbon Trim",
      label: "MBUX Dual Cockpit & Carbon Trim",
    },
    {
      src: "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&q=80&w=700",
      alt: "AMG Twin Side Exhausts",
      label: "AMG Twin Side Exhausts",
    },
    {
      src: "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&q=80&w=700",
      alt: "22-inch AMG Forged Cross-Spoke Alloys",
      label: `22" Forged Cross-Spoke Alloys`,
    },
  ],
  metrics: [
    { icon: "settings", label: "Gearbox", value: "AMG SPEEDSHIFT 9G", sub: "Paddle Shift Select" },
    { icon: "zap", label: "Output", value: "577 HP / 850 Nm", sub: "4.0L V8 Biturbo" },
    { icon: "armchair", label: "Seating", value: "5 Executive Seats", sub: "Nappa Heated & Ventilated" },
    { icon: "fuel", label: "Fuel Protocol", value: "Octane 98 Petrol", sub: "Full-to-Full Policy" },
    { icon: "compass", label: "Drivetrain", value: "Permanent 4MATIC", sub: "3 Differential Locks 100%" },
    { icon: "luggage", label: "Luggage Space", value: "667 Liters", sub: "4 Large + 2 Carry-on Bags" },
  ],
  descriptionHeading: "Executive Presence & Tactical Road Command in Libya",
  descriptionParagraphs: [
    "The Mercedes-AMG G63 stands unchallenged at the intersection of unapologetic authority, track-bred acceleration, and unyielding multi-terrain capability. Finished in Obsidian Night Magno, this 2024 allocation has been hand-selected by Star Rentals Libya for diplomats, corporate executives, and high-profile wedding delegations demanding unquestioned prestige throughout Tripoli and the coastal corridor.",
    "Equipped with a handcrafted 4.0-liter twin-turbocharged V8 generating 577 horsepower, the G63 effortlessly glides down the Tripoli Ring Road while maintaining supreme acoustic composure thanks to double-laminated acoustic privacy glazing. Triple electronic differential locks ensure uninterrupted forward progress whether navigating sand-dusted desert trails towards Gharyan or high-security diplomatic convoys in downtown Tripoli.",
  ],
  features: [
    "Burmester® 3D Surround Sound (15 Speakers)",
    "360° Camera with Transparent Hood Tech",
    "Wireless Apple CarPlay & Android Auto",
    "Adaptive Dampers with AMG RIDE CONTROL",
  ],
  specGroups: [
    {
      icon: "zap",
      title: "Power & Mechanics",
      rows: [
        { label: "Engine", value: "4.0L V8 Handcrafted" },
        { label: "Horsepower", value: "577 hp @ 6,000 RPM" },
        { label: "Torque", value: "850 Nm @ 2,500 RPM" },
        { label: "0-100 km/h", value: "4.5 Seconds", accent: true },
        { label: "Top Speed", value: "240 km/h (Gov. Limited)" },
      ],
    },
    {
      icon: "armchair",
      title: "Interior & Comfort",
      rows: [
        { label: "Upholstery", value: "Exclusive Nappa Leather" },
        { label: "Sunroof", value: "Electric Tilt & Slide Glass" },
        { label: "Climate", value: "Tri-Zone Thermotronic" },
        { label: "Air Purification", value: "Air-Balance Ionization" },
        { label: "Sound Dampening", value: "Acoustic Shield Glass" },
      ],
    },
    {
      icon: "shield",
      title: "Security & Tracking",
      rows: [
        { label: "Telematics", value: "Real-time GPS 24/7", accent: true },
        { label: "Emergency SOS", value: "Libyan National Assist" },
        { label: "Blind Spot", value: "Active Radar Assist" },
        { label: "Cameras", value: "Surround View 360°" },
        { label: "Armoring Ready", value: "Reinforced Chassis" },
      ],
    },
  ],
  policyMeta: "Zero Paperwork at Pickup",
  requirements: DEFAULT_REQUIREMENTS,
  hubBadge: "Complimentary Mitiga Terminal Meet",
  hubs: [
    {
      icon: "plane",
      name: "Hub 1: Mitiga Int'l Airport (MJI)",
      description:
        "Terminal VIP Lounge Concourse, Tripoli. Dedicated NexRide bay with chilled executive delivery.",
    },
    {
      icon: "building",
      name: "Hub 2: Corinthia Hotel Tripoli",
      description:
        "Souk Al Thulatha, Downtown Tripoli Waterfront. Valet reception desk available 24 hours.",
    },
  ],
  conciergeTitle: "Direct Concierge Chauffeur Available",
  conciergeBody:
    "We can also deliver directly to any private villa or embassy compound in Greater Tripoli.",
  mapLinkLabel: "View Delivery Zone Map",
  operator: {
    name: "Star Rentals Libya",
    meta: "Commercial Fleet Partner #LY-1104 · Tripoli & Misrata Branches",
    rating: 4.95,
    completedRentals: "1,280+ Completed Rentals",
    responseTime: "5 Min Average Response Time",
  },
  ratingsBig: "4.9",
  ratingsTag: "100% Verified Drivers",
  ratingsSub: "Based on 142 completed journeys in Tripoli & Benghazi",
  ratingBars: [
    { label: "Vehicle Cleanliness & Detailing", score: "5.0 / 5.0", percent: 100 },
    { label: "Airport Handover Velocity", score: "4.9 / 5.0", percent: 98 },
    { label: "Mechanical & Engine Integrity", score: "5.0 / 5.0", percent: 100 },
    { label: "Host Communication", score: "4.9 / 5.0", percent: 97 },
  ],
  reviews: [
    {
      author: "Tariq Al-Mansouri",
      initials: "TA",
      avatarClass: "bg-blue-100 text-[#2563EB]",
      context: "Corporate Delegation · 7 Days Rental",
      timeAgo: "2 weeks ago",
      body: "Impeccable vehicle state. Star Rentals handed over the G63 curbside at Mitiga VIP lounge within 4 minutes of walking off the tarmac. Freshly detailed, full tank of 98 octane, and zero delays during return.",
    },
    {
      author: "Mahmoud K. El-Warfalli",
      initials: "MK",
      avatarClass: "bg-slate-200 text-[#0F172A]",
      context: "Wedding Escort Convoy · 3 Days",
      timeAgo: "Last month",
      body: "The sound of the V8 twin exhausts through the downtown streets was breathtaking. Completely flawless mechanical condition. Will definitely be renting again for executive foreign guest arrivals.",
    },
  ],
  similarHeading: "Alternative Executive Options",
  similarSub: "Available for immediate delivery in Greater Tripoli",
  similarLinkLabel: "View All Prestige Fleet",
  similar: [
    {
      id: "porsche-gt3",
      title: "Porsche 911 GT3 (2024)",
      subtitle: "4.0L Naturally Aspirated Flat-6 · 502 HP",
      image:
        "https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?auto=format&fit=crop&q=80&w=900",
      tag: "Track & Grand Touring",
      pricePerDay: 1600,
      specs: [
        { label: "2 Seats", value: "" },
        { label: "PDK 7-Spd", value: "" },
      ],
    },
    {
      id: "land-cruiser-300",
      title: "Toyota Land Cruiser 300 VXR",
      subtitle: "3.5L Twin Turbo V6 · 7 Passenger Luxury",
      image:
        "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=900",
      tag: "All-Terrain Flagship",
      pricePerDay: 850,
      specs: [
        { label: "7 Seats", value: "" },
        { label: "Full 4WD", value: "" },
      ],
    },
  ],
  minDays: 2,
  booking: {
    pickupDefault: "2025-05-10",
    returnDefault: "2025-05-15",
    ...DEFAULT_BOOKING,
  },
  protectionPlans: DEFAULT_PROTECTION,
  deposit: { label: "Refundable Security Deposit", amount: "2,500 LYD (Held)" },
  freeIncluded: ["Airport VIP Terminal Meet & Greet", "24/7 Nationwide Satellite Roadside Assist"],
  reserveLabel: "Reserve Vehicle Now",
  reserveDoneLabel: "Confirmed with Star Rentals!",
  trustSignals: [
    {
      icon: "check",
      text: "Free cancellation up to 24 hours prior to pickup",
    },
    { icon: "shield", text: "Official Libyan Ministry of Transport e-Contract" },
    {
      icon: "lock",
      text: "Encrypted local card, wire, or cash escrow confirmation",
    },
  ],
  cancellationNote: "Free cancellation up to 24 hours prior to pickup",
  contractNote: "Official Libyan Ministry of Transport e-Contract",
  paymentNote: "Encrypted local card, wire, or cash escrow confirmation",
};

const buildFallbackDetail = (id: string): VehicleDetail => {
  const v = MOCK_VEHICLES.find((x) => x.id === id) ?? MOCK_VEHICLES[0];
  return {
    id: v.id,
    vehicle: v,
    crumbs: ["Cars", v.category.split(" · ")[0] ?? "Vehicles", v.title],
    badges: [
      ...(v.isInstantConfirmation ? [{ kind: "instant" as const, text: "Instant Confirmation" }] : []),
      { kind: "plain" as const, text: v.segment === "luxury" ? "Model Year 2024" : "Verified Availability" },
    ],
    ratingScore: v.operator.rating.toFixed(2),
    ratingCount: `${v.operator.reviewsCount} verified Libyan bookings`,
    ratingReviews: String(v.operator.reviewsCount),
    operatorTier: "Tier 1",
    locationLine: `Tripoli: ${v.location} Hub Delivery`,
    liveStatus: {
      label: "Live Dispatch Status",
      caption: `Inspected & Ready at ${v.operator.name}`,
      color: "amber" as const,
    },
    gallery: [
      { src: v.image, alt: v.title, master: true, label: `${v.title} · Tripoli Hub`, meta: "Master View 1 of 6", headline: "Showcase View" },
      { src: v.image, alt: "Interior cockpit detail", label: "Executive Cockpit" },
      { src: v.image, alt: "Rear side profile", label: "Dynamic Profile" },
    ],
    metrics: [
      { icon: "settings", label: "Gearbox", value: v.specs.gearbox, sub: v.specs.engine },
      { icon: "zap", label: "Output", value: v.specs.engine, sub: "Factory Calibration" },
      { icon: "armchair", label: "Seating", value: v.specs.seats, sub: "Rear Climate Ready" },
      { icon: "fuel", label: "Fuel Protocol", value: v.specs.fuel, sub: "Full-to-Full Policy" },
      { icon: "compass", label: "Drivetrain", value: v.drive === "auto" ? "Automatic AWD" : "Manual Drive", sub: "Terrain Assist" },
      { icon: "luggage", label: "Luggage Space", value: "Full Trunk", sub: "4 Bags + Cabin Suites" },
    ],
    descriptionHeading: `${v.title} — Executive Grade Rental in Libya`,
    descriptionParagraphs: [
      `Fully inspected and telemetry-synchronized, this ${v.segment.replace("-", " ")} vehicle is delivered ready for both business and leisure use across Greater Tripoli.`,
      `Operated by ${v.operator.name} with a ${v.operator.rating.toFixed(1)} verified partner rating, every reservation includes GPS recovery, licensed commercial liability, and 24/7 Tripoli rapid replacement units.`,
    ],
    features: v.perks,
    specGroups: [
      {
        icon: "zap",
        title: "Power & Mechanics",
        rows: [
          { label: "Engine", value: v.specs.engine },
          { label: "Gearbox", value: v.specs.gearbox },
          { label: "Fuel", value: v.specs.fuel },
          { label: "Daily Rate", value: `${v.pricePerDay.toLocaleString()} LYD`, accent: true },
        ],
      },
      {
        icon: "armchair",
        title: "Cabin & Comfort",
        rows: [
          { label: "Capacity", value: v.specs.seats },
          { label: "Category", value: v.category },
          { label: "Segment", value: v.segment.toUpperCase() },
        ],
      },
      {
        icon: "shield",
        title: "Security & Tracking",
        rows: [
          { label: "Telematics", value: "Real-time GPS 24/7", accent: true },
          { label: "Emergency SOS", value: "Libyan National Assist" },
          { label: "Recovery", value: "NexRide Road Rescue" },
        ],
      },
    ],
    policyMeta: "Zero Paperwork at Pickup",
    requirements: DEFAULT_REQUIREMENTS,
    hubBadge: "Complimentary Hub Meet Delivery",
    hubs: [
      {
        icon: "plane",
        name: "Hub 1: Mitiga Int'l Airport (MJI)",
        description: "Terminal VIP Lounge Concourse, Tripoli. Dedicated NexRide bay with chilled executive delivery.",
      },
      {
        icon: "building",
        name: "Hub 2: Corinthia Hotel Tripoli",
        description: "Souk Al Thulatha, Downtown Tripoli Waterfront. Valet reception desk available 24 hours.",
      },
    ],
    conciergeTitle: "Direct Concierge Delivery Available",
    conciergeBody: "Delivered directly to any private villa or embassy compound in Greater Tripoli.",
    mapLinkLabel: "View Delivery Zone Map",
    operator: {
      name: v.operator.name,
      meta: `Commercial Fleet Partner · Verified Operator`,
      rating: v.operator.rating,
      completedRentals: `${v.operator.reviewsCount}+ Completed Rentals`,
      responseTime: "5 Min Average Response Time",
    },
    ratingsBig: v.operator.rating.toFixed(1),
    ratingsTag: "Verified Drivers",
    ratingsSub: `Based on ${v.operator.reviewsCount} completed journeys in Tripoli & Benghazi`,
    ratingBars: [
      { label: "Vehicle Cleanliness & Detailing", score: "4.9 / 5.0", percent: 98 },
      { label: "Airport Handover Velocity", score: "4.8 / 5.0", percent: 96 },
      { label: "Mechanical & Engine Integrity", score: "4.9 / 5.0", percent: 98 },
      { label: "Host Communication", score: `${v.operator.rating.toFixed(1)} / 5.0`, percent: Math.round(v.operator.rating * 20) },
    ],
    reviews: [
      {
        author: "Sami B. El-Turki",
        initials: "SB",
        avatarClass: "bg-blue-100 text-[#2563EB]",
        context: "Executive Booking · 5 Days",
        timeAgo: "3 weeks ago",
        body: `Smooth handover at the designated hub. The ${v.title.split(" ").slice(0, 3).join(" ")} was immaculate and exactly as described.`,
      },
      {
        author: "Nour A. Al-Haddad",
        initials: "NA",
        avatarClass: "bg-slate-200 text-[#0F172A]",
        context: "Airport Arrival · 2 Days",
        timeAgo: "Last month",
        body: `Flawless pickup from the airport terminal and a transparent return process. The verified partner rating is well earned.`,
      },
    ],
    similarHeading: "Alternative Executive Options",
    similarSub: "Available for immediate delivery in Greater Tripoli",
    similarLinkLabel: "View All Prestige Fleet",
    similar: MOCK_VEHICLES.filter((x) => x.id !== v.id)
      .slice(0, 2)
      .map((x) => ({
        id: x.id,
        title: x.title,
        subtitle: `${x.specs.engine} · ${x.category}`,
        image: x.image,
        tag: x.segment.toUpperCase(),
        pricePerDay: x.pricePerDay,
        specs: [
          { label: x.specs.seats, value: "" },
          { label: x.drive === "auto" ? "Auto" : "Manual", value: "" },
        ],
      })),
    minDays: 2,
    booking: {
      pickupDefault: "2025-05-10",
      returnDefault: "2025-05-15",
      ...DEFAULT_BOOKING,
    },
    protectionPlans: DEFAULT_PROTECTION,
    deposit: { label: "Refundable Security Deposit", amount: "2,500 LYD (Held)" },
    freeIncluded: ["Airport VIP Terminal Meet & Greet", "24/7 Nationwide Satellite Roadside Assist"],
    reserveLabel: "Reserve Vehicle Now",
    reserveDoneLabel: `Confirmed with ${v.operator.name}!`,
    trustSignals: [
      { icon: "check", text: "Free cancellation up to 24 hours prior to pickup" },
      { icon: "shield", text: "Official Libyan Ministry of Transport e-Contract" },
      { icon: "lock", text: "Encrypted local card, wire, or cash escrow confirmation" },
    ],
    cancellationNote: G63_DETAIL.cancellationNote,
    contractNote: G63_DETAIL.contractNote,
    paymentNote: G63_DETAIL.paymentNote,
  };
};

export const getVehicleDetail = (id?: string): VehicleDetail => {
  if (id && id !== "g63-magno" && MOCK_VEHICLES.some((v) => v.id === id)) {
    return buildFallbackDetail(id);
  }
  return G63_DETAIL;
};