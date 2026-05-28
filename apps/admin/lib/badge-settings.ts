export type BadgeLayerType = "base" | "tier" | "month" | "year";

export type BadgeLayerAsset = {
  id: string;
  layer_type: BadgeLayerType;
  display_name: string;
  storage_path: string;
  tier_number: number | null;
  month_number: number | null;
  year_number: number | null;
  is_active: boolean;
  public_url: string;
  created_at: string;
  updated_at: string;
};

export type BadgeGlobalSettings = {
  id: "default";
  base_asset_id: string | null;
  default_homepage_tier: number;
  default_homepage_month: number;
  default_homepage_year: number;
  vendor_badges_live: boolean;
  created_at: string;
  updated_at: string;
};

export const badgeTierOptions = [1, 2, 3, 4, 5];
export const badgeMonthOptions = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];
