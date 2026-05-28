import { NextResponse } from "next/server";

import { shouldUsePlaceholderBadges } from "../../../../lib/badge-render";

export const dynamic = "force-dynamic";

export async function GET() {
  const usesPlaceholder = await shouldUsePlaceholderBadges();

  return NextResponse.json({ usesPlaceholder });
}
