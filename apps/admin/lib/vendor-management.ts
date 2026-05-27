export type AdminVendorAccountStatus =
  | "pending_review"
  | "not_approved"
  | "approved"
  | "in_good_standing"
  | "active"
  | "needs_updates"
  | "suspended";

export type AdminVendorSummary = {
  user_id: string;
  owner_name: string;
  first_name: string | null;
  last_name: string | null;
  company_name: string;
  email: string;
  phone_number: string | null;
  address: string | null;
  street_address: string | null;
  address_line_2: string | null;
  city: string | null;
  state_province: string | null;
  postal_code: string | null;
  country: string | null;
  account_status: AdminVendorAccountStatus;
  company_logo_url: string | null;
  average_rating: number;
  review_count: number;
  start_date: string;
  note_count: number;
  dispute_count: number;
};

export type AdminVendorActivity = {
  id: string;
  vendor_user_id: string;
  activity_type: string;
  actor_email: string;
  summary: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export type AdminVendorSocialLink = {
  id: string;
  vendor_user_id: string;
  platform: string;
  url: string;
  sort_order: number;
};

export type AdminVendorSubscription = {
  vendor_user_id: string;
  tier_name: string;
  status: string;
  started_at: string;
  renews_at: string | null;
  canceled_at: string | null;
};

export type AdminVendorNote = {
  id: string;
  vendor_user_id: string;
  author_email: string;
  note_body: string;
  created_at: string;
};

export type AdminVendorReview = {
  id: string;
  vendor_user_id: string;
  reviewer_name: string;
  rating: number;
  title: string | null;
  body: string | null;
  review_status: string;
  published_at: string;
};

export type AdminVendorDispute = {
  id: string;
  review_id: string;
  vendor_user_id: string;
  submitted_by_user_id: string;
  subject: string;
  detail: string;
  dispute_status: string;
  admin_resolution_note: string | null;
  resolved_by_email: string | null;
  resolved_at: string | null;
  created_at: string;
};

export type AdminVendorStatementAgreement = {
  id: string;
  vendor_user_id: string;
  agreement_key: string;
  agreement_title: string;
  agreed_at: string;
  statement_version: string;
  created_at: string;
};

export type AdminVendorDetail = {
  profile: {
    user_id: string;
    owner_name: string;
    first_name: string | null;
    last_name: string | null;
    company_name: string;
    website_url: string | null;
    address: string | null;
    street_address: string | null;
    address_line_2: string | null;
    city: string | null;
    state_province: string | null;
    postal_code: string | null;
    country: string | null;
    phone_number: string | null;
    email: string;
    account_status: AdminVendorAccountStatus;
    badge_url: string | null;
    company_logo_url: string | null;
    average_rating: number;
    review_count: number;
    start_date: string;
    sales_locations: string[];
    sales_items: string[];
  } | null;
  socialLinks: AdminVendorSocialLink[];
  subscription: AdminVendorSubscription | null;
  notes: AdminVendorNote[];
  reviews: AdminVendorReview[];
  disputes: AdminVendorDispute[];
  statementAgreements: AdminVendorStatementAgreement[];
  adminActivity: AdminVendorActivity[];
};

export const adminVendorStatusOptions: AdminVendorAccountStatus[] = [
  "not_approved",
  "approved",
  "in_good_standing",
  "needs_updates",
  "suspended",
];

type AdminVendorAddressFields = {
  street_address: string | null;
  address_line_2: string | null;
  city: string | null;
  state_province: string | null;
  postal_code: string | null;
  country: string | null;
  address: string | null;
};

export function formatAdminStructuredAddress(profile: AdminVendorAddressFields) {
  return (
    [
      profile.street_address,
      profile.address_line_2,
      profile.city,
      profile.state_province,
      profile.postal_code,
      profile.country,
    ]
      .filter(Boolean)
      .join(", ") ||
    profile.address ||
    "Not set"
  );
}

export function formatAdminVendorStatus(value: string | null | undefined) {
  if (!value) {
    return "Unknown";
  }

  return value
    .split("_")
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

export function formatAdminDate(value: string | null | undefined) {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function formatAdminDateTime(value: string | null | undefined) {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

const salesProfileLabels: Record<string, string> = {
  local_expos_shows: "Local Expos/Shows",
  online_sales: "Online Sales",
  live_animals: "Live Animals",
  hard_goods: "Hard Goods",
  foods_consumables: "Foods and Consumables",
  botanicals: "Botanicals",
  misc_goods: "Misc Goods",
};

export function formatAdminSalesProfileList(keys: string[] | null | undefined) {
  if (!keys?.length) {
    return "Not set";
  }

  return keys.map((key) => salesProfileLabels[key] ?? key).join(", ");
}

export function formatAdminActivityType(value: string) {
  return value
    .split("_")
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}
