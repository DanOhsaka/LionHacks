import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** App routes that require a session (keep in sync with `(dashboard)` URLs). */
function isProtectedPath(pathname: string): boolean {
  const prefixes = [
    "/dashboard",
    "/courses",
    "/achievements",
    "/upload",
    "/wellness",
  ];
  return prefixes.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({
    request: { headers: request.headers },
  });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  /* Never call createServerClient without credentials — production (e.g. next start)
   * without .env would otherwise throw and surface as "Internal Server Error". */
  if (!url || !key) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        "[middleware] Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local (see .env.example). Skipping Supabase session refresh.",
      );
    }
    return response;
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  /* One auth check here avoids repeating `getUser()` in the dashboard layout on every
   * RSC navigation (middleware + layout was two round-trips per click). */
  if (
    user == null &&
    isProtectedPath(pathname) &&
    !pathname.startsWith("/api/")
  ) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", pathname + request.nextUrl.search);
    return NextResponse.redirect(login);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
