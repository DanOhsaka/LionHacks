import { NextResponse, type NextRequest } from "next/server";

import { createSupabaseRouteHandlerClient } from "@/lib/supabase/route-handler";

function learnpulseEmail(username: string) {
  return `${username}@learnpulse.app`;
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
  const email = learnpulseEmail(username.trim());

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 });
  }

  if (!authData.user) {
    return NextResponse.json(
      { error: "Sign up did not return a user" },
      { status: 400 },
    );
  }

  const { error: profileError } = await supabase.from("profiles").insert({
    id: authData.user.id,
    username: username.trim(),
  });

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 400 });
  }

  const res = NextResponse.json({
    user: { id: authData.user.id, username: username.trim() },
    session: authData.session,
  });
  return applyAuthCookies(res);
}
