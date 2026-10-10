export interface SpecItem {
  label: string;
  /** Literal value shown as-is. */
  value?: string;
  /** i18n key resolved with t(valueKey); preferred for localized enums. */
  valueKey?: string;
}

export interface TrendingCar {
  id: string;
  companyId?: string;
  companyName: string;
  companyLogo?: string;
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
  /** Real vehicle detail route; falls back to the mock anchor when absent. */
  href?: string;
}
