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

// POST /api/favorites/sync — localStorageの内容をSupabaseに同期
export async function POST(req: NextRequest) {
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? undefined;
  const sb = getSupabase(token);

  const { data: userData } = await sb.auth.getUser();
  if (!userData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { circle_ids } = (await req.json()) as { circle_ids: string[] };
  if (!Array.isArray(circle_ids) || circle_ids.length === 0) {
    return NextResponse.json({ synced: 0, skipped: 0 });
  }

  // 既存を取得して重複を除く
  const { data: existing } = await sb
    .from("favorites")
    .select("circle_id")
    .eq("user_id", userData.user.id);
  const existingIds = new Set((existing ?? []).map((r: { circle_id: string }) => r.circle_id));

  const toInsert = circle_ids.filter((id) => !existingIds.has(id));
  if (toInsert.length === 0) {
    return NextResponse.json({ synced: 0, skipped: circle_ids.length });
  }

  const { error } = await sb.from("favorites").insert(
    toInsert.map((circle_id) => ({ user_id: userData.user!.id, circle_id }))
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ synced: toInsert.length, skipped: circle_ids.length - toInsert.length });
}
