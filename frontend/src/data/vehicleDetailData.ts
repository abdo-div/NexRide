import type { VehicleDetail, Requirement, ProtectionPlan, BookingTimes } from "../types/vehicleDetail";
import { MOCK_VEHICLES } from "./vehicleData";

const DEFAULT_REQUIREMENTS: Requirement[] = [
  {
    icon: "user",
    title: "vehicleDetail.reqAgeTitle",
    body: "vehicleDetail.reqAgeBody",
  },
  {
    icon: "credit",
    title: "vehicleDetail.reqDepositTitle",
    body: "vehicleDetail.reqDepositBody",
  },
  {
    icon: "docs",
    title: "vehicleDetail.reqDocsTitle",
    body: "vehicleDetail.reqDocsBody",
  },
  {
    icon: "gauge",
    title: "vehicleDetail.reqMileageTitle",
    body: "vehicleDetail.reqMileageBody",
  },
];

const DEFAULT_PROTECTION: ProtectionPlan[] = [
  {
    id: "standard",
    name: "vehicleDetail.planStandardName",
    description: "vehicleDetail.planStandardDesc",
    priceNote: "vehicleDetail.included",
    pricePerDay: 0,
    included: true,
  },
  {
    id: "executive",
    name: "vehicleDetail.planExecutiveName",
    description: "vehicleDetail.planExecutiveDesc",
    priceNote: "vehicleDetail.planExecutiveNote",
    pricePerDay: 120,
  },
];

const DEFAULT_BOOKING: Omit<BookingTimes, "pickupDefault" | "returnDefault"> = {
  pickupTimes: ["10:00 AM", "12:00 PM", "02:00 PM", "06:00 PM", "10:00 PM"],
  returnTimes: ["10:00 AM", "02:00 PM", "06:00 PM", "10:00 PM"],
  deliveryPoints: [
    "vehicleDetail.deliveryMji",
    "vehicleDetail.deliveryCorinthia",
    "Radisson Blu Al Mahary Hotel",
    "vehicleDetail.deliveryCustom",
  ],
};

const SEGMENT_CRUMB: Record<string, string> = {
  luxury: "vehicleDetail.crumbLuxurySuv",
  sports: "home.trending.categories.sportsCoupe",
  offroad: "home.trending.categories.desert4x4",
  economy: "vehicleDetail.crumbEconomy",
};

const SEGMENT_LABEL: Record<string, string> = {
  luxury: "vehicleDetail.segmentLuxury",
  sports: "vehicleDetail.segmentSports",
  offroad: "vehicleDetail.segmentOffroad",
  economy: "vehicleDetail.segmentEconomy",
};

const LOCATION_NAME: Record<string, string> = {
  mji: "Mitiga International Airport (MJI)",
  downtown: "Tripoli Downtown / Hai Al-Andalus",
  benina: "Benina Airport (BEN)",
  misrata: "Misrata Commercial Free Zone",
};

export const getVehicleLocationName = (locationId: string): string =>
  LOCATION_NAME[locationId] ?? locationId;

export const getVehicleSegmentKey = (segment: string): string =>
  SEGMENT_LABEL[segment] ?? segment;

