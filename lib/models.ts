import type { CategoryKey } from "./types";

export interface Business {
  id: string;
  name: string;
  category: CategoryKey;
  address: string | null;
  price_level: 1 | 2 | 3;
  hours: string | null;
  phone: string | null;
  instagram: string | null;
  has_toilet: boolean;
  student_friendly: boolean;
  business_items: { id: string; name: string; price: number }[];
  reviews: { rating: number }[];
}

export interface Review {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  profiles: { display_name: string } | null;
}

export interface BookListing {
  id: string;
  title: string;
  course: string | null;
  department: string | null;
  price: number;
  condition: string;
  contact: string;
  seller_id: string;
  profiles: { display_name: string } | null;
}

export const avgRating = (b: Business) =>
  b.reviews.length ? b.reviews.reduce((s, r) => s + r.rating, 0) / b.reviews.length : null;
