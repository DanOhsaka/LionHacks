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

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return NextResponse.json(
      { error: "Invalid username or password" },
      { status: 401 },
    );
  }

  const res = NextResponse.json({
    user: data.user,
    session: data.session,
  });
  return applyAuthCookies(res);
}
