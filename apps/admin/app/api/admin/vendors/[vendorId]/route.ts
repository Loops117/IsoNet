import { NextResponse } from "next/server";

import { getAdminSession } from "../../../../../lib/admin-session";
import {
  getSupabaseServerClient,
  hasSupabaseServiceRoleEnv,
} from "../../../../../lib/supabase-server";

type RouteContext = {
  params: Promise<{
    vendorId: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const adminSession = await getAdminSession();

  if (!adminSession) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasSupabaseServiceRoleEnv()) {
    return NextResponse.json(
      {
        error:
          "Vendor management requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the admin app environment.",
      },
      { status: 500 },
    );
  }

  const { vendorId } = await context.params;
  const supabase = getSupabaseServerClient();

  const [profileResult, socialResult, subscriptionResult, notesResult, reviewsResult, disputesResult] =
    await Promise.all([
      supabase
        .from("vendor_profiles")
        .select(
          "user_id, owner_name, first_name, last_name, company_name, website_url, address, street_address, address_line_2, city, state_province, postal_code, country, phone_number, email, account_status, badge_url, company_logo_url, average_rating, review_count, start_date",
        )
        .eq("user_id", vendorId)
        .maybeSingle(),
      supabase
        .from("vendor_social_links")
        .select("id, vendor_user_id, platform, url, sort_order")
        .eq("vendor_user_id", vendorId)
        .order("sort_order", { ascending: true }),
      supabase
        .from("vendor_subscriptions")
        .select("vendor_user_id, tier_name, status, started_at, renews_at, canceled_at")
        .eq("vendor_user_id", vendorId)
        .maybeSingle(),
      supabase
        .from("vendor_admin_notes")
        .select("id, vendor_user_id, author_email, note_body, created_at")
        .eq("vendor_user_id", vendorId)
        .order("created_at", { ascending: false }),
      supabase
        .from("vendor_reviews")
        .select(
          "id, vendor_user_id, reviewer_name, rating, title, body, review_status, published_at",
        )
        .eq("vendor_user_id", vendorId)
        .order("published_at", { ascending: false }),
      supabase
        .from("vendor_review_disputes")
        .select(
          "id, review_id, vendor_user_id, submitted_by_user_id, subject, detail, dispute_status, admin_resolution_note, resolved_by_email, resolved_at, created_at",
        )
        .eq("vendor_user_id", vendorId)
        .order("created_at", { ascending: false }),
    ]);

  for (const result of [
    profileResult,
    socialResult,
    subscriptionResult,
    notesResult,
    reviewsResult,
    disputesResult,
  ]) {
    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: 500 });
    }
  }

  return NextResponse.json({
    profile: profileResult.data,
    socialLinks: socialResult.data ?? [],
    subscription: subscriptionResult.data,
    notes: notesResult.data ?? [],
    reviews: reviewsResult.data ?? [],
    disputes: disputesResult.data ?? [],
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  const adminSession = await getAdminSession();

  if (!adminSession) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasSupabaseServiceRoleEnv()) {
    return NextResponse.json(
      {
        error:
          "Vendor management requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the admin app environment.",
      },
      { status: 500 },
    );
  }

  const { vendorId } = await context.params;
  const body = (await request.json()) as { accountStatus?: string };
  const accountStatus = body.accountStatus?.trim();

  if (!accountStatus) {
    return NextResponse.json({ error: "Account status is required." }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("vendor_profiles")
    .update({ account_status: accountStatus })
    .eq("user_id", vendorId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
