import { isHomepageBadgeConfigured } from "../../lib/badge-render";
import { BadgePlaceholder } from "./badge-placeholder";

export async function HomepageBadge() {
  const configured = await isHomepageBadgeConfigured();

  if (!configured) {
    return (
      <BadgePlaceholder caption="We're still working on the official IsoNet badge. Check back soon." />
    );
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="badge-placeholder overflow-hidden p-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/badges/homepage"
          alt="IsoNet official badge"
          className="h-full w-full object-contain"
        />
      </div>
      <p className="badge-placeholder__caption">Official IsoNet badge preview</p>
    </div>
  );
}
