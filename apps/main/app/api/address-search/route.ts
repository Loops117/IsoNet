import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";

  if (query.length < 4) {
    return NextResponse.json([]);
  }

  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=5&q=${encodeURIComponent(
      query,
    )}`,
    {
      headers: {
        Accept: "application/json",
        "Accept-Language": "en-US,en;q=0.9",
        "User-Agent": "IsoNet Vendor Onboarding Address Lookup",
      },
      next: { revalidate: 300 },
    },
  );

  if (!response.ok) {
    return NextResponse.json(
      { error: "Address lookup is unavailable right now." },
      { status: 502 },
    );
  }

  const results = (await response.json()) as unknown;
  return NextResponse.json(results);
}
