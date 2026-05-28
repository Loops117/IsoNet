import "server-only";

import { createSupabaseServerClient } from "./supabase/server";
import { hasSupabaseAuthEnv } from "./supabase/env";

export type AdminSession = {
  userId: string;
  email: string;
  fullName: string | null;
};

export function hasAdminAuthConfigured() {
  return hasSupabaseAuthEnv();
}

/** @deprecated Use hasAdminAuthConfigured */
export function hasAdminCredentialsConfigured() {
  return hasAdminAuthConfigured();
}

export async function getAdminSession(): Promise<AdminSession | null> {
  if (!hasAdminAuthConfigured()) {
    return null;
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return null;
  }

  const { data: adminUser, error: adminError } = await supabase
    .from("admin_users")
    .select("email, full_name")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (adminError || !adminUser) {
    return null;
  }

  return {
    userId: user.id,
    email: adminUser.email || user.email || "",
    fullName: adminUser.full_name,
  };
}
