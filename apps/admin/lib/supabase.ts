import { createBrowserClient } from "@supabase/ssr";

import { getSupabaseAnonKey, getSupabaseUrl, hasSupabaseAuthEnv } from "./supabase/env";

export function getSupabaseBrowserClient() {
  if (!hasSupabaseAuthEnv()) {
    return null;
  }

  return createBrowserClient(getSupabaseUrl(), getSupabaseAnonKey());
}

export function hasSupabaseBrowserEnv() {
  return hasSupabaseAuthEnv();
}