export const G63_DETAIL: VehicleDetail = {
  id: "g63-magno",
  vehicle: MOCK_VEHICLES.find((v) => v.id === "g63-magno") ?? MOCK_VEHICLES[0],
  crumbs: [
    "vehicleDetail.crumbCars",
    "vehicleDetail.crumbLuxurySuv",
    "Mercedes-Benz",
    "AMG G63 (Tripoli)",
  ],
  badges: [
    { kind: "instant", text: "vehicleDetail.badgeInstant" },
    { kind: "plain", text: "vehicleDetail.badgeModelYear" },
    { kind: "plain", text: "vehicleDetail.badgeDriveModes" },
  ],
  ratingScore: "4.92",
  ratingCount: "vehicleDetail.verifiedBookings",
  ratingReviews: "142",
  operatorTier: "vehicleDetail.tierOne",
  locationLine: "vehicleDetail.locationLineG63",
  liveStatus: {
    label: "vehicleDetail.liveDispatch",
    caption: "vehicleDetail.statusReadyMji",
    color: "amber",
  },
  gallery: [
    {
      src: "https://images.unsplash.com/photo-1520031441872-265e4ff70366?auto=format&fit=crop&q=80&w=1400",
      alt: "vehicleDetail.altG63Showroom",
      master: true,
      label: "vehicleDetail.galleryObsidian",
      meta: "vehicleDetail.galleryMasterView",
      headline: "vehicleDetail.showcaseView",
    },
    {
      src: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&q=80&w=700",
      alt: "vehicleDetail.altMbux",
      label: "vehicleDetail.altMbux",
    },
    {
      src: "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&q=80&w=700",
      alt: "vehicleDetail.altExhausts",
      label: "vehicleDetail.altExhausts",
    },
    {
      src: "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&q=80&w=700",
      alt: "vehicleDetail.altAlloys",
      label: "vehicleDetail.altAlloysShort",
    },
  ],
  metrics: [
    {
      icon: "settings",
      label: "vehicleDetail.metricGearbox",
      value: "AMG SPEEDSHIFT 9G",
      sub: "vehicleDetail.metricSubPaddle",
    },
    {
      icon: "zap",
      label: "vehicleDetail.metricOutput",
      value: "577 HP / 850 Nm",
      sub: "vehicleDetail.metricSubV8",
    },
    {
      icon: "armchair",
      label: "vehicleDetail.metricSeating",
      value: "vehicleDetail.valueExecutiveSeats",
      sub: "vehicleDetail.metricSubNappa",
    },
    {
      icon: "fuel",
      label: "vehicleDetail.metricFuel",
      value: "vehicleDetail.valueOctane98",
      sub: "vehicleDetail.metricSubFullToFull",
    },
    {
      icon: "compass",
      label: "vehicleDetail.metricDrivetrain",
      value: "Permanent 4MATIC",
      sub: "vehicleDetail.metricSubDiffLocks",
    },
    {
      icon: "luggage",
      label: "vehicleDetail.metricLuggage",
      value: "vehicleDetail.valueLiters667",
      sub: "vehicleDetail.metricSubBags",
    },
  ],
  descriptionHeading: "vehicleDetail.descHeadingG63",
  descriptionParagraphs: ["vehicleDetail.descPara1G63", "vehicleDetail.descPara2G63"],
  features: [
    "vehicleDetail.featureBurmester",
    "vehicleDetail.featureCamera360",
    "vehicleDetail.featureCarplay",
    "vehicleDetail.featureDampers",
  ],
  specGroups: [
    {
      icon: "zap",
      title: "vehicleDetail.specGroupPower",
      rows: [
        { label: "vehicleDetail.specEngine", value: "vehicleDetail.specValEngineV8" },
        { label: "vehicleDetail.specHorsepower", value: "vehicleDetail.specValHorsepower" },
        { label: "vehicleDetail.specTorque", value: "vehicleDetail.specValTorque" },
        { label: "vehicleDetail.specAcceleration", value: "vehicleDetail.specValAcceleration", accent: true },
        { label: "vehicleDetail.specTopSpeed", value: "vehicleDetail.specValTopSpeed" },
      ],
    },
    {
      icon: "armchair",
      title: "vehicleDetail.specGroupInterior",
      rows: [
        { label: "vehicleDetail.specUpholstery", value: "vehicleDetail.specValNappa" },
        { label: "vehicleDetail.specSunroof", value: "vehicleDetail.specValSunroof" },
        { label: "vehicleDetail.specClimate", value: "vehicleDetail.specValClimate" },
        { label: "vehicleDetail.specAirPurification", value: "vehicleDetail.specValAirPurification" },
        { label: "vehicleDetail.specSoundDamping", value: "vehicleDetail.specValAcoustic" },
      ],
    },
    {
      icon: "shield",
      title: "vehicleDetail.specGroupSecurity",
      rows: [
        { label: "vehicleDetail.specTelematics", value: "vehicleDetail.specValTelematics", accent: true },
        { label: "vehicleDetail.specEmergencySos", value: "vehicleDetail.specValNationalAssist" },
        { label: "vehicleDetail.specBlindSpot", value: "vehicleDetail.specValRadarAssist" },
        { label: "vehicleDetail.specCameras", value: "vehicleDetail.specValSurroundView" },
        { label: "vehicleDetail.specArmoring", value: "vehicleDetail.specValChassis" },
      ],
    },
  ],
  policyMeta: "vehicleDetail.zeroPaperwork",
  requirements: DEFAULT_REQUIREMENTS,
  hubBadge: "vehicleDetail.hubBadgeMji",
  hubs: [
    {
      icon: "plane",
      name: "vehicleDetail.hubOneName",
      description: "vehicleDetail.hubOneDesc",
    },
    {
      icon: "building",
      name: "vehicleDetail.hubTwoName",
      description: "vehicleDetail.hubTwoDesc",
    },
  ],
  conciergeTitle: "vehicleDetail.conciergeChauffeurTitle",
  conciergeBody: "vehicleDetail.conciergeBodyFull",
  mapLinkLabel: "vehicleDetail.viewZoneMap",
  operator: {
    name: "Star Rentals Libya",
    meta: "vehicleDetail.operatorMetaPartner",
    rating: 4.95,
    completedRentals: "vehicleDetail.completedRentalsFixed",
    responseTime: "vehicleDetail.responseTime",
  },
  ratingsBig: "4.9",
  ratingsTag: "vehicleDetail.verifiedDriversFull",
  ratingsSub: "vehicleDetail.ratingsSub",
  ratingBars: [
    { label: "vehicleDetail.barCleanliness", score: "5.0 / 5.0", percent: 100 },
    { label: "vehicleDetail.barHandover", score: "4.9 / 5.0", percent: 98 },
    { label: "vehicleDetail.barMechanical", score: "5.0 / 5.0", percent: 100 },
    { label: "vehicleDetail.barCommunication", score: "4.9 / 5.0", percent: 97 },
  ],
  reviews: [
    {
      author: "Tariq Al-Mansouri",
      initials: "TA",
      avatarClass: "bg-blue-100 text-[#2563EB]",
      context: "vehicleDetail.reviewCtxCorporate",
      timeAgo: "vehicleDetail.timeTwoWeeks",
      body: "vehicleDetail.reviewBodyOne",
    },
    {
      author: "Mahmoud K. El-Warfalli",
      initials: "MK",
      avatarClass: "bg-slate-200 text-[#0F172A]",
      context: "vehicleDetail.reviewCtxWedding",
      timeAgo: "vehicleDetail.timeLastMonth",
      body: "vehicleDetail.reviewBodyTwo",
    },
  ],
  similarHeading: "vehicleDetail.similarHeading",
  similarSub: "vehicleDetail.similarSub",
  similarLinkLabel: "vehicleDetail.similarLinkLabel",
  similar: [
    {
      id: "porsche-gt3",
      title: "Porsche 911 GT3 (2024)",
      subtitle: "vehicleDetail.subtitleFlatSix",
      image:
        "https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?auto=format&fit=crop&q=80&w=900",
      tag: "vehicleDetail.tagTrack",
      pricePerDay: 1600,
      specs: [
        { label: "2 Seats", value: "" },
        { label: "PDK 7-Spd", value: "" },
      ],
    },
    {
      id: "land-cruiser-300",
      title: "Toyota Land Cruiser 300 VXR",
      subtitle: "vehicleDetail.subtitleTwinTurbo",
      image:
        "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=900",
      tag: "vehicleDetail.tagAllTerrain",
      pricePerDay: 850,
      specs: [
        { label: "7 Seats", value: "" },
        { label: "vehicleDetail.valueFull4wd", value: "" },
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
  deposit: { label: "vehicleDetail.depositLabel", amount: "vehicleDetail.depositAmount" },
  freeIncluded: ["vehicleDetail.freeMeetGreet", "vehicleDetail.freeRoadside"],
  reserveLabel: "vehicleDetail.reserveNow",
  reserveDoneLabel: "vehicleDetail.confirmedWith",
  trustSignals: [
    { icon: "check", text: "vehicleDetail.trustCancellation" },
    { icon: "shield", text: "vehicleDetail.trustContract" },
    { icon: "lock", text: "vehicleDetail.trustEscrow" },
  ],
  cancellationNote: "vehicleDetail.trustCancellation",
  contractNote: "vehicleDetail.trustContract",
  paymentNote: "vehicleDetail.trustEscrow",
};

const buildFallbackDetail = (id: string): VehicleDetail => {
  const v = MOCK_VEHICLES.find((x) => x.id === id) ?? MOCK_VEHICLES[0];
  return {
    id: v.id,
    vehicle: v,
    crumbs: [
      "vehicleDetail.crumbCars",
      SEGMENT_CRUMB[v.segment] ?? v.category.split(" · ")[0] ?? "vehicleDetail.crumbVehicles",
      v.title,
    ],
    badges: [
      ...(v.isInstantConfirmation ? [{ kind: "instant" as const, text: "vehicleDetail.badgeInstant" }] : []),
      {
        kind: "plain" as const,
        text: v.segment === "luxury" ? "vehicleDetail.badgeModelYear" : "vehicleDetail.badgeVerified",
      },
    ],
    ratingScore: v.operator.rating.toFixed(2),
    ratingCount: "vehicleDetail.verifiedBookings",
    ratingReviews: String(v.operator.reviewsCount),
    operatorTier: "vehicleDetail.tierOne",
    locationLine: "vehicleDetail.locationLine",
    liveStatus: {
      label: "vehicleDetail.liveDispatch",
      caption: "vehicleDetail.statusReadyAt",
      color: "amber" as const,
    },
    gallery: [
      {
        src: v.image,
        alt: v.title,
        master: true,
        label: "vehicleDetail.galleryModelHub",
        meta: "vehicleDetail.galleryMasterViewAlt",
        headline: "vehicleDetail.showcaseView",
      },
      { src: v.image, alt: "vehicleDetail.altCockpit", label: "vehicleDetail.labelCockpit" },
      { src: v.image, alt: "vehicleDetail.altProfile", label: "vehicleDetail.labelProfile" },
    ],
    metrics: [
      { icon: "settings", label: "vehicleDetail.metricGearbox", value: v.specs.gearbox, sub: v.specs.engine },
      {
        icon: "zap",
        label: "vehicleDetail.metricOutput",
        value: v.specs.engine,
        sub: "vehicleDetail.factoryCalibration",
      },
      {
        icon: "armchair",
        label: "vehicleDetail.metricSeating",
        value: v.specs.seats,
        sub: "vehicleDetail.metricSubRearClimate",
      },
      {
        icon: "fuel",
        label: "vehicleDetail.metricFuel",
        value: v.specs.fuel,
        sub: "vehicleDetail.metricSubFullToFull",
      },
      {
        icon: "compass",
        label: "vehicleDetail.metricDrivetrain",
        value: v.drive === "auto" ? "vehicleDetail.valueAutoAwd" : "vehicleDetail.valueManualDrive",
        sub: "vehicleDetail.metricSubTerrainAssist",
      },
      {
        icon: "luggage",
        label: "vehicleDetail.metricLuggage",
        value: "vehicleDetail.valueFullTrunk",
        sub: "vehicleDetail.metricSubBagsCabin",
      },
    ],
    descriptionHeading: "vehicleDetail.descHeading",
    descriptionParagraphs: ["vehicleDetail.descPara1", "vehicleDetail.descPara2"],
    features: v.perks,
    specGroups: [
      {
        icon: "zap",
        title: "vehicleDetail.specGroupPower",
        rows: [
          { label: "vehicleDetail.specEngine", value: v.specs.engine },
          { label: "vehicleDetail.specGearbox", value: v.specs.gearbox },
          { label: "vehicleDetail.specFuel", value: v.specs.fuel },
          {
            label: "vehicleDetail.specDailyRate",
            value: `${v.pricePerDay.toLocaleString()} LYD`,
            accent: true,
          },
        ],
      },
      {
        icon: "armchair",
        title: "vehicleDetail.specGroupCabin",
        rows: [
          { label: "vehicleDetail.specCapacity", value: v.specs.seats },
          { label: "vehicleDetail.specCategory", value: v.category },
          { label: "vehicleDetail.specSegment", value: SEGMENT_LABEL[v.segment] ?? v.segment.toUpperCase() },
        ],
      },
      {
        icon: "shield",
        title: "vehicleDetail.specGroupSecurity",
        rows: [
          { label: "vehicleDetail.specTelematics", value: "vehicleDetail.specValTelematics", accent: true },
          { label: "vehicleDetail.specEmergencySos", value: "vehicleDetail.specValNationalAssist" },
          { label: "vehicleDetail.specRecovery", value: "vehicleDetail.specValRoadRescue" },
        ],
      },
    ],
    policyMeta: "vehicleDetail.zeroPaperwork",
    requirements: DEFAULT_REQUIREMENTS,
    hubBadge: "vehicleDetail.hubBadgeGeneric",
    hubs: [
      {
        icon: "plane",
        name: "vehicleDetail.hubOneName",
        description: "vehicleDetail.hubOneDesc",
      },
      {
        icon: "building",
        name: "vehicleDetail.hubTwoName",
        description: "vehicleDetail.hubTwoDesc",
      },
    ],
    conciergeTitle: "vehicleDetail.conciergeDeliveryTitle",
    conciergeBody: "vehicleDetail.conciergeBody",
    mapLinkLabel: "vehicleDetail.viewZoneMap",
    operator: {
      name: v.operator.name,
      meta: "vehicleDetail.operatorMetaVerified",
      rating: v.operator.rating,
      completedRentals: "vehicleDetail.completedRentals",
      responseTime: "vehicleDetail.responseTime",
    },
    ratingsBig: v.operator.rating.toFixed(1),
    ratingsTag: "vehicleDetail.verifiedDrivers",
    ratingsSub: "vehicleDetail.ratingsSub",
    ratingBars: [
      { label: "vehicleDetail.barCleanliness", score: "4.9 / 5.0", percent: 98 },
      { label: "vehicleDetail.barHandover", score: "4.8 / 5.0", percent: 96 },
      { label: "vehicleDetail.barMechanical", score: "4.9 / 5.0", percent: 98 },
      {
        label: "vehicleDetail.barCommunication",
        score: `${v.operator.rating.toFixed(1)} / 5.0`,
        percent: Math.round(v.operator.rating * 20),
      },
    ],
    reviews: [
      {
        author: "Sami B. El-Turki",
        initials: "SB",
        avatarClass: "bg-blue-100 text-[#2563EB]",
        context: "vehicleDetail.reviewCtxExecutive",
        timeAgo: "vehicleDetail.timeThreeWeeks",
        body: "vehicleDetail.reviewBodyThree",
      },
      {
        author: "Nour A. Al-Haddad",
        initials: "NA",
        avatarClass: "bg-slate-200 text-[#0F172A]",
        context: "vehicleDetail.reviewCtxAirport",
        timeAgo: "vehicleDetail.timeLastMonth",
        body: "vehicleDetail.reviewBodyFour",
      },
    ],
    similarHeading: "vehicleDetail.similarHeading",
    similarSub: "vehicleDetail.similarSub",
    similarLinkLabel: "vehicleDetail.similarLinkLabel",
    similar: MOCK_VEHICLES.filter((x) => x.id !== v.id)
      .slice(0, 2)
      .map((x) => ({
        id: x.id,
        title: x.title,
        subtitle: `${x.specs.engine} · ${x.category}`,
        image: x.image,
        tag: SEGMENT_LABEL[x.segment] ?? x.segment.toUpperCase(),
        pricePerDay: x.pricePerDay,
        specs: [
          { label: x.specs.seats, value: "" },
          { label: x.drive === "auto" ? "data.common.automatic" : "data.common.manual", value: "" },
        ],
      })),
    minDays: 2,
    booking: {
      pickupDefault: "2025-05-10",
      returnDefault: "2025-05-15",
      ...DEFAULT_BOOKING,
    },
    protectionPlans: DEFAULT_PROTECTION,
    deposit: { label: "vehicleDetail.depositLabel", amount: "vehicleDetail.depositAmount" },
    freeIncluded: ["vehicleDetail.freeMeetGreet", "vehicleDetail.freeRoadside"],
    reserveLabel: "vehicleDetail.reserveNow",
    reserveDoneLabel: "vehicleDetail.confirmedWith",
    trustSignals: [
      { icon: "check", text: "vehicleDetail.trustCancellation" },
      { icon: "shield", text: "vehicleDetail.trustContract" },
      { icon: "lock", text: "vehicleDetail.trustEscrow" },
    ],
    cancellationNote: G63_DETAIL.cancellationNote,
    contractNote: G63_DETAIL.contractNote,
    paymentNote: G63_DETAIL.paymentNote,
  };
};

/**
 * True when the id belongs to the placeholder fleet. The Fleet page now links
 * real MongoDB ids, which have no static detail template yet.
 */
export const hasStaticDetail = (id?: string): boolean =>
  Boolean(id) && MOCK_VEHICLES.some((v) => v.id === id);

export const getVehicleDetail = (id?: string): VehicleDetail => {
  if (id && id !== "g63-magno" && hasStaticDetail(id)) {
    return buildFallbackDetail(id);
  }
  return G63_DETAIL;
};
