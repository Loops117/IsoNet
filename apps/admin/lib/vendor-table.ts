import {
  formatAdminVendorStatus,
  type AdminVendorAccountStatus,
  type AdminVendorSummary,
} from "./vendor-management";

export const vendorStatusFilterOptions: AdminVendorAccountStatus[] = [
  "pending_review",
  "not_approved",
  "approved",
  "in_good_standing",
  "active",
  "needs_updates",
  "suspended",
];

export type VendorSortField =
  | "company_name"
  | "owner_name"
  | "account_status"
  | "start_date"
  | "location";

export type VendorSortDirection = "asc" | "desc";

export function buildVendorLocationLabel(vendor: AdminVendorSummary) {
  return (
    [vendor.city, vendor.state_province, vendor.country].filter(Boolean).join(", ") ||
    vendor.address ||
    "—"
  );
}

export function buildVendorSearchHaystack(vendor: AdminVendorSummary) {
  return [
    vendor.company_name,
    vendor.owner_name,
    vendor.first_name,
    vendor.last_name,
    vendor.email,
    vendor.phone_number,
    vendor.street_address,
    vendor.address_line_2,
    vendor.city,
    vendor.state_province,
    vendor.postal_code,
    vendor.country,
    vendor.address,
    formatAdminVendorStatus(vendor.account_status),
    vendor.account_status,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function filterAndSortVendors({
  vendors,
  searchQuery,
  selectedStatuses,
  sortField,
  sortDirection,
}: {
  vendors: AdminVendorSummary[];
  searchQuery: string;
  selectedStatuses: Set<string>;
  sortField: VendorSortField;
  sortDirection: VendorSortDirection;
}) {
  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filtered = vendors.filter((vendor) => {
    if (!selectedStatuses.has(vendor.account_status)) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    return buildVendorSearchHaystack(vendor).includes(normalizedQuery);
  });

  const sorted = [...filtered].sort((left, right) => {
    let comparison = 0;

    switch (sortField) {
      case "company_name":
        comparison = left.company_name.localeCompare(right.company_name);
        break;
      case "owner_name":
        comparison = left.owner_name.localeCompare(right.owner_name);
        break;
      case "account_status":
        comparison = left.account_status.localeCompare(right.account_status);
        break;
      case "start_date":
        comparison =
          new Date(left.start_date).getTime() - new Date(right.start_date).getTime();
        break;
      case "location":
        comparison = buildVendorLocationLabel(left).localeCompare(
          buildVendorLocationLabel(right),
        );
        break;
      default:
        comparison = 0;
    }

    return sortDirection === "asc" ? comparison : -comparison;
  });

  return sorted;
}
