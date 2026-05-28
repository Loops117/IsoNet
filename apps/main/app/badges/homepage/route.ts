import { NextResponse } from "next/server";

import { renderHomepageBadge } from "../../../lib/badge-render";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const image = await renderHomepageBadge();

  return new NextResponse(new Uint8Array(image), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
