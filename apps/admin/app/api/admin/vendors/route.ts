import { NextResponse } from "next/server";

import { getAdminSession } from "../../../../lib/admin-session";
import { getSupabaseServerClient, hasSupabaseServiceRoleEnv } from "../../../../lib/supabase-server";

function statusRank(status: string) {
  switch (status) {
    case "not_approved":
    case "pending_review":
      return 0;
    case "needs_updates":
      return 1;
    case "approved":
      return 2;
    case "in_good_standing":
      return 3;
    case "suspended":
      return 4;
    default:
      return 5;
  }
}

export async function GET() {
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

  const supabase = getSupabaseServerClient();

  const [profilesResult, notesResult, disputesResult] = await Promise.all([
    supabase
      .from("vendor_profiles")
      .select(
        "user_id, owner_name, company_name, email, account_status, company_logo_url, average_rating, review_count, start_date",
      ),
    supabase.from("vendor_admin_notes").select("vendor_user_id"),
    supabase.from("vendor_review_disputes").select("vendor_user_id, dispute_status"),
  ]);

  if (profilesResult.error) {
    return NextResponse.json({ error: profilesResult.error.message }, { status: 500 });
  }

  if (notesResult.error) {
    return NextResponse.json({ error: notesResult.error.message }, { status: 500 });
  }

  if (disputesResult.error) {
    return NextResponse.json({ error: disputesResult.error.message }, { status: 500 });
  }

  const noteCounts = new Map<string, number>();
  for (const row of notesResult.data ?? []) {
    const vendorUserId = row.vendor_user_id;
    if (typeof vendorUserId !== "string") {
      continue;
    }

    noteCounts.set(vendorUserId, (noteCounts.get(vendorUserId) ?? 0) + 1);
  }

  const disputeCounts = new Map<string, number>();
  for (const row of disputesResult.data ?? []) {
    const vendorUserId = row.vendor_user_id;
    if (typeof vendorUserId !== "string") {
      continue;
    }

    disputeCounts.set(vendorUserId, (disputeCounts.get(vendorUserId) ?? 0) + 1);
  }

  const vendors = [...(profilesResult.data ?? [])]
    .map((vendor) => ({
      ...vendor,
      note_count: noteCounts.get(vendor.user_id) ?? 0,
      dispute_count: disputeCounts.get(vendor.user_id) ?? 0,
    }))
    .sort((left, right) => {
      const statusDifference = statusRank(left.account_status) - statusRank(right.account_status);

      if (statusDifference !== 0) {
        return statusDifference;
      }

      return left.company_name.localeCompare(right.company_name);
    });

  return NextResponse.json({
    vendors,
    stats: {
      total: vendors.length,
      pendingApproval: vendors.filter((vendor) =>
        ["not_approved", "pending_review"].includes(vendor.account_status),
      ).length,
      approved: vendors.filter((vendor) => vendor.account_status === "approved").length,
      inGoodStanding: vendors.filter((vendor) => vendor.account_status === "in_good_standing")
        .length,
      openDisputes: (disputesResult.data ?? []).filter(
        (dispute) => dispute.dispute_status === "open" || dispute.dispute_status === "under_review",
      ).length,
    },
  });
}
