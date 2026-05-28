import "server-only";

import {
  formatAdminDate,
  formatAdminSalesProfileList,
  formatAdminStructuredAddress,
  formatAdminVendorStatus,
  VENDOR_APPROVAL_EMAIL_ACTIVITY_TYPE,
} from "./vendor-management";
import {
  buildPublicVendorProfileUrl,
  buildVendorBadgeUrl,
  buildVendorPortalUrl,
} from "./vendor-badge-url";
import { sendVendorSmtpEmail } from "./vendor-smtp";

export type VendorApprovalEmailProfile = {
  user_id: string;
  owner_name: string;
  first_name: string | null;
  last_name: string | null;
  company_name: string;
  website_url: string | null;
  street_address: string | null;
  address_line_2: string | null;
  city: string | null;
  state_province: string | null;
  postal_code: string | null;
  country: string | null;
  address: string | null;
  phone_number: string | null;
  email: string;
  account_status: string;
  badge_url: string | null;
  badge_start_date: string | null;
  badge_tier: number | null;
  sales_locations: string[];
  sales_items: string[];
};

export type VendorApprovalEmailSocialLink = {
  platform: string;
  url: string;
};

export type VendorApprovalEmailSubscription = {
  tier_name: string;
  status: string;
} | null;

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function profileDetailRows(
  profile: VendorApprovalEmailProfile,
  socialLinks: VendorApprovalEmailSocialLink[],
  subscription: VendorApprovalEmailSubscription,
) {
  const ownerDisplay =
    [profile.first_name, profile.last_name].filter(Boolean).join(" ") || profile.owner_name;
  const badgeUrl = profile.badge_url ?? buildVendorBadgeUrl(profile.user_id);
  const tierLabel = profile.badge_tier ? `Tier ${profile.badge_tier}` : "Tier 1";
  const subscriptionLabel = subscription?.tier_name ?? "Free Plan";

  const rows: Array<{ label: string; value: string }> = [
    { label: "Company", value: profile.company_name },
    { label: "Owner", value: ownerDisplay },
    { label: "Email", value: profile.email },
    { label: "Phone", value: profile.phone_number ?? "Not provided" },
    { label: "Website", value: profile.website_url ?? "Not provided" },
    { label: "Address", value: formatAdminStructuredAddress(profile) },
    {
      label: "Sales locations",
      value: formatAdminSalesProfileList(profile.sales_locations),
    },
    { label: "Sales items", value: formatAdminSalesProfileList(profile.sales_items) },
    { label: "Account status", value: formatAdminVendorStatus(profile.account_status) },
    { label: "Subscription plan", value: subscriptionLabel },
    { label: "Badge tier", value: tierLabel },
    {
      label: "Badge start date",
      value: profile.badge_start_date
        ? formatAdminDate(profile.badge_start_date)
        : formatAdminDate(new Date().toISOString()),
    },
    { label: "Badge URL", value: badgeUrl },
    { label: "Vendor portal", value: buildVendorPortalUrl() },
    { label: "Public profile", value: buildPublicVendorProfileUrl(profile.user_id) },
  ];

  if (socialLinks.length > 0) {
    rows.push({
      label: "Social links",
      value: socialLinks.map((link) => `${link.platform}: ${link.url}`).join("\n"),
    });
  }

  return { rows, badgeUrl, tierLabel, subscriptionLabel, ownerDisplay };
}

