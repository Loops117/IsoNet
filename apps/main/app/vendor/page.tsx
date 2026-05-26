import type { Metadata } from "next";

import { VendorPortal } from "../components/vendor-portal";

export const metadata: Metadata = {
  title: "Vendor Portal | The Isopod Network",
  description:
    "Vendor access for onboarding, account status, reviews, analytics, and future subscription management.",
};

export default function VendorPortalPage() {
  return <VendorPortal />;
}
