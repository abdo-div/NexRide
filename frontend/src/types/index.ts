export interface Category {
  id: string;
  name: string;
  badge: string;
  badgColor: string;
  availabeCound: number;
  icon: string;
  description: string;
  startingPrice: number;
}

export interface CarCard {
  id: string;
  title: string;
  agency: string;
  location: string;
  rating: number;
  reviewCount: number;
  imageUrl: string;
  pricePerDay: number;
  badges: Array<{
    text: string;
    bgClass: string;
  }>;
  specs: {
    trans: string;
    seats: string;
    power: string;
    drive: string;
  };
}
