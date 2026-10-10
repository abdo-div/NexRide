const LOCATION_NAME: Record<string, string> = {
  mji: "Mitiga International Airport (MJI)",
  downtown: "Tripoli Downtown / Hai Al-Andalus",
  benina: "Benina Airport (BEN)",
  misrata: "Misrata Commercial Free Zone",
};

export const getVehicleLocationName = (locationId: string): string =>
  LOCATION_NAME[locationId] ?? locationId;

const SEGMENT_LABEL: Record<string, string> = {
  luxury: "vehicleDetail.segmentLuxury",
  sports: "vehicleDetail.segmentSports",
  offroad: "vehicleDetail.segmentOffroad",
  economy: "vehicleDetail.segmentEconomy",
};

export const getVehicleSegmentKey = (segment: string): string =>
  SEGMENT_LABEL[segment] ?? segment;