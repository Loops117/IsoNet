const DEFAULT_SITE_URL = "https://theisopodnetwork.com";

/** Matches IsoNet site theme (`globals.css` :root). */
export const ISONET_EMBED_THEME = {
  background: "#09101a",
  panel: "#081427",
  foreground: "#d9e3f0",
  accent: "#9fb2c8",
  border: "rgba(255, 255, 255, 0.12)",
  link: "#9fb2c8",
  fontFamily: "Arial, Helvetica, sans-serif",
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function getVendorBadgeSiteUrl(siteOrigin?: string) {
  const configured = process.env.NEXT_PUBLIC_MAIN_SITE_URL?.trim().replace(/\/$/, "");
  const origin = siteOrigin?.trim().replace(/\/$/, "");

  return origin || configured || DEFAULT_SITE_URL;
}

/** Public badge image endpoint (serves placeholder until final artwork is configured). */
export function buildVendorBadgeImageUrl(vendorUserId: string, siteOrigin?: string) {
  return `${getVendorBadgeSiteUrl(siteOrigin)}/badges/vendor/${vendorUserId}`;
}

export function buildVendorPublicProfileUrl(vendorUserId: string, siteOrigin?: string) {
  return `${getVendorBadgeSiteUrl(siteOrigin)}/vendors/${vendorUserId}`;
}

export function formatBadgeApprovalMonthYear(value: string | null | undefined) {
  if (!value?.trim()) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(date);
}

export function buildVendorBadgeHoverTitle(
  companyName: string,
  badgeStartDate: string | null | undefined,
) {
  const company = companyName.trim() || "Vendor";
  const approvalLabel = formatBadgeApprovalMonthYear(badgeStartDate);

  if (approvalLabel) {
    return `${company} — Approved ${approvalLabel}`;
  }

  return `${company} — IsoNet approved vendor`;
}

export function buildVendorBadgeEmbedCopy(companyName: string) {
  const company = companyName.trim() || "This vendor";

  return `${company} is a proud member of The Isopod Network (IsoNet). They believe in upholding the standards our community expects—honest labeling, ethical trade, sanitary enclosure products, and accountable customer service. Displaying this badge signals that they have agreed to IsoNet’s vendor expectations and accept community review of their standing.`;
}

export function buildVendorBadgeEmbedHtml(input: {
  companyName: string;
  vendorUserId: string;
  badgeStartDate?: string | null;
  /** Current browser origin for live preview; omit to use public site URL in copied embed code. */
  siteOrigin?: string;
}) {
  const company = escapeHtml(input.companyName.trim() || "Vendor");
  const siteUrl = escapeHtml(getVendorBadgeSiteUrl(input.siteOrigin));
  const badgeImageUrl = escapeHtml(buildVendorBadgeImageUrl(input.vendorUserId, input.siteOrigin));
  const profileUrl = escapeHtml(
    buildVendorPublicProfileUrl(input.vendorUserId, input.siteOrigin),
  );
  const statementUrl = escapeHtml(`${getVendorBadgeSiteUrl(input.siteOrigin)}/statement`);
  const hoverTitle = escapeHtml(
    buildVendorBadgeHoverTitle(input.companyName, input.badgeStartDate),
  );
  const approvalMonthYear = formatBadgeApprovalMonthYear(input.badgeStartDate);
  const altText = approvalMonthYear
    ? escapeHtml(`${input.companyName.trim() || "Vendor"} — IsoNet vendor badge, approved ${approvalMonthYear}`)
    : `${company} — IsoNet vendor badge`;

  const theme = ISONET_EMBED_THEME;
  const linkStyle = `color:${theme.link};text-decoration:underline;`;

  return `<!-- IsoNet vendor badge — ${company} -->
<table
  role="presentation"
  cellpadding="0"
  cellspacing="0"
  border="0"
  style="max-width:36rem;border-collapse:collapse;background:${theme.panel};border:1px solid ${theme.border};font-family:${theme.fontFamily};color:${theme.foreground};line-height:1.65;"
>
  <tr>
    <td style="width:7.5rem;padding:1rem 1.5rem 1rem 1rem;vertical-align:middle;">
      <a
        href="${profileUrl}"
        target="_blank"
        rel="noopener noreferrer"
        title="${hoverTitle}"
        style="display:block;text-decoration:none;"
      >
        <img
          src="${badgeImageUrl}"
          alt="${altText}"
          title="${hoverTitle}"
          width="120"
          height="120"
          style="display:block;width:7.5rem;height:auto;border:0;"
        />
      </a>
    </td>
    <td style="padding:1rem 1rem 1rem 0;vertical-align:middle;font-size:0.9rem;color:${theme.foreground};">
      <p style="margin:0;color:${theme.foreground};">
        <strong style="color:${theme.accent};">${company}</strong> is a proud member of
        <a href="${siteUrl}" target="_blank" rel="noopener noreferrer" style="${linkStyle}">The Isopod Network (IsoNet)</a>.
        They believe in upholding the standards our community expects—honest labeling, ethical trade, sanitary enclosure products, and accountable customer service.
        Displaying this badge signals that they have agreed to IsoNet’s vendor expectations and accept community review of their standing.
        <a href="${statementUrl}" target="_blank" rel="noopener noreferrer" style="${linkStyle}">Read the full standards</a>.
      </p>
    </td>
  </tr>
</table>`.trim();
}
