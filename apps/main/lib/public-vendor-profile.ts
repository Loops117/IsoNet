import "server-only";

import { createClient } from "@supabase/supabase-js";

import { formatSalesProfileLabels } from "./vendor-sales-profile";

export type PublicVendorProfile = {
  user_id: string;
  company_name: string;
  company_logo_url: string | null;
  owner_name: string;
  city: string | null;
  state_province: string | null;
  country: string | null;
  website_url: string | null;
  account_status: string;
  average_rating: number;
  review_count: number;
  badge_url: string | null;
  badge_tier: number | null;
  badge_start_date: string | null;
  sales_locations: string[];
  sales_items: string[];
  about_us_html: string | null;
};

export type PublicVendorReview = {
  id: string;
  reviewer_name: string;
  rating: number;
  title: string | null;
  body: string | null;
  published_at: string;
};

export type PublicVendorSocialLink = {
  id: string;
  platform: string;
  url: string;
  sort_order: number;
};

export async function fetchPublicVendorProfile(vendorId: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    return null;
  }

  const supabase = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const [profileResult, socialResult, reviewsResult] = await Promise.all([
    supabase
      .from("vendor_profiles")
      .select(
        "user_id, company_name, company_logo_url, owner_name, city, state_province, country, website_url, account_status, average_rating, review_count, badge_url, badge_tier, badge_start_date, sales_locations, sales_items, about_us_html",
      )
      .eq("user_id", vendorId)
      .maybeSingle(),
    supabase
      .from("vendor_social_links")
      .select("id, platform, url, sort_order")
      .eq("vendor_user_id", vendorId)
      .order("sort_order", { ascending: true }),
    supabase
      .from("vendor_reviews")
      .select("id, reviewer_name, rating, title, body, published_at")
      .eq("vendor_user_id", vendorId)
      .eq("review_status", "published")
      .order("published_at", { ascending: false })
      .limit(30),
  ]);

  if (profileResult.error || !profileResult.data) {
    return null;
  }

  const profile = profileResult.data;
  const publicProfile: PublicVendorProfile = {
    user_id: String(profile.user_id),
    company_name: String(profile.company_name ?? "Vendor"),
    company_logo_url: profile.company_logo_url ? String(profile.company_logo_url) : null,
    owner_name: String(profile.owner_name ?? "Not listed"),
    city: profile.city ? String(profile.city) : null,
    state_province: profile.state_province ? String(profile.state_province) : null,
    country: profile.country ? String(profile.country) : null,
    website_url: profile.website_url ? String(profile.website_url) : null,
    account_status: String(profile.account_status ?? ""),
    average_rating: Number(profile.average_rating ?? 0),
    review_count: Number(profile.review_count ?? 0),
    badge_url: profile.badge_url ? String(profile.badge_url) : null,
    badge_tier: typeof profile.badge_tier === "number" ? profile.badge_tier : null,
    badge_start_date: profile.badge_start_date ? String(profile.badge_start_date) : null,
    sales_locations: Array.isArray(profile.sales_locations)
      ? profile.sales_locations.map(String)
      : [],
    sales_items: Array.isArray(profile.sales_items) ? profile.sales_items.map(String) : [],
    about_us_html: profile.about_us_html ? String(profile.about_us_html) : null,
  };

  const socialLinks: PublicVendorSocialLink[] = (socialResult.data ?? []).map((item) => ({
    id: String(item.id),
    platform: String(item.platform ?? ""),
    url: String(item.url ?? ""),
    sort_order: Number(item.sort_order ?? 0),
  }));

  const reviews: PublicVendorReview[] = (reviewsResult.data ?? []).map((item) => ({
    id: String(item.id),
    reviewer_name: String(item.reviewer_name ?? "Community member"),
    rating: Number(item.rating ?? 0),
    title: item.title ? String(item.title) : null,
    body: item.body ? String(item.body) : null,
    published_at: String(item.published_at ?? ""),
  }));

  return {
    profile: publicProfile,
    socialLinks,
    reviews,
    salesLocationLabels: formatSalesProfileLabels(publicProfile.sales_locations),
    salesItemLabels: formatSalesProfileLabels(publicProfile.sales_items),
  };
}
