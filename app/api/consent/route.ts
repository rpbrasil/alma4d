import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabase();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  const { type, version, action = "accepted", page, metadata = {} } = body;

  const { error } = await supabase.from("logs").insert({
    event_type: "CONSENT",
    source: "api",
    level: "info",
    user_id: user.id,
    message: {
      type,
      action,
    },
    metadata: {
      version,
      page,
      user_agent: req.headers.get("user-agent"),
      ...metadata,
    },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
