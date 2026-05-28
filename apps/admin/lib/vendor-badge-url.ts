const DEFAULT_MAIN_SITE_URL = "https://theisopodnetwork.com";

export function getMainSiteUrl() {
  const configured =
    process.env.NEXT_PUBLIC_MAIN_SITE_URL?.trim() ||
    process.env.VENDOR_AUTH_EMAIL_REDIRECT_TO?.trim().replace(/\/vendor\/?$/, "");

  if (!configured) {
    return DEFAULT_MAIN_SITE_URL;
  }

  return configured.replace(/\/$/, "");
}

export function buildVendorBadgeUrl(vendorUserId: string) {
  return `${getMainSiteUrl()}/badges/vendor/${vendorUserId}`;
}

export function buildVendorPortalUrl() {
  return `${getMainSiteUrl()}/vendor`;
}

export function buildPublicVendorProfileUrl(vendorUserId: string) {
  return `${getMainSiteUrl()}/vendors/${vendorUserId}`;
}
