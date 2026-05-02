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

// DELETE /api/favorites/[id] — お気に入り解除(idはcircle_id)
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? undefined;
  const sb = getSupabase(token);

  const { data: userData } = await sb.auth.getUser();
  if (!userData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error } = await sb
    .from("favorites")
    .delete()
    .eq("user_id", userData.user.id)
    .eq("circle_id", params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
