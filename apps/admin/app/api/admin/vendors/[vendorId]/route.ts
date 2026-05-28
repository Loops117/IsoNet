import { NextResponse } from "next/server";

import { getAdminSession } from "../../../../../lib/admin-session";
import { formatAdminVendorStatus } from "../../../../../lib/vendor-management";
import {
  getSupabaseServerClient,
  hasSupabaseServiceRoleEnv,
} from "../../../../../lib/supabase-server";
import { buildVendorBadgeUrl } from "../../../../../lib/vendor-badge-url";

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

  const [
    profileResult,
    socialResult,
    subscriptionResult,
    notesResult,
    reviewsResult,
    disputesResult,
    agreementsResult,
    activityResult,
  ] = await Promise.all([
      supabase
        .from("vendor_profiles")
        .select(
          "user_id, owner_name, first_name, last_name, company_name, website_url, address, street_address, address_line_2, city, state_province, postal_code, country, phone_number, email, account_status, badge_url, badge_tier, company_logo_url, average_rating, review_count, start_date, badge_start_date, sales_locations, sales_items",
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
      supabase
        .from("vendor_statement_agreements")
        .select(
          "id, vendor_user_id, agreement_key, agreement_title, agreed_at, statement_version, created_at",
        )
        .eq("vendor_user_id", vendorId)
        .order("agreed_at", { ascending: true }),
      supabase
        .from("vendor_admin_activity")
        .select(
          "id, vendor_user_id, activity_type, actor_email, summary, metadata, created_at",
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
    agreementsResult,
    activityResult,
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
    statementAgreements: agreementsResult.data ?? [],
    adminActivity: activityResult.data ?? [],
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
  const { data: existingProfile, error: existingError } = await supabase
    .from("vendor_profiles")
    .select("account_status, badge_start_date, badge_url")
    .eq("user_id", vendorId)
    .maybeSingle();

  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 500 });
  }

  if (!existingProfile) {
    return NextResponse.json({ error: "Vendor not found." }, { status: 404 });
  }

  const previousStatus = existingProfile.account_status;

  if (previousStatus === accountStatus) {
    return NextResponse.json({ ok: true, unchanged: true });
  }

  const eligibleStatuses = new Set(["approved", "in_good_standing"]);
  const shouldAssignBadgeStartDate =
    eligibleStatuses.has(accountStatus) &&
    !eligibleStatuses.has(previousStatus) &&
    !existingProfile.badge_start_date;

  const updatePayload: Record<string, unknown> = {
    account_status: accountStatus,
  };

  if (shouldAssignBadgeStartDate) {
    updatePayload.badge_start_date = new Date().toISOString();
  }

  if (eligibleStatuses.has(accountStatus) && !existingProfile.badge_url?.trim()) {
    updatePayload.badge_url = buildVendorBadgeUrl(vendorId);
  }

  const { error } = await supabase
    .from("vendor_profiles")
    .update(updatePayload)
    .eq("user_id", vendorId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const activityType = accountStatus === "approved" ? "approved" : "status_change";
  const summary =
    activityType === "approved"
      ? `${adminSession.email} approved this vendor account.`
      : `Status changed from ${formatAdminVendorStatus(previousStatus)} to ${formatAdminVendorStatus(accountStatus)}.`;

  const { error: activityError } = await supabase.from("vendor_admin_activity").insert({
    vendor_user_id: vendorId,
    activity_type: activityType,
    actor_email: adminSession.email,
    summary,
    metadata: {
      from_status: previousStatus,
      to_status: accountStatus,
    },
  });

  if (activityError) {
    return NextResponse.json({ error: activityError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
