import { NextResponse } from "next/server";

import { getAdminSession } from "../../../../../../lib/admin-session";
import {
  getSupabaseServerClient,
  hasSupabaseServiceRoleEnv,
} from "../../../../../../lib/supabase-server";
import { buildVendorBadgeUrl } from "../../../../../../lib/vendor-badge-url";
import { findApprovalEmailSentActivity, sendVendorApprovalEmail } from "../../../../../../lib/vendor-approval-email";
import { VENDOR_APPROVAL_EMAIL_ACTIVITY_TYPE } from "../../../../../../lib/vendor-management";

type RouteContext = {
  params: Promise<{
    vendorId: string;
  }>;
};

const APPROVED_STATUSES = new Set(["approved", "in_good_standing"]);

export async function POST(_request: Request, context: RouteContext) {
  const adminSession = await getAdminSession();

  if (!adminSession) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasSupabaseServiceRoleEnv()) {
    return NextResponse.json(
      {
        error:
          "Vendor email tools require NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
      },
      { status: 500 },
    );
  }

  const { vendorId } = await context.params;
  const supabase = getSupabaseServerClient();

  const [profileResult, socialResult, subscriptionResult, activityResult, authUserResult] =
    await Promise.all([
      supabase
        .from("vendor_profiles")
        .select(
          "user_id, owner_name, first_name, last_name, company_name, website_url, address, street_address, address_line_2, city, state_province, postal_code, country, phone_number, email, account_status, badge_url, badge_start_date, badge_tier, sales_locations, sales_items",
        )
        .eq("user_id", vendorId)
        .maybeSingle(),
      supabase
        .from("vendor_social_links")
        .select("platform, url")
        .eq("vendor_user_id", vendorId)
        .order("sort_order", { ascending: true }),
      supabase
        .from("vendor_subscriptions")
        .select("tier_name, status")
        .eq("vendor_user_id", vendorId)
        .maybeSingle(),
      supabase
        .from("vendor_admin_activity")
        .select("activity_type, actor_email, created_at")
        .eq("vendor_user_id", vendorId)
        .order("created_at", { ascending: false }),
      supabase.auth.admin.getUserById(vendorId),
    ]);

  if (profileResult.error) {
    return NextResponse.json({ error: profileResult.error.message }, { status: 500 });
  }

  if (!profileResult.data) {
    return NextResponse.json({ error: "Vendor not found." }, { status: 404 });
  }

  const profile = profileResult.data;

  if (!APPROVED_STATUSES.has(profile.account_status)) {
    return NextResponse.json(
      { error: "Approval emails can only be sent for approved vendor accounts." },
      { status: 400 },
    );
  }

  const priorApprovalEmail = findApprovalEmailSentActivity(activityResult.data ?? []);

  if (priorApprovalEmail) {
    return NextResponse.json(
      {
        error: "An approval email has already been sent for this vendor.",
        alreadySent: true,
        sentAt: priorApprovalEmail.created_at,
        sentBy: priorApprovalEmail.actor_email,
      },
      { status: 409 },
    );
  }

  const badgeUrl = profile.badge_url?.trim() || buildVendorBadgeUrl(vendorId);

  if (!profile.badge_url?.trim()) {
    const { error: badgeUrlError } = await supabase
      .from("vendor_profiles")
      .update({ badge_url: badgeUrl })
      .eq("user_id", vendorId);

    if (badgeUrlError) {
      return NextResponse.json({ error: badgeUrlError.message }, { status: 500 });
    }
  }

  const email =
    profile.email?.trim() || authUserResult.data.user?.email?.trim() || "";

  if (!email) {
    return NextResponse.json(
      { error: "No email address found for this vendor." },
      { status: 404 },
    );
  }

  const sendResult = await sendVendorApprovalEmail({
    to: email,
    profile: {
      ...profile,
      badge_url: badgeUrl,
      badge_tier: profile.badge_tier ? Number(profile.badge_tier) : 1,
      sales_locations: Array.isArray(profile.sales_locations)
        ? profile.sales_locations.map(String)
        : [],
      sales_items: Array.isArray(profile.sales_items) ? profile.sales_items.map(String) : [],
    },
    socialLinks: (socialResult.data ?? []).map((link) => ({
      platform: String(link.platform),
      url: String(link.url),
    })),
    subscription: subscriptionResult.data
      ? {
          tier_name: String(subscriptionResult.data.tier_name),
          status: String(subscriptionResult.data.status),
        }
      : null,
  });

  if (!sendResult.ok) {
    return NextResponse.json({ error: sendResult.error }, { status: 502 });
  }

  const companyName = profile.company_name ?? "Vendor";
  const sentAt = new Date().toISOString();

  const { error: activityError } = await supabase.from("vendor_admin_activity").insert({
    vendor_user_id: vendorId,
    activity_type: VENDOR_APPROVAL_EMAIL_ACTIVITY_TYPE,
    actor_email: adminSession.email,
    summary: `${adminSession.email} sent the vendor approval email to ${email} (${companyName}).`,
    metadata: {
      email,
      badgeUrl: sendResult.badgeUrl,
      sentAt,
    },
  });

  if (activityError) {
    return NextResponse.json({ error: activityError.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    message: sendResult.message,
    email: sendResult.email,
    badgeUrl: sendResult.badgeUrl,
    sentAt,
  });
}
