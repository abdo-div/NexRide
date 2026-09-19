export interface VehicleSpec {
  engine: string;
  seats: string;
  gearbox: string;
  fuel: string;
}

export interface VehicleOperator {
  id: string;
  name: string;
  initials: string;
  rating: number;
  reviewsCount: number;
  isVerified?: boolean;
}

export interface Vehicle {
  id: string;
  title: string;
  category: string;
  segment: string;
  pricePerDay: number;
  totalForPeriod: number;
  periodDays: number;
  image: string;
  location: string;
  body: string;
  drive: string;
  operatorId: string;
  operator: VehicleOperator;
  isInstantConfirmation?: boolean;
  isTopPick?: boolean;
  airportVip?: boolean;
  zeroDeposit?: boolean;
  badgeTag?: string;
  badgeTagSecondary?: string;
  isFavorite?: boolean;
  specs: VehicleSpec;
  perks: string[];
}