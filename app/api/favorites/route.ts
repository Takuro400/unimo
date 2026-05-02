import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

function getSupabase(token?: string) {
  return createClient(supabaseUrl, supabaseKey, {
    global: token
      ? { headers: { Authorization: `Bearer ${token}` } }
      : {},
  });
}

function getToken(req: NextRequest): string | undefined {
  return req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? undefined;
}

// GET /api/favorites — 自分のお気に入り一覧(circle情報JOINあり)
export async function GET(req: NextRequest) {
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }
  const sb = getSupabase(getToken(req));
  const { data, error } = await sb
    .from("favorites")
    .select("*, circle:circles(*)")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ favorites: data });
}

// POST /api/favorites — お気に入り登録
export async function POST(req: NextRequest) {
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }
  const { circle_id } = (await req.json()) as { circle_id: string };
  if (!circle_id) {
    return NextResponse.json({ error: "circle_id is required" }, { status: 400 });
  }

  const sb = getSupabase(getToken(req));
  const { data: user } = await sb.auth.getUser();
  if (!user.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await sb
    .from("favorites")
    .upsert(
      { user_id: user.user.id, circle_id },
      { onConflict: "user_id,circle_id", ignoreDuplicates: true }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data, { status: 201 });
}
