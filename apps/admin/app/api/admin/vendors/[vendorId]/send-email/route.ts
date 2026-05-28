import { NextResponse } from "next/server";

import { getAdminSession } from "../../../../../../lib/admin-session";
import {
  getSupabaseServerClient,
  hasSupabaseServiceRoleEnv,
} from "../../../../../../lib/supabase-server";
import {
  sendVendorAuthEmail,
  type VendorAuthEmailType,
} from "../../../../../../lib/vendor-auth-email";

type RouteContext = {
  params: Promise<{
    vendorId: string;
  }>;
};

function isVendorAuthEmailType(value: unknown): value is VendorAuthEmailType {
  return value === "recovery" || value === "signup";
}

export async function POST(request: Request, context: RouteContext) {
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
  const payload = (await request.json().catch(() => null)) as {
    emailType?: unknown;
  } | null;
  const emailType: VendorAuthEmailType = isVendorAuthEmailType(payload?.emailType)
    ? payload.emailType
    : "recovery";

  const supabase = getSupabaseServerClient();

  const [profileResult, authUserResult] = await Promise.all([
    supabase
      .from("vendor_profiles")
      .select("email, company_name")
      .eq("user_id", vendorId)
      .maybeSingle(),
    supabase.auth.admin.getUserById(vendorId),
  ]);

  if (profileResult.error) {
    return NextResponse.json({ error: profileResult.error.message }, { status: 500 });
  }

  const email =
    profileResult.data?.email?.trim() ||
    authUserResult.data.user?.email?.trim() ||
    "";

  if (!email) {
    return NextResponse.json(
      { error: "No email address found for this vendor." },
      { status: 404 },
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";

  const sendResult = await sendVendorAuthEmail(
    supabaseUrl,
    serviceRoleKey,
    email,
    emailType,
  );

  if (!sendResult.ok) {
    return NextResponse.json({ error: sendResult.error }, { status: 502 });
  }

  const companyName = profileResult.data?.company_name ?? "Vendor";
  const emailLabel = emailType === "recovery" ? "password reset" : "signup confirmation";

  await supabase.from("vendor_admin_activity").insert({
    vendor_user_id: vendorId,
    activity_type: "email_sent",
    actor_email: adminSession.email,
    summary: `${adminSession.email} sent a ${emailLabel} email to ${email} (${companyName}).`,
    metadata: { email, emailType },
  });

  return NextResponse.json({
    ok: true,
    message: sendResult.message,
    email: sendResult.email,
    emailType: sendResult.emailType,
  });
}
