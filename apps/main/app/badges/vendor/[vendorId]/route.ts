import { NextResponse } from "next/server";

import { renderVendorBadge } from "../../../../lib/badge-render";

type RouteContext = {
  params: Promise<{
    vendorId: string;
  }>;
};

export const runtime = "nodejs";

export async function GET(_request: Request, context: RouteContext) {
  const { vendorId } = await context.params;
  const image = await renderVendorBadge(vendorId);

  if (!image) {
    return NextResponse.json({ error: "Badge unavailable for this vendor." }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(image), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
