export type VendorSalesOption = {
  key: string;
  label: string;
  group: "location" | "item";
};

export const vendorSalesLocationOptions: VendorSalesOption[] = [
  { key: "local_expos_shows", label: "Local Expos/Shows", group: "location" },
  { key: "online_sales", label: "Online Sales", group: "location" },
];

export const vendorSalesItemOptions: VendorSalesOption[] = [
  { key: "live_animals", label: "Live Animals", group: "item" },
  { key: "hard_goods", label: "Hard Goods", group: "item" },
  { key: "foods_consumables", label: "Foods and Consumables", group: "item" },
  { key: "botanicals", label: "Botanicals", group: "item" },
  { key: "misc_goods", label: "Misc Goods", group: "item" },
];

export const vendorSalesProfileOptions = [
  ...vendorSalesLocationOptions,
  ...vendorSalesItemOptions,
];

export const VENDOR_SIGNUP_SALES_PROFILE_STEP = 3;

export function createEmptySalesProfileState() {
  return Object.fromEntries(
    vendorSalesProfileOptions.map((option) => [option.key, false]),
  ) as Record<string, boolean>;
}

export function getSelectedSalesKeys(selections: Record<string, boolean>, group: "location" | "item") {
  const options = group === "location" ? vendorSalesLocationOptions : vendorSalesItemOptions;
  return options.filter((option) => selections[option.key]).map((option) => option.key);
}

export function formatSalesProfileLabels(keys: string[]) {
  const labelByKey = new Map(
    vendorSalesProfileOptions.map((option) => [option.key, option.label]),
  );

  return keys
    .map((key) => labelByKey.get(key) ?? key)
    .filter(Boolean)
    .join(", ");
}

export function buildSalesProfileMetadata(selections: Record<string, boolean>) {
  return {
    sales_locations: getSelectedSalesKeys(selections, "location"),
    sales_items: getSelectedSalesKeys(selections, "item"),
  };
}

export function hasValidSalesProfile(selections: Record<string, boolean>) {
  return (
    getSelectedSalesKeys(selections, "location").length > 0 &&
    getSelectedSalesKeys(selections, "item").length > 0
  );
}