export function buildVendorApprovalEmail(
  profile: VendorApprovalEmailProfile,
  socialLinks: VendorApprovalEmailSocialLink[],
  subscription: VendorApprovalEmailSubscription,
) {
  const { rows, badgeUrl, tierLabel, subscriptionLabel, ownerDisplay } = profileDetailRows(
    profile,
    socialLinks,
    subscription,
  );

  const subject = `Your IsoNet vendor account has been approved — ${profile.company_name}`;

  const text = [
    `Hello ${ownerDisplay},`,
    "",
    `Congratulations! Your IsoNet vendor account for ${profile.company_name} has been approved.`,
    "",
    "Business profile on file:",
    ...rows.map((row) => `${row.label}: ${row.value}`),
    "",
    "Badge details:",
    `- Tier: ${tierLabel}`,
    `- Plan: ${subscriptionLabel}`,
    `- Badge URL: ${badgeUrl}`,
    "",
    "You can sign in to the vendor portal to review your profile and badge:",
    buildVendorPortalUrl(),
    "",
    "If your badge image is still being finalized, the badge URL above will remain your permanent link once the badge is live.",
    "",
    "— IsoNet",
  ].join("\n");

  const profileHtml = rows
    .map(
      (row) =>
        `<tr><td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:13px;vertical-align:top;width:160px;">${escapeHtml(row.label)}</td><td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;color:#0f172a;font-size:14px;white-space:pre-wrap;">${escapeHtml(row.value)}</td></tr>`,
    )
    .join("");

  const html = `<!DOCTYPE html>
<html lang="en">
  <body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
            <tr>
              <td style="padding:24px 28px;background:#0f172a;color:#f8fafc;">
                <p style="margin:0;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#94a3b8;">IsoNet Vendor Approval</p>
                <h1 style="margin:12px 0 0;font-size:24px;line-height:1.3;">Your vendor account is approved</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">Hello ${escapeHtml(ownerDisplay)},</p>
                <p style="margin:0 0 20px;font-size:15px;line-height:1.6;">
                  Congratulations! Your IsoNet vendor account for <strong>${escapeHtml(profile.company_name)}</strong> has been approved.
                  Below is the business profile we have on file, along with your badge details.
                </p>
                <h2 style="margin:0 0 12px;font-size:16px;color:#0f172a;">Business profile</h2>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #e2e8f0;border-radius:6px;overflow:hidden;margin-bottom:24px;">
                  ${profileHtml}
                </table>
                <h2 style="margin:0 0 12px;font-size:16px;color:#0f172a;">Badge details</h2>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #e2e8f0;border-radius:6px;overflow:hidden;margin-bottom:20px;">
                  <tr><td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:13px;width:160px;">Badge tier</td><td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;font-size:14px;">${escapeHtml(tierLabel)}</td></tr>
                  <tr><td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:13px;">Subscription plan</td><td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;font-size:14px;">${escapeHtml(subscriptionLabel)}</td></tr>
                  <tr><td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:13px;">Badge URL</td><td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;font-size:14px;"><a href="${escapeHtml(badgeUrl)}" style="color:#2563eb;word-break:break-all;">${escapeHtml(badgeUrl)}</a></td></tr>
                </table>
                <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#475569;">
                  Your badge URL is permanent and can be embedded on your site. If badge artwork is still being finalized,
                  the link will serve your live badge image once generation is enabled.
                </p>
                <p style="margin:0;font-size:14px;line-height:1.6;">
                  <a href="${escapeHtml(buildVendorPortalUrl())}" style="color:#2563eb;font-weight:600;">Open vendor portal</a>
                  &nbsp;·&nbsp;
                  <a href="${escapeHtml(buildPublicVendorProfileUrl(profile.user_id))}" style="color:#2563eb;font-weight:600;">View public profile</a>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { subject, html, text, badgeUrl };
}

export async function sendVendorApprovalEmail(input: {
  to: string;
  profile: VendorApprovalEmailProfile;
  socialLinks: VendorApprovalEmailSocialLink[];
  subscription: VendorApprovalEmailSubscription;
}) {
  const normalizedEmail = input.to.trim();

  if (!normalizedEmail) {
    return { ok: false as const, error: "Vendor email is missing." };
  }

  const content = buildVendorApprovalEmail(
    input.profile,
    input.socialLinks,
    input.subscription,
  );

  const sendResult = await sendVendorSmtpEmail({
    to: normalizedEmail,
    subject: content.subject,
    html: content.html,
    text: content.text,
  });

  if (!sendResult.ok) {
    return sendResult;
  }

  return {
    ok: true as const,
    email: normalizedEmail,
    badgeUrl: content.badgeUrl,
    subject: content.subject,
    message: `Approval email sent to ${normalizedEmail}.`,
  };
}

export function findApprovalEmailSentActivity(
  activity: Array<{ activity_type: string; actor_email: string; created_at: string }>,
) {
  return (
    activity.find((entry) => entry.activity_type === VENDOR_APPROVAL_EMAIL_ACTIVITY_TYPE) ??
    null
  );
}
