"use client";

import { usePathname } from "next/navigation";

import { HomepageStickyHeader } from "./homepage-sticky-header";
import { SiteHeader } from "./site-header";

type PublicSiteChromeProps = {
  children: React.ReactNode;
};

export function PublicSiteChrome({ children }: PublicSiteChromeProps) {
  const pathname = usePathname();
  const isHomePage = pathname === "/";

  return (
    <>
      {isHomePage ? <HomepageStickyHeader /> : <SiteHeader />}
      {children}
    </>
  );
}
