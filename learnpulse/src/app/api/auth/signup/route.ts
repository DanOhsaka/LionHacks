import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { createSupabaseRouteHandlerClient } from "@/lib/supabase/route-handler";

function pridepathEmail(username: string) {
  return `${username}@pridepath.app`;
}

function isFetchFailure(message: string | undefined): boolean {
  if (!message) return false;
  const m = message.toLowerCase();
  return m.includes("fetch failed") || m.includes("network") || m.includes("timed out");
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (
    typeof body !== "object" ||
    body === null ||
    !("username" in body) ||
    !("password" in body)
  ) {
    return NextResponse.json(
      { error: "username and password are required" },
      { status: 400 },
    );
  }

  const { username, password } = body as {
    username: unknown;
    password: unknown;
  };

  if (typeof username !== "string" || typeof password !== "string") {
    return NextResponse.json(
      { error: "username and password must be strings" },
      { status: 400 },
    );
  }

  if (!username.trim() || !password) {
    return NextResponse.json(
      { error: "username and password cannot be empty" },
      { status: 400 },
    );
  }

  const { supabase, applyAuthCookies } = createSupabaseRouteHandlerClient(request);
  const email = pridepathEmail(username.trim());

  let authData: { user: { id: string } | null } | null = null;
  let authError: { message: string } | null = null;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const result = await supabase.auth.signUp({
        email,
        password,
      });
      authData = result.data as { user: { id: string } | null };
      authError = result.error;
      if (!authError) break;
      if (isFetchFailure(authError.message)) {
        console.warn(`[signup] signUp fetch failure, retry ${attempt + 1}/3`);
        continue;
      }
      break;
    } catch (error) {
      console.error(`[signup] signUp threw, retry ${attempt + 1}/3`, error);
      if (attempt === 2) {
        return NextResponse.json(
          {
            error:
              "Signup service is temporarily unavailable. Please try again in a minute.",
          },
          { status: 503 },
        );
      }
    }
  }

  if (authError) {
    console.error("[signup] auth error", authError.message);
    if (isFetchFailure(authError.message)) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
      if (supabaseUrl && serviceKey) {
        const admin = createClient(supabaseUrl, serviceKey, {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
          },
        });

        const adminCreate = await admin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
        });
        if (!adminCreate.error && adminCreate.data.user) {
          authData = { user: { id: adminCreate.data.user.id } };
          authError = null;
          const signIn = await supabase.auth.signInWithPassword({ email, password });
          if (signIn.error) {
            console.warn("[signup] fallback user created but auto sign-in failed", signIn.error.message);
          }
        } else {
          console.error("[signup] admin fallback failed", adminCreate.error?.message);
        }
      }
    }

    if (authError && isFetchFailure(authError.message)) {
      return NextResponse.json(
        {
          error:
            "Signup service is temporarily unavailable. Please try again in a minute.",
        },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { error: authError?.message ?? "Could not create account" },
      { status: 400 },
    );
  }

  if (!authData?.user) {
    return NextResponse.json(
      { error: "Sign up did not return a user" },
      { status: 400 },
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  let profileError: { message: string } | null = null;
  if (supabaseUrl && serviceKey) {
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
    const { error } = await admin.from("profiles").insert({
      id: authData.user.id,
      username: username.trim(),
    });
    profileError = error;
    /* If service role key is stale/misconfigured, retry with user-scoped client before failing. */
    if (profileError) {
      const { error: fallbackError } = await supabase.from("profiles").insert({
        id: authData.user.id,
        username: username.trim(),
      });
      profileError = fallbackError;
    }
  } else {
    const { error } = await supabase.from("profiles").insert({
      id: authData.user.id,
      username: username.trim(),
    });
    profileError = error;
  }

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 400 });
  }

  const res = NextResponse.json({
    user: { id: authData.user.id, username: username.trim() },
  });
  return applyAuthCookies(res);
}
