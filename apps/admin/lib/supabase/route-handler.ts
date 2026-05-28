import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getSupabaseAnonKey, getSupabaseUrl, hasSupabaseAuthEnv } from "./env";

type RouteHandlerSupabase = {
  supabase: ReturnType<typeof createServerClient>;
  applyAuthCookies: (response: NextResponse) => NextResponse;
};

export function createSupabaseRouteHandlerClient(
  request: NextRequest,
): RouteHandlerSupabase | null {
  if (!hasSupabaseAuthEnv()) {
    return null;
  }

  let authResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(
        cookiesToSet: {
          name: string;
          value: string;
          options: CookieOptions;
        }[],
      ) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        authResponse = NextResponse.next({
          request,
        });

        cookiesToSet.forEach(({ name, value, options }) => {
          authResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  return {
    supabase,
    applyAuthCookies(response: NextResponse) {
      authResponse.cookies.getAll().forEach(({ name, value, ...options }) => {
        response.cookies.set(name, value, options as CookieOptions);
      });

      return response;
    },
  };
}
