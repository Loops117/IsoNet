import type { SupabaseClient, User } from "@supabase/supabase-js";

export type VendorAccountStatus =
  | "pending_review"
  | "not_approved"
  | "approved"
  | "in_good_standing"
  | "active"
  | "needs_updates"
  | "suspended";

export type VendorSubscriptionStatus =
  | "inactive"
  | "trialing"
  | "active"
  | "past_due"
  | "canceled";

export type VendorReviewStatus = "published" | "hidden";
export type VendorDisputeStatus = "open" | "under_review" | "resolved" | "dismissed";

export type VendorProfile = {
  user_id: string;
  owner_name: string;
  company_name: string;
  website_url: string | null;
  address: string | null;
  phone_number: string | null;
  email: string;
  account_status: VendorAccountStatus;
  badge_url: string | null;
  company_logo_url: string | null;
  average_rating: number;
  review_count: number;
  start_date: string;
  created_at: string;
  updated_at: string;
};

export type VendorSocialLink = {
  id: string;
  vendor_user_id: string;
  platform: string;
  url: string;
  sort_order: number;
};

export type VendorSubscription = {
  vendor_user_id: string;
  tier_name: string;
  status: VendorSubscriptionStatus;
  started_at: string;
  renews_at: string | null;
  canceled_at: string | null;
  provider_customer_id: string | null;
  provider_subscription_id: string | null;
};

export type VendorReview = {
  id: string;
  vendor_user_id: string;
  reviewer_name: string;
  rating: number;
  title: string | null;
  body: string | null;
  review_status: VendorReviewStatus;
  published_at: string;
};

export type VendorReviewDispute = {
  id: string;
  review_id: string;
  vendor_user_id: string;
  submitted_by_user_id: string;
  subject: string;
  detail: string;
  dispute_status: VendorDisputeStatus;
  admin_resolution_note: string | null;
  resolved_by_email: string | null;
  resolved_at: string | null;
  created_at: string;
};

export type VendorSocialLinkInput = {
  platform: string;
  url: string;
  sort_order: number;
};

export type VendorSocialLinkFields = {
  facebook: string;
  instagram: string;
  palmstreet: string;
  isopodKeepers: string;
  morphmarket: string;
  additionalLinks: string;
};

type VendorMetadata = {
  ownerName: string;
  companyName: string;
  websiteUrl: string | null;
  address: string | null;
  phoneNumber: string | null;
  companyEmail: string | null;
  badgeUrl: string | null;
  socialLinks: VendorSocialLinkInput[];
  subscriptionTier: string;
};

function normalizeUrl(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function titleCase(value: string) {
  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function derivePlatformFromUrl(url: string, fallback: string) {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./i, "");
    const [firstSegment] = hostname.split(".");
    return titleCase(firstSegment || fallback);
  } catch {
    return fallback;
  }
}

function metadataString(
  metadata: Record<string, unknown>,
  key: string,
  fallback: string | null = null,
) {
  const value = metadata[key];

  if (typeof value !== "string") {
    return fallback;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : fallback;
}

export function createVendorSocialLinksFromInput(rawValue: string) {
  return rawValue
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const [explicitPlatform, explicitUrl] = line.includes("|")
        ? line.split("|", 2).map((segment) => segment.trim())
        : ["", line];

      const url = normalizeUrl(explicitUrl);
      const platform =
        explicitPlatform || derivePlatformFromUrl(url, `Social ${index + 1}`);

      return {
        platform,
        url,
        sort_order: index,
      };
    })
    .filter((link) => Boolean(link.url));
}

