import { supabase } from "./supabase";
import type { Business, BookListing, Review } from "./models";

const must = <T,>({ data, error }: { data: T; error: { message: string } | null }) => {
  if (error) throw new Error(error.message);
  return data;
};

export const fetchBusinesses = async () =>
  must(await supabase.from("businesses")
    .select("*, business_items(id,name,price), reviews(rating)")
    .order("name")) as unknown as Business[];

export const fetchBusiness = async (id: string) =>
  must(await supabase.from("businesses")
    .select("*, business_items(id,name,price), reviews(rating)")
    .eq("id", id).single()) as unknown as Business;

export const fetchReviews = async (businessId: string) =>
  must(await supabase.from("reviews")
    .select("id,rating,comment,created_at,profiles(display_name)")
    .eq("business_id", businessId).order("created_at", { ascending: false })) as unknown as Review[];

export const upsertReview = async (businessId: string, userId: string, rating: number, comment: string) =>
  must(await supabase.from("reviews").upsert(
    { business_id: businessId, user_id: userId, rating, comment: comment || null },
    { onConflict: "business_id,user_id" }));

export const fetchBooks = async () =>
  must(await supabase.from("book_listings")
    .select("*, profiles(display_name)").eq("status", "active")
    .order("created_at", { ascending: false })) as unknown as BookListing[];

export const addBook = async (b: {
  seller_id: string; title: string; course: string; department: string;
  price: number; condition: string; contact: string;
}) => must(await supabase.from("book_listings").insert(b));

export const deleteBook = async (id: string) =>
  must(await supabase.from("book_listings").delete().eq("id", id));
