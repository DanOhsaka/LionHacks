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

function profileInsertError(message: string): string {
  if (message.toLowerCase().includes("permission denied")) {
    return (
      "Database permissions are missing on profiles. In Supabase SQL Editor, run learnpulse/supabase/grants.sql " +
      "(after schema.sql), add SUPABASE_SERVICE_ROLE_KEY to .env.local, and restart npm run dev."
    );
  }
  return message;
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

  const cleanUsername = username.trim();
  const email = pridepathEmail(cleanUsername);
  const { supabase, applyAuthCookies } = createSupabaseRouteHandlerClient(request);
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const hasAdmin = Boolean(supabaseUrl && serviceKey);

  const admin =
    hasAdmin && supabaseUrl && serviceKey
      ? createClient(supabaseUrl, serviceKey, {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
          },
        })
      : null;

  let userId: string | null = null;

  if (admin) {
    const { data: existingProfile, error: existingProfileError } = await admin
      .from("profiles")
      .select("id")
      .eq("username", cleanUsername)
      .maybeSingle();
    if (existingProfileError) {
      console.error("[signup] profile precheck failed", existingProfileError.message);
    }
    if (existingProfile) {
      return NextResponse.json({ error: "Username is already taken" }, { status: 400 });
    }

    const adminCreate = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (adminCreate.error || !adminCreate.data.user) {
      const message = adminCreate.error?.message ?? "Could not create account";
      if (isFetchFailure(message)) {
        return NextResponse.json(
          { error: "Signup service is temporarily unavailable. Please try again in a minute." },
          { status: 503 },
        );
      }
      return NextResponse.json({ error: message }, { status: 400 });
    }
    userId = adminCreate.data.user.id;

    const { error: profileError } = await admin.from("profiles").insert({
      id: userId,
      username: cleanUsername,
    });
    if (profileError) {
      console.error("[signup] admin profile insert failed", profileError.message);
      await admin.auth.admin.deleteUser(userId).catch(() => undefined);
      return NextResponse.json(
        { error: profileInsertError(profileError.message) },
        { status: 400 },
      );
    }
  } else {
    /* Fallback when service role key is unavailable. */
    const authRes = await supabase.auth.signUp({ email, password });
    if (authRes.error || !authRes.data.user) {
      const message = authRes.error?.message ?? "Could not create account";
      if (isFetchFailure(message)) {
        return NextResponse.json(
          { error: "Signup service is temporarily unavailable. Please try again in a minute." },
          { status: 503 },
        );
      }
      return NextResponse.json({ error: message }, { status: 400 });
    }
    userId = authRes.data.user.id;

    /* Sign in before profile insert so RLS sees auth.uid() = user id. */
    const signIn = await supabase.auth.signInWithPassword({ email, password });
    if (signIn.error) {
      return NextResponse.json(
        {
          error:
            "Account was created but sign-in failed. Try logging in, or add SUPABASE_SERVICE_ROLE_KEY for reliable signup.",
        },
        { status: 400 },
      );
    }

    const { error: profileError } = await supabase.from("profiles").insert({
      id: userId,
      username: cleanUsername,
    });
    if (profileError) {
      return NextResponse.json(
        { error: profileInsertError(profileError.message) },
        { status: 400 },
      );
    }

    const res = NextResponse.json({
      user: { id: userId, username: cleanUsername },
    });
    return applyAuthCookies(res);
  }

  const signIn = await supabase.auth.signInWithPassword({ email, password });
  if (signIn.error) {
    console.warn("[signup] account created but auto sign-in failed", signIn.error.message);
  }

  const res = NextResponse.json({
    user: { id: userId, username: cleanUsername },
  });
  return applyAuthCookies(res);
}