export function createVendorSocialLinksFromFields(
  fields: VendorSocialLinkFields,
) {
  const primaryLinks = [
    { platform: "Facebook", url: fields.facebook, sort_order: 0 },
    { platform: "Instagram", url: fields.instagram, sort_order: 1 },
    { platform: "Palmstreet", url: fields.palmstreet, sort_order: 2 },
    { platform: "IsopodKeepers", url: fields.isopodKeepers, sort_order: 3 },
    { platform: "MorphMarket", url: fields.morphmarket, sort_order: 4 },
  ]
    .map((link) => ({
      ...link,
      url: normalizeUrl(link.url),
    }))
    .filter((link) => Boolean(link.url));

  const additionalLinks = createVendorSocialLinksFromInput(fields.additionalLinks).map(
    (link, index) => ({
      ...link,
      sort_order: primaryLinks.length + index,
    }),
  );

  return [...primaryLinks, ...additionalLinks];
}

export function formatVendorStatus(value: string | null | undefined) {
  if (!value) {
    return "Unknown";
  }

  return titleCase(value);
}

export function formatVendorDate(value: string | null | undefined) {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function extractVendorMetadata(user: User): VendorMetadata {
  const metadata =
    user.user_metadata && typeof user.user_metadata === "object"
      ? (user.user_metadata as Record<string, unknown>)
      : {};

  const socialLinksRaw = metadata.social_links;
  const socialLinks = Array.isArray(socialLinksRaw)
    ? socialLinksRaw
        .map((entry, index) => {
          if (!entry || typeof entry !== "object") {
            return null;
          }

          const record = entry as Record<string, unknown>;
          const url = typeof record.url === "string" ? normalizeUrl(record.url) : "";

          if (!url) {
            return null;
          }

          const platform =
            typeof record.platform === "string" && record.platform.trim()
              ? record.platform.trim()
              : derivePlatformFromUrl(url, `Social ${index + 1}`);

          return {
            platform,
            url,
            sort_order:
              typeof record.sort_order === "number" ? record.sort_order : index,
          };
        })
        .filter((entry): entry is VendorSocialLinkInput => Boolean(entry))
    : [];

  return {
    ownerName: metadataString(metadata, "owner_name", "Vendor Owner") ?? "Vendor Owner",
    companyName:
      metadataString(metadata, "company_name", "Vendor Company") ?? "Vendor Company",
    websiteUrl: metadataString(metadata, "website_url"),
    address: metadataString(metadata, "address"),
    phoneNumber: metadataString(metadata, "phone_number"),
    companyEmail: metadataString(metadata, "company_email", user.email ?? null),
    badgeUrl: metadataString(metadata, "badge_url"),
    socialLinks,
    subscriptionTier:
      metadataString(metadata, "subscription_tier", "Application") ?? "Application",
  };
}

export async function ensureVendorProfileProvisioned(
  client: SupabaseClient,
  user: User,
) {
  const metadata = extractVendorMetadata(user);

  const { error: profileError } = await client.from("vendor_profiles").upsert(
    {
      user_id: user.id,
      owner_name: metadata.ownerName,
      company_name: metadata.companyName,
      website_url: metadata.websiteUrl,
      address: metadata.address,
      phone_number: metadata.phoneNumber,
      email: metadata.companyEmail ?? user.email ?? "",
      account_status: "not_approved",
      badge_url: metadata.badgeUrl,
      start_date: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (profileError) {
    throw profileError;
  }

  if (metadata.socialLinks.length > 0) {
    const { error: deleteSocialError } = await client
      .from("vendor_social_links")
      .delete()
      .eq("vendor_user_id", user.id);

    if (deleteSocialError) {
      throw deleteSocialError;
    }

    const { error: socialError } = await client.from("vendor_social_links").insert(
      metadata.socialLinks.map((link) => ({
        vendor_user_id: user.id,
        platform: link.platform,
        url: link.url,
        sort_order: link.sort_order,
      })),
    );

    if (socialError) {
      throw socialError;
    }
  }

  const { error: subscriptionError } = await client
    .from("vendor_subscriptions")
    .upsert(
      {
        vendor_user_id: user.id,
        tier_name: metadata.subscriptionTier,
        status: "inactive",
        started_at: new Date().toISOString(),
      },
      { onConflict: "vendor_user_id" },
    );

  if (subscriptionError) {
    throw subscriptionError;
  }
}
