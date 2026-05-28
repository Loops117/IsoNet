import { shouldUsePlaceholderBadges } from "../../lib/badge-render";

export async function HomepageBadge() {
  const usesPlaceholder = await shouldUsePlaceholderBadges();

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
      <p className="badge-placeholder__caption">
        {usesPlaceholder
          ? "We're still working on the official IsoNet badge. Check back soon."
          : "Official IsoNet badge preview"}
      </p>
    </div>
  );
}
