import { mapVehicle, photoUrl, vehiclePlaceholderImage } from "./vehicleMapper";
import type { Vehicle, VehicleDto } from "../types/vehicle";
import type { VehicleDetail, GalleryImage } from "../types/vehicleDetail";

const SEGMENT_LABEL_KEY: Record<string, string> = {
  luxury: "vehicleDetail.segmentLuxury",
  sports: "vehicleDetail.segmentSports",
  offroad: "vehicleDetail.segmentOffroad",
  economy: "vehicleDetail.segmentEconomy",
};

const OPERATIONAL_BADGE: Record<string, string> = {
  AVAILABLE: "vehicleDetail.statusAvailableNow",
  MAINTENANCE: "vehicleDetail.statusMaintenance",
  SUSPENDED: "vehicleDetail.statusUnavailable",
};

/**
 * Builds a detail page for a vehicle loaded from the database. Everything that
 * the components translate again is stored as an i18n key; everything else is a
 * raw database value. No amounts, features or guarantees are invented: sparse
 * vehicles simply render less.
 */
export const buildVehicleDetail = (
  dto: VehicleDto,
  similarDtos: VehicleDto[],
): VehicleDetail => {
  const vehicle: Vehicle = mapVehicle(dto);
  const companyName = vehicle.operator.name;
  const typeKey = `fleet.types.${dto.type}`;
  const transmissionKey = `fleet.transmissions.${dto.transmission}`;
  const fuelKey = `fleet.fuelTypes.${dto.fuelType}`;
  const city = dto.city?.trim();
  const pickup = dto.pickupLocation?.trim();
  const description = dto.description?.trim();

  const gallery: GalleryImage[] = (dto.photos ?? []).map((photo, index) => ({
    src: photoUrl(photo),
    alt: vehicle.title,
    ...(index === 0
      ? {
          master: true,
          label: "vehicleDetail.galleryModelHub",
          meta: "vehicleDetail.galleryMasterViewAlt",
          headline: "vehicleDetail.showcaseView",
        }
      : { label: "vehicleDetail.labelCockpit" }),
  }));
  if (gallery.length === 0) {
    gallery.push({
      src: vehiclePlaceholderImage,
      alt: vehicle.title,
      master: true,
      label: "vehicleDetail.galleryModelHub",
      meta: "vehicleDetail.galleryMasterViewAlt",
      headline: "vehicleDetail.showcaseView",
    });
  }

  const statusBadge = OPERATIONAL_BADGE[dto.operationalStatus] ?? null;

  return {
    id: dto._id,
    vehicle,
    crumbs: ["vehicleDetail.crumbCars", typeKey, vehicle.title],
    badges: [
      { kind: "plain", text: "vehicleDetail.badgeModelYearVar", vars: { year: dto.year } },
      ...(statusBadge
        ? [{ kind: "instant" as const, text: statusBadge }]
        : [{ kind: "plain" as const, text: "vehicleDetail.statusUnavailable" }]),
    ],
    ratingScore: dto.ratingsAverage.toFixed(2),
    ratingCount: "vehicleDetail.ratingCountRatings",
    ratingReviews: String(dto.ratingsQuantity),
    operatorTier:
      vehicle.operator.isVerified === false
        ? "vehicleDetail.tierPending"
        : "vehicleDetail.tierApproved",
    locationLine: "vehicleDetail.locationLine",
    liveStatus: {
      label: "vehicleDetail.liveDispatch",
      caption:
        dto.operationalStatus === "AVAILABLE"
          ? "vehicleDetail.statusBookableAt"
          : "vehicleDetail.statusUnavailableAt",
      color: dto.operationalStatus === "AVAILABLE" ? ("green" as const) : ("amber" as const),
    },
    gallery,
    metrics: [
      { icon: "settings", label: "vehicleDetail.metricGearbox", value: transmissionKey, sub: fuelKey },
      { icon: "armchair", label: "vehicleDetail.metricSeating", value: `${dto.seats} Seats`, sub: `${dto.doors} Doors` },
      { icon: "gauge", label: "vehicleDetail.metricCategory", value: typeKey, sub: SEGMENT_LABEL_KEY[vehicle.segment] ?? typeKey },
      { icon: "map", label: "vehicleDetail.metricCity", value: city || "—", sub: pickup || vehicle.title },
      {
        icon: "fuel",
        label: "vehicleDetail.specDailyRate",
        value: `${dto.dailyPrice.toLocaleString()} LYD`,
        sub: "vehicleDetail.perDay",
      },
    ],
    descriptionHeading: "vehicleDetail.descHeadingReal",
    descriptionParagraphs: description ? [description] : [],
    features: [pickup, description].filter((value): value is string => Boolean(value && value.trim())),
    specGroups: [
      {
        icon: "zap",
        title: "vehicleDetail.specGroupPower",
        rows: [
          { label: "vehicleDetail.specGearbox", value: transmissionKey },
          { label: "vehicleDetail.specFuel", value: fuelKey },
          {
            label: "vehicleDetail.specDailyRate",
            value: `${dto.dailyPrice.toLocaleString()} LYD`,
            accent: true,
          },
        ],
      },
      {
        icon: "armchair",
        title: "vehicleDetail.specGroupCabin",
        rows: [
          { label: "vehicleDetail.specCapacity", value: `${dto.seats} Seats` },
          { label: "vehicleDetail.specCategory", value: typeKey },
          { label: "vehicleDetail.specSegment", value: SEGMENT_LABEL_KEY[vehicle.segment] ?? typeKey },
        ],
      },
    ],
    policyMeta: "vehicleDetail.zeroPaperwork",
    requirements: [],
    hubBadge: "vehicleDetail.pickupBadge",
    hubs: [
      {
        icon: "building",
        name: pickup || vehicle.title,
        description: city ? `${city}, Libya` : vehicle.title,
      },
    ],
    mapUrl: city
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${city}, Libya`)}`
      : undefined,
    conciergeTitle: "vehicleDetail.conciergePickupTitle",
    conciergeBody: "vehicleDetail.conciergeBodyCity",
    mapLinkLabel: "vehicleDetail.viewZoneMap",
    operator: {
      name: companyName,
      meta:
        vehicle.operator.isVerified === false
          ? "vehicleDetail.operatorMetaPending"
          : "vehicleDetail.operatorMetaApproved",
      rating: vehicle.operator.rating,
      completedRentals: "vehicleDetail.operatorRentals",
      responseTime: "vehicleDetail.operatorManaged",
    },
    ratingsBig: dto.ratingsAverage.toFixed(1),
    ratingsTag: "vehicleDetail.ratingsTagReal",
    ratingsSub: "vehicleDetail.ratingsSubReal",
    ratingBars: [
      {
        label: "vehicleDetail.barOverall",
        score: `${dto.ratingsAverage.toFixed(1)} / 5.0`,
        percent: Math.max(0, Math.min(100, Math.round(dto.ratingsAverage * 20))),
      },
    ],
    reviews: (dto.reviews ?? []).map((review, index) => {
      const customerName =
        review.customerId && typeof review.customerId === "object"
          ? review.customerId.name?.trim()
          : undefined;
      const name = customerName || "vehicleDetail.verifiedCustomer";
      const initials = customerName
        ? customerName
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((w) => w[0]?.toUpperCase() ?? "")
            .join("") || "?"
        : "NR";
      return {
        author: name,
        initials,
        avatarClass:
          index % 2 === 0 ? "bg-blue-100 text-[#2563EB]" : "bg-slate-200 text-[#0F172A]",
        context: "vehicleDetail.reviewCtxCompleted",
        timeAgo: review.createdAt
          ? new Date(review.createdAt).toLocaleDateString()
          : "vehicleDetail.timeJustNow",
        body: review.review,
      };
    }),
    similarHeading: "vehicleDetail.similarHeadingFleet",
    similarSub: "vehicleDetail.similarSubFleet",
    similarLinkLabel: "vehicleDetail.similarLinkLabelFleet",
    similar: similarDtos
      .filter((entry) => entry._id !== dto._id)
      .slice(0, 2)
      .map((entry) => ({
        id: entry._id,
        title: `${entry.make} ${entry.model}`,
        subtitle: `${entry.year} · ${entry.city ?? entry.make}`,
        image: photoUrl(entry.photos?.[0]),
        tag: `fleet.types.${entry.type}`,
        pricePerDay: entry.dailyPrice,
        specs: [
          { label: `${entry.seats} Seats`, value: "" },
          { label: `fleet.transmissions.${entry.transmission}`, value: "" },
        ],
      })),
    minDays: 2,
    booking: {
      pickupDefault: new Date().toISOString().slice(0, 10),
      returnDefault: new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10),
      pickupTimes: ["10:00 AM", "12:00 PM", "02:00 PM", "06:00 PM", "10:00 PM"],
      returnTimes: ["10:00 AM", "02:00 PM", "06:00 PM", "10:00 PM"],
      deliveryPoints: [pickup || vehicle.title],
    },
    protectionPlans: [
      {
        id: "base",
        name: "vehicleDetail.planFleetRateName",
        description: "vehicleDetail.planFleetRateDesc",
        priceNote: "vehicleDetail.included",
        pricePerDay: 0,
        included: true,
      },
    ],
    deposit: { label: "vehicleDetail.depositLabel", amount: "vehicleDetail.depositNotSet" },
    freeIncluded: [],
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
    isReservable: dto.operationalStatus === "AVAILABLE",
  };
};
