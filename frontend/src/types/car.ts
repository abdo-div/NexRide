export interface Car {
  id: string;
  name: string;
  brand: string;
  model: string;
  year: number;
  type: "Sedan" | "SUV" | "Luxury" | "Sports";
  pricePerDay: number;
  currency: string;
  image: string;
  transmission: "Automatic" | "Manual";
  fuelType: "Gasoline" | "Diesel" | "Hybrid" | "Electric";
  seats: number;
  location: string;
  isVerified?: boolean;
  featured?: boolean;
}
