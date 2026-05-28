import { NextResponse } from "next/server";

import {
  type ForumCategorySettings,
  type ForumPostAudience,
  type ForumViewAudience,
} from "../../../../../lib/forum-settings";
import { getAdminSession } from "../../../../../lib/admin-session";
import {
  getSupabaseServerClient,
  hasSupabaseServiceRoleEnv,
} from "../../../../../lib/supabase-server";

const viewAudiences = new Set<ForumViewAudience>(["public", "authenticated", "vendor"]);
const postAudiences = new Set<ForumPostAudience>(["authenticated", "vendor"]);

export async function GET() {
  const adminSession = await getAdminSession();
  if (!adminSession) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasSupabaseServiceRoleEnv()) {
    return NextResponse.json(
      { error: "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY." },
      { status: 500 },
    );
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("forum_categories")
    .select(
      "id, title, description, sort_order, is_visible, view_audience, post_audience, created_at, updated_at",
    )
    .order("sort_order", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ categories: (data ?? []) as ForumCategorySettings[] });
}

export async function PATCH(request: Request) {
  const adminSession = await getAdminSession();
  if (!adminSession) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasSupabaseServiceRoleEnv()) {
    return NextResponse.json(
      { error: "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY." },
      { status: 500 },
    );
  }

  const payload = (await request.json().catch(() => null)) as {
    categories?: {
      id: string;
      isVisible?: boolean;
      viewAudience?: ForumViewAudience;
      postAudience?: ForumPostAudience;
    }[];
  } | null;

  if (!payload?.categories?.length) {
    return NextResponse.json({ error: "No category updates provided." }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  const updated: ForumCategorySettings[] = [];

  for (const category of payload.categories) {
    if (!category.id?.trim()) {
      return NextResponse.json({ error: "Each category update requires an id." }, { status: 400 });
    }

    if (category.viewAudience && !viewAudiences.has(category.viewAudience)) {
      return NextResponse.json({ error: `Invalid view audience for ${category.id}.` }, { status: 400 });
    }

    if (category.postAudience && !postAudiences.has(category.postAudience)) {
      return NextResponse.json({ error: `Invalid post audience for ${category.id}.` }, { status: 400 });
    }

    const updatePayload: Record<string, unknown> = {};

    if (typeof category.isVisible === "boolean") {
      updatePayload.is_visible = category.isVisible;
    }

    if (category.viewAudience) {
      updatePayload.view_audience = category.viewAudience;
    }

    if (category.postAudience) {
      updatePayload.post_audience = category.postAudience;
    }

    if (!Object.keys(updatePayload).length) {
      continue;
    }

    const { data, error } = await supabase
      .from("forum_categories")
      .update(updatePayload)
      .eq("id", category.id)
      .select(
        "id, title, description, sort_order, is_visible, view_audience, post_audience, created_at, updated_at",
      )
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    updated.push(data as ForumCategorySettings);
  }

  return NextResponse.json({ categories: updated });
}
