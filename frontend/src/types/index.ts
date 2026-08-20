export type BranchId = "lusaka" | "kitwe";

export type SeatingOption = "indoor" | "outdoor";

export interface Branch {
  id: BranchId;
  name: string;
  tagline: string;
  address: string;
  plusCode: string;
  phone: string;
  rating: number;
  reviewCount: number;
  seating: SeatingOption[];
  heroImage: string;
  /** Filename key into src/assets/blurPlaceholders.ts, for blur-up loading. */
  heroImageBlurKey?: string;
  interiorImage: string;
  gallery: string[];
  /** Filename keys into blurPlaceholders.ts, parallel to `gallery`. */
  galleryBlurKeys?: string[];
  hours: string;
}

export type MenuBadge = "Signature" | "Guest Favourite" | "Most Ordered" | "Chef's Special";

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  badges?: MenuBadge[];
  veg?: boolean;
}

export interface MenuCategory {
  id: string;
  label: string;
  items: MenuItem[];
}
