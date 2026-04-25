import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

type CookieToSet = {
  name: string;
  value: string;
  options?: CookieOptions;
};

/**
 * Supabase client for Route Handlers: reads cookies from the request and
 * collects Set-Cookie mutations so they can be applied to the JSON response.
 */
export function createSupabaseRouteHandlerClient(request: NextRequest) {
  const pendingCookies: CookieToSet[] = [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          pendingCookies.length = 0;
          pendingCookies.push(...cookiesToSet);
        },
      },
    },
  );

  function applyAuthCookies<T extends NextResponse>(response: T): T {
    for (const { name, value, options } of pendingCookies) {
      response.cookies.set(name, value, options);
    }
    return response;
  }

  return { supabase, applyAuthCookies };
}
