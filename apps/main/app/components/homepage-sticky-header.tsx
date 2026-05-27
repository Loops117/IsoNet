"use client";

import { useLayoutEffect, useState } from "react";

import { SiteHeader } from "./site-header";

const HOME_HERO_NAV_ID = "home-hero-nav";

export function HomepageStickyHeader() {
  const [isVisible, setIsVisible] = useState(false);

  useLayoutEffect(() => {
    const target = document.getElementById(HOME_HERO_NAV_ID);

    if (!target) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(!entry.isIntersecting);
      },
      {
        root: null,
        threshold: 0,
      },
    );

    observer.observe(target);

    return () => {
      observer.disconnect();
    };
  }, []);

  if (!isVisible) {
    return null;
  }

  return <SiteHeader floating visible />;
}
