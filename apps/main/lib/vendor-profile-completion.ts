import type { VendorProfile } from "./vendor";

export type ProfileCompletionItem = {
  id: string;
  label: string;
  complete: boolean;
  optional?: boolean;
};

export type VendorProfileCompletion = {
  items: ProfileCompletionItem[];
  requiredItems: ProfileCompletionItem[];
  optionalItems: ProfileCompletionItem[];
  percent: number;
  optionalPercent: number;
  completedRequired: number;
  requiredTotal: number;
  completedOptional: number;
  optionalTotal: number;
};

function hasContactName(profile: VendorProfile | null) {
  if (!profile) {
    return false;
  }

  if (profile.first_name?.trim() && profile.last_name?.trim()) {
    return true;
  }

  return Boolean(profile.owner_name?.trim());
}

function hasStreetAddress(profile: VendorProfile | null) {
  if (!profile) {
    return false;
  }

  return Boolean(profile.street_address?.trim() || profile.address?.trim());
}

export function getVendorProfileCompletion(
  profile: VendorProfile | null,
  socialLinkCount: number,
): VendorProfileCompletion {
  const items: ProfileCompletionItem[] = [
    { id: "name", label: "Contact name", complete: hasContactName(profile) },
    {
      id: "company",
      label: "Company name",
      complete: Boolean(profile?.company_name?.trim()),
    },
    {
      id: "email",
      label: "Business email",
      complete: Boolean(profile?.email?.trim()),
    },
    {
      id: "phone",
      label: "Phone number",
      complete: Boolean(profile?.phone_number?.trim()),
    },
    {
      id: "address",
      label: "Street address",
      complete: hasStreetAddress(profile),
    },
    { id: "city", label: "City", complete: Boolean(profile?.city?.trim()) },
    {
      id: "region",
      label: "State / province",
      complete: Boolean(profile?.state_province?.trim()),
    },
    {
      id: "postal",
      label: "Postal code",
      complete: Boolean(profile?.postal_code?.trim()),
    },
    {
      id: "country",
      label: "Country",
      complete: Boolean(profile?.country?.trim()),
    },
    {
      id: "logo",
      label: "Company logo",
      complete: Boolean(profile?.company_logo_url),
      optional: true,
    },
    {
      id: "website",
      label: "Website",
      complete: Boolean(profile?.website_url?.trim()),
      optional: true,
    },
    {
      id: "social",
      label: "Social link",
      complete: socialLinkCount > 0,
      optional: true,
    },
  ];

  const requiredItems = items.filter((item) => !item.optional);
  const optionalItems = items.filter((item) => item.optional);
  const completedRequired = requiredItems.filter((item) => item.complete).length;
  const completedOptional = optionalItems.filter((item) => item.complete).length;
  const requiredTotal = requiredItems.length;
  const optionalTotal = optionalItems.length;

  const percent =
    requiredTotal === 0
      ? 0
      : Math.min(100, Math.round((completedRequired / requiredTotal) * 100));

  const optionalPercent =
    optionalTotal === 0
      ? 0
      : Math.min(100, Math.round((completedOptional / optionalTotal) * 100));

  return {
    items,
    requiredItems,
    optionalItems,
    percent,
    optionalPercent,
    completedRequired,
    requiredTotal,
    completedOptional,
    optionalTotal,
  };
}
