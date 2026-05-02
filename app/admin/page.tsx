"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import type { Circle } from "@/lib/types";
import type { User } from "@supabase/supabase-js";

const EMOJIS = ["🎯","📷","🎭","🎵","🎾","🏀","🤖","🍳","🎬","⚽","🏊","🎸","🎨","📚","🏃","🎤"];
const CATEGORIES = ["文化系","体育系","技術系","その他"];
const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD ?? "unimo-admin";

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

type CircleWithCode = Circle & { invite_code?: string };

export default function AdminPage() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [pwError, setPwError] = useState("");

  useEffect(() => {
    if (!supabase) {
      setUser(null);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const [circles, setCircles] = useState<CircleWithCode[]>([]);
  const [generatedCode, setGeneratedCode] = useState<{ code: string; circleName: string } | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [emoji, setEmoji] = useState("🎯");
  const [category, setCategory] = useState("文化系");
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [iconPreview, setIconPreview] = useState<string | null>(null);
  const iconInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const fetchCircles = useCallback(async () => {
    if (!supabase) return;
    const { data: circlesData } = await supabase.from("circles").select("*").order("created_at", { ascending: false });
    if (!circlesData) return;
    const { data: codesData } = await supabase.from("invite_codes").select("circle_id, code");
    const codeMap: Record<string, string> = Object.fromEntries((codesData ?? []).map((c: { circle_id: string; code: string }) => [c.circle_id, c.code]));
    setCircles(circlesData.map((c: Circle) => ({ ...c, invite_code: codeMap[c.id] })));
  }, []);

  useEffect(() => {
    if (authed) fetchCircles();
  }, [authed, fetchCircles]);

  if (user === undefined) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: "#FAFAFA" }}>
        <div style={{ width: 28, height: 28, borderRadius: "50%", border: "2px solid #E5E5E5", borderTopColor: "#D4537E", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setAuthed(true);
    } else {
      setPwError("パスワードが違います");
    }
  }

  async function handleDelete(id: string) {
    if (!supabase) return;
    setDeletingId(id);
    try {
      await supabase.from("invite_codes").delete().eq("circle_id", id);
      await supabase.from("circle_members").delete().eq("circle_id", id);
      await supabase.from("posts").delete().eq("circle_id", id);
      await supabase.from("circles").delete().eq("id", id);
      await fetchCircles();
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingId(null);
      setConfirmId(null);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setError("");
    setLoading(true);

    try {
      const code = generateCode();

      if (supabase && !user) {
        setError("サークル作成にはまずメインアプリ（/login）でログインが必要です");
        setLoading(false);
        return;
      }

      if (supabase && user && user.id !== "dev-user") {
        const { data: circleData, error: circleErr } = await supabase
          .from("circles")
          .insert({ name: name.trim(), description: description.trim() || null, emoji, category, created_by: user.id })
          .select()
          .single();
        if (circleErr) throw circleErr;

        // アイコン画像アップロード
        if (iconFile) {
          const ext = iconFile.name.split(".").pop();
          const path = `circles/${circleData.id}/icon-${Date.now()}.${ext}`;
          const { error: upErr } = await supabase.storage.from("posts").upload(path, iconFile, { contentType: iconFile.type, upsert: true });
          if (!upErr) {
            const { data: urlData } = supabase.storage.from("posts").getPublicUrl(path);
            await supabase.from("circles").update({ icon_url: urlData.publicUrl }).eq("id", circleData.id);
          }
        }

        const { error: codeErr } = await supabase
          .from("invite_codes")
          .insert({ circle_id: circleData.id, code });
        if (codeErr) throw codeErr;

        await fetchCircles();
      }

      setGeneratedCode({ code, circleName: name });
      setName(""); setDescription(""); setEmoji("🎯"); setCategory("文化系");
      setIconFile(null); setIconPreview(null);
    } catch (err) {
      console.error(err);
      setError("作成に失敗しました。もう一度お試しください。");
    } finally {
      setLoading(false);
    }
  }

  if (!authed) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6" style={{ background: "#FAFAFA" }}>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-sm"
        >
          <h1 className="text-2xl font-bold tracking-widest text-center mb-1" style={{ color: "#1F2937" }}>UniMo</h1>
          <p className="text-xs text-center mb-8" style={{ color: "#9CA3AF" }}>管理者ページ</p>

          <form
            onSubmit={handleLogin}
            className="rounded-3xl p-6 flex flex-col gap-3"
            style={{ background: "#FFFFFF", border: "0.5px solid #E5E5E5", boxShadow: "0 4px 16px rgba(0,0,0,0.08)" }}
          >
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="パスワード"
              autoFocus
              className="w-full rounded-xl px-4 py-3 text-sm outline-none"
              style={{ background: "rgba(0,0,0,0.03)", border: "0.5px solid rgba(0,0,0,0.12)", color: "#1F2937" }}
            />
            {pwError && <p className="text-xs px-1" style={{ color: "#EF4444" }}>{pwError}</p>}
            <motion.button
              type="submit"
              whileTap={{ scale: 0.96 }}
              className="w-full rounded-xl py-3 text-sm font-medium"
              style={{ background: "#D4537E", border: "none", color: "#FFFFFF", cursor: "pointer", boxShadow: "0 4px 14px rgba(212,83,126,0.35)" }}
            >
              入室する
            </motion.button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen" style={{ background: "#FAFAFA" }}>
      {/* Header */}
      <div
        className="px-5 pt-12 pb-4"
        style={{
          background: "rgba(250,250,250,0.92)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderBottom: "0.5px solid #E5E5E5",
        }}
      >
        <h1 className="text-xl font-bold tracking-widest" style={{ color: "#1F2937" }}>管理者画面</h1>
        <p className="text-xs mt-0.5" style={{ color: "#9CA3AF" }}>サークルの作成・招待コード管理</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-10 pt-4 flex flex-col gap-6">

        {/* Generated code display */}
        <AnimatePresence>
          {generatedCode && (
            <motion.div
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.94 }}
              transition={{ duration: 0.4 }}
              className="rounded-2xl p-6 flex flex-col items-center"
              style={{
                background: "#FFF0F6",
                border: "1px solid rgba(212,83,126,0.25)",
                boxShadow: "0 4px 16px rgba(212,83,126,0.10)",
              }}
            >
              <p className="text-xs mb-1" style={{ color: "#6C757D" }}>
                「{generatedCode.circleName}」の招待コード
              </p>
              <p
                className="text-5xl font-bold my-4"
                style={{ color: "#D4537E", letterSpacing: "0.22em" }}
              >
                {generatedCode.code}
              </p>
              <p className="text-xs text-center" style={{ color: "#9CA3AF" }}>
                このコードをメンバーに伝えてください
              </p>
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={() => setGeneratedCode(null)}
                className="mt-4 text-xs px-4 py-1.5 rounded-full"
                style={{ background: "#FFFFFF", border: "0.5px solid #E5E5E5", color: "#6C757D", cursor: "pointer" }}
              >
                閉じる
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Create circle form */}
        <div
          className="rounded-2xl p-5"
          style={{ background: "#FFFFFF", border: "0.5px solid #E5E5E5", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
        >
          <p className="text-sm font-semibold mb-4" style={{ color: "#1F2937" }}>サークルを作成</p>

          <form onSubmit={handleCreate} className="flex flex-col gap-4">

            {/* Icon image upload */}
            <div>
              <p className="text-xs mb-2" style={{ color: "#6C757D", letterSpacing: "0.06em" }}>アイコン画像（任意）</p>
              <div className="flex items-center gap-3">
                <div
                  onClick={() => iconInputRef.current?.click()}
                  className="rounded-2xl overflow-hidden cursor-pointer flex items-center justify-center flex-shrink-0"
                  style={{ width: 64, height: 64, background: "#F1EFE8", border: "0.5px solid #E5E5E5" }}
                >
                  <input ref={iconInputRef} type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (!f) return; setIconFile(f); setIconPreview(URL.createObjectURL(f)); }} style={{ display: "none" }} />
                  {iconPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={iconPreview} alt="icon" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <span style={{ fontSize: 28 }}>📷</span>
                  )}
                </div>
                <p className="text-xs" style={{ color: "#9CA3AF" }}>
                  {iconPreview ? "タップして変更" : "タップして画像を選択\n未設定の場合は絵文字が使われます"}
                </p>
              </div>
            </div>

            {/* Emoji */}
            <div>
              <p className="text-xs mb-2" style={{ color: "#6C757D", letterSpacing: "0.06em" }}>絵文字（画像未設定時）</p>
              <div className="grid grid-cols-8 gap-1.5">
                {EMOJIS.map((e) => (
                  <motion.button
                    key={e} type="button" whileTap={{ scale: 0.88 }}
                    onClick={() => setEmoji(e)}
                    className="rounded-xl flex items-center justify-center"
                    style={{
                      height: 36, fontSize: 18, cursor: "pointer",
                      background: emoji === e ? "#FFF0F6" : "rgba(0,0,0,0.03)",
                      border: emoji === e ? "1px solid rgba(212,83,126,0.4)" : "0.5px solid #E5E5E5",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {e}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Name */}
            <div>
              <p className="text-xs mb-2" style={{ color: "#6C757D", letterSpacing: "0.06em" }}>サークル名 *</p>
              <input
                type="text" value={name} onChange={(e) => setName(e.target.value)}
                placeholder="例：写真部" maxLength={40} required
                className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                style={{ background: "rgba(0,0,0,0.03)", border: "0.5px solid rgba(0,0,0,0.12)", color: "#1F2937" }}
              />
            </div>

            {/* Category */}
            <div>
              <p className="text-xs mb-2" style={{ color: "#6C757D", letterSpacing: "0.06em" }}>カテゴリ</p>
              <div className="flex gap-2 flex-wrap">
                {CATEGORIES.map((cat) => (
                  <motion.button
                    key={cat} type="button" whileTap={{ scale: 0.94 }}
                    onClick={() => setCategory(cat)}
                    className="rounded-full px-3 py-1.5 text-xs"
                    style={{
                      background: category === cat ? "#FFF0F6" : "rgba(0,0,0,0.03)",
                      border: category === cat ? "1px solid rgba(212,83,126,0.4)" : "0.5px solid #E5E5E5",
                      color: category === cat ? "#D4537E" : "#6C757D",
                      cursor: "pointer", transition: "all 0.15s ease",
                      fontWeight: category === cat ? 600 : 400,
                    }}
                  >
                    {cat}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <p className="text-xs mb-2" style={{ color: "#6C757D", letterSpacing: "0.06em" }}>説明文（任意）</p>
              <textarea
                value={description} onChange={(e) => setDescription(e.target.value)}
                placeholder="活動内容を一言で..." rows={2} maxLength={200}
                className="w-full rounded-xl px-4 py-3 text-sm outline-none resize-none"
                style={{ background: "rgba(0,0,0,0.03)", border: "0.5px solid rgba(0,0,0,0.12)", color: "#1F2937" }}
              />
            </div>

            <AnimatePresence>
              {error && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="text-xs px-1" style={{ color: "#EF4444" }}>
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            <motion.button
              type="submit" disabled={!name.trim() || loading} whileTap={{ scale: 0.97 }}
              className="w-full rounded-xl py-3 text-sm font-medium"
              style={{
                background: !name.trim() || loading ? "rgba(0,0,0,0.04)" : "#D4537E",
                border: !name.trim() || loading ? "0.5px solid #E5E5E5" : "none",
                color: !name.trim() || loading ? "#9CA3AF" : "#FFFFFF",
                cursor: !name.trim() || loading ? "not-allowed" : "pointer",
                letterSpacing: "0.03em", transition: "all 0.25s ease",
                boxShadow: !name.trim() || loading ? "none" : "0 4px 14px rgba(212,83,126,0.35)",
              }}
            >
              {loading ? "作成中..." : `${emoji} 作成して招待コードを発行`}
            </motion.button>
          </form>
        </div>

        {/* Existing circles */}
        {circles.length > 0 && (
          <div>
            <p className="text-xs mb-3" style={{ color: "#9CA3AF", letterSpacing: "0.08em" }}>
              登録済みサークル ({circles.length}件)
            </p>
            <div className="flex flex-col gap-2">
              {circles.map((c) => (
                <div
                  key={c.id}
                  className="rounded-xl px-4 py-3 flex items-center justify-between"
                  style={{ background: "#FFFFFF", border: "0.5px solid #E5E5E5", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span style={{ fontSize: 22, flexShrink: 0 }}>{c.emoji}</span>
                    <div className="min-w-0">
                      <p className="text-sm truncate" style={{ color: "#1F2937" }}>{c.name}</p>
                      {c.category && <p className="text-xs" style={{ color: "#9CA3AF" }}>{c.category}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                    <div className="text-right">
                      <p className="text-xs" style={{ color: "#9CA3AF" }}>招待コード</p>
                      <p className="text-base font-bold" style={{ color: "#D4537E", letterSpacing: "0.18em" }}>
                        {c.invite_code ?? "—"}
                      </p>
                    </div>
                    {confirmId === c.id ? (
                      <div className="flex gap-1.5">
                        <motion.button
                          whileTap={{ scale: 0.92 }}
                          onClick={() => handleDelete(c.id)}
                          disabled={deletingId === c.id}
                          style={{ fontSize: 11, padding: "4px 8px", borderRadius: 8, background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.3)", color: "#EF4444", cursor: "pointer" }}
                        >
                          {deletingId === c.id ? "…" : "削除"}
                        </motion.button>
                        <motion.button
                          whileTap={{ scale: 0.92 }}
                          onClick={() => setConfirmId(null)}
                          style={{ fontSize: 11, padding: "4px 8px", borderRadius: 8, background: "rgba(0,0,0,0.04)", border: "0.5px solid #E5E5E5", color: "#6C757D", cursor: "pointer" }}
                        >
                          戻る
                        </motion.button>
                      </div>
                    ) : (
                      <motion.button
                        whileTap={{ scale: 0.88 }}
                        onClick={() => setConfirmId(c.id)}
                        style={{ width: 30, height: 30, borderRadius: 8, background: "rgba(0,0,0,0.03)", border: "0.5px solid #E5E5E5", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(239,68,68,0.6)" strokeWidth="2" style={{ pointerEvents: "none" }}>
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                          <path d="M10 11v6M14 11v6" />
                          <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                        </svg>
                      </motion.button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
