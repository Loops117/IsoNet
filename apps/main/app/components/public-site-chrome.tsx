"use client";

import { usePathname } from "next/navigation";

import { HomepageStickyHeader } from "./homepage-sticky-header";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";

type PublicSiteChromeProps = {
  children: React.ReactNode;
};

export function PublicSiteChrome({ children }: PublicSiteChromeProps) {
  const pathname = usePathname();
  const isHomePage = pathname === "/";

  return (
    <div className="flex min-h-full w-full flex-1 flex-col">
      {isHomePage ? <HomepageStickyHeader /> : <SiteHeader />}
      <div className="flex-1">{children}</div>
      <SiteFooter />
    </div>
  );
}
