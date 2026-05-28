import "server-only";

import { createClient } from "@supabase/supabase-js";

export const publicDirectoryStatuses = [
  "approved",
  "in_good_standing",
  "needs_updates",
] as const;

export type PublicVendorListing = {
  user_id: string;
  company_name: string;
  website_url: string | null;
  company_logo_url: string | null;
  city: string | null;
  state_province: string | null;
  country: string | null;
  account_status: string;
  location_label: string;
};

export function formatVendorLocation(
  city: string | null | undefined,
  stateProvince: string | null | undefined,
  country: string | null | undefined,
) {
  return [city, stateProvince, country]
    .map((value) => value?.trim())
    .filter(Boolean)
    .join(", ");
}

export async function fetchPublicVendorListings(limit?: number) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    return [] as PublicVendorListing[];
  }

  // Use public anon auth so this works without service role env.
  const supabase = createClient(supabaseUrl, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
  let query = supabase
    .from("vendor_profiles")
    .select(
      "user_id, company_name, website_url, company_logo_url, city, state_province, country, account_status",
    )
    .in("account_status", [...publicDirectoryStatuses])
    .order("company_name", { ascending: true });

  if (typeof limit === "number") {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => ({
    user_id: String(row.user_id),
    company_name: String(row.company_name ?? "Vendor"),
    website_url: row.website_url ? String(row.website_url) : null,
    company_logo_url: row.company_logo_url ? String(row.company_logo_url) : null,
    city: row.city ? String(row.city) : null,
    state_province: row.state_province ? String(row.state_province) : null,
    country: row.country ? String(row.country) : null,
    account_status: String(row.account_status ?? ""),
    location_label:
      formatVendorLocation(row.city, row.state_province, row.country) || "Location not listed",
  })) satisfies PublicVendorListing[];
}
