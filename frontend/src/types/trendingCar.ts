export interface SpecItem {
  label: string;
  value: string;
}

export interface TrendingCar {
  id: string;
  companyName: string;
  location: string;
  rating: number;
  reviewCount: number;
  title: string;
  year: number;
  image: string;
  badges: string[];
  specs: SpecItem[];
  dailyPrice: number;
  currency: string;
  category: string;
}
