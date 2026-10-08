/**
 * View-model for the public companies directory (/companies). Every field is
 * derived from live API data — approved companies joined against their
 * available vehicles — never from mock records.
 */
export interface CompanyVehiclePreview {
  id: string;
  title: string;
  year: number;
  image: string;
  dailyPrice: number;
  href: string;
}

export interface CompanyDirectoryEntry {
  id: string;
  initials: string;
  avatarBg: string;
  name: string;
  city: string;
  address: string;
  description: string;
  /** Weighted average of the fleet's real review scores; 0 until reviews exist. */
  rating: number;
  reviewsCount: number;
  /** Currently available (PUBLISHED + AVAILABLE) vehicles. */
  fleetSize: number;
  featured: CompanyVehiclePreview[];
  isVerified: boolean;
}