"use client";

import { useState, useEffect, useCallback } from "react";
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
      <div className="flex items-center justify-center min-h-screen" style={{ background: "#0D0D0F" }}>
        <div style={{ width: 28, height: 28, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.1)", borderTopColor: "rgba(255,255,255,0.5)", animation: "spin 0.8s linear infinite" }} />
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

        const { error: codeErr } = await supabase
          .from("invite_codes")
          .insert({ circle_id: circleData.id, code });
        if (codeErr) throw codeErr;

        await fetchCircles();
      }

      setGeneratedCode({ code, circleName: name });
      setName(""); setDescription(""); setEmoji("🎯"); setCategory("文化系");
    } catch (err) {
      console.error(err);
      setError("作成に失敗しました。もう一度お試しください。");
    } finally {
      setLoading(false);
    }
  }

  if (!authed) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6" style={{ background: "#0D0D0F" }}>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-sm"
        >
          <h1 className="text-2xl font-bold tracking-widest silver-text text-center mb-1">UniMo</h1>
          <p className="text-xs text-center mb-8" style={{ color: "rgba(255,255,255,0.3)" }}>管理者ページ</p>

          <form
            onSubmit={handleLogin}
            className="glass rounded-3xl p-6 flex flex-col gap-3"
            style={{ border: "1px solid rgba(255,255,255,0.10)" }}
          >
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="パスワード"
              autoFocus
              className="w-full rounded-xl px-4 py-3 text-sm outline-none"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "var(--silver-bright)" }}
            />
            {pwError && <p className="text-xs px-1" style={{ color: "rgba(248,113,113,0.8)" }}>{pwError}</p>}
            <motion.button
              type="submit"
              whileTap={{ scale: 0.96 }}
              className="w-full rounded-xl py-3 text-sm font-medium"
              style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.14)", color: "var(--silver-bright)", cursor: "pointer" }}
            >
              入室する
            </motion.button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen" style={{ background: "#0D0D0F" }}>
      {/* Header */}
      <div className="px-5 pt-12 pb-4">
        <h1 className="text-xl font-bold tracking-widest silver-text">管理者画面</h1>
        <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>サークルの作成・招待コード管理</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-10 flex flex-col gap-6">

        {/* Generated code display */}
        <AnimatePresence>
          {generatedCode && (
            <motion.div
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.94 }}
              transition={{ duration: 0.4 }}
              className="glass rounded-2xl p-6 flex flex-col items-center"
              style={{ border: "1px solid rgba(167,139,250,0.35)" }}
            >
              <p className="text-xs mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>
                「{generatedCode.circleName}」の招待コード
              </p>
              <p
                className="text-5xl font-bold my-4"
                style={{ color: "#A78BFA", letterSpacing: "0.22em" }}
              >
                {generatedCode.code}
              </p>
              <p className="text-xs text-center" style={{ color: "rgba(255,255,255,0.3)" }}>
                このコードをメンバーに伝えてください
              </p>
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={() => setGeneratedCode(null)}
                className="mt-4 text-xs px-4 py-1.5 rounded-full"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)", color: "rgba(255,255,255,0.4)", cursor: "pointer" }}
              >
                閉じる
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Create circle form */}
        <div className="glass rounded-2xl p-5" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
          <p className="text-sm font-semibold silver-text mb-4">サークルを作成</p>

          <form onSubmit={handleCreate} className="flex flex-col gap-4">
            {/* Emoji */}
            <div>
              <p className="text-xs mb-2" style={{ color: "rgba(255,255,255,0.4)", letterSpacing: "0.06em" }}>アイコン</p>
              <div className="grid grid-cols-8 gap-1.5">
                {EMOJIS.map((e) => (
                  <motion.button
                    key={e} type="button" whileTap={{ scale: 0.88 }}
                    onClick={() => setEmoji(e)}
                    className="rounded-xl flex items-center justify-center"
                    style={{
                      height: 36, fontSize: 18, cursor: "pointer",
                      background: emoji === e ? "rgba(167,139,250,0.15)" : "rgba(255,255,255,0.04)",
                      border: emoji === e ? "1px solid rgba(167,139,250,0.4)" : "1px solid rgba(255,255,255,0.07)",
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
              <p className="text-xs mb-2" style={{ color: "rgba(255,255,255,0.4)", letterSpacing: "0.06em" }}>サークル名 *</p>
              <input
                type="text" value={name} onChange={(e) => setName(e.target.value)}
                placeholder="例：写真部" maxLength={40} required
                className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)", color: "var(--silver-bright)" }}
              />
            </div>

            {/* Category */}
            <div>
              <p className="text-xs mb-2" style={{ color: "rgba(255,255,255,0.4)", letterSpacing: "0.06em" }}>カテゴリ</p>
              <div className="flex gap-2 flex-wrap">
                {CATEGORIES.map((cat) => (
                  <motion.button
                    key={cat} type="button" whileTap={{ scale: 0.94 }}
                    onClick={() => setCategory(cat)}
                    className="rounded-full px-3 py-1.5 text-xs"
                    style={{
                      background: category === cat ? "rgba(167,139,250,0.15)" : "rgba(255,255,255,0.04)",
                      border: category === cat ? "1px solid rgba(167,139,250,0.4)" : "1px solid rgba(255,255,255,0.07)",
                      color: category === cat ? "#A78BFA" : "rgba(255,255,255,0.4)",
                      cursor: "pointer", transition: "all 0.15s ease",
                    }}
                  >
                    {cat}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <p className="text-xs mb-2" style={{ color: "rgba(255,255,255,0.4)", letterSpacing: "0.06em" }}>説明文（任意）</p>
              <textarea
                value={description} onChange={(e) => setDescription(e.target.value)}
                placeholder="活動内容を一言で..." rows={2} maxLength={200}
                className="w-full rounded-xl px-4 py-3 text-sm outline-none resize-none"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)", color: "var(--silver-bright)" }}
              />
            </div>

            <AnimatePresence>
              {error && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="text-xs px-1" style={{ color: "rgba(248,113,113,0.8)" }}>
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            <motion.button
              type="submit" disabled={!name.trim() || loading} whileTap={{ scale: 0.97 }}
              className="w-full rounded-xl py-3 text-sm font-medium"
              style={{
                background: !name.trim() || loading ? "rgba(255,255,255,0.04)" : "linear-gradient(135deg, rgba(167,139,250,0.20), rgba(167,139,250,0.10))",
                border: "1px solid rgba(167,139,250,0.25)",
                color: !name.trim() || loading ? "rgba(255,255,255,0.2)" : "#C4B5FD",
                cursor: !name.trim() || loading ? "not-allowed" : "pointer",
                letterSpacing: "0.03em", transition: "all 0.25s ease",
              }}
            >
              {loading ? "作成中..." : `${emoji} 作成して招待コードを発行`}
            </motion.button>
          </form>
        </div>

        {/* Existing circles */}
        {circles.length > 0 && (
          <div>
            <p className="text-xs mb-3" style={{ color: "rgba(255,255,255,0.3)", letterSpacing: "0.08em" }}>
              登録済みサークル ({circles.length}件)
            </p>
            <div className="flex flex-col gap-2">
              {circles.map((c) => (
                <div
                  key={c.id}
                  className="glass rounded-xl px-4 py-3 flex items-center justify-between"
                  style={{ border: "1px solid rgba(255,255,255,0.07)" }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span style={{ fontSize: 22, flexShrink: 0 }}>{c.emoji}</span>
                    <div className="min-w-0">
                      <p className="text-sm truncate" style={{ color: "var(--silver-bright)" }}>{c.name}</p>
                      {c.category && <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>{c.category}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                    <div className="text-right">
                      <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>招待コード</p>
                      <p className="text-base font-bold" style={{ color: "#A78BFA", letterSpacing: "0.18em" }}>
                        {c.invite_code ?? "—"}
                      </p>
                    </div>
                    {confirmId === c.id ? (
                      <div className="flex gap-1.5">
                        <motion.button
                          whileTap={{ scale: 0.92 }}
                          onClick={() => handleDelete(c.id)}
                          disabled={deletingId === c.id}
                          style={{ fontSize: 11, padding: "4px 8px", borderRadius: 8, background: "rgba(248,113,113,0.18)", border: "1px solid rgba(248,113,113,0.4)", color: "rgba(248,113,113,0.9)", cursor: "pointer" }}
                        >
                          {deletingId === c.id ? "…" : "削除"}
                        </motion.button>
                        <motion.button
                          whileTap={{ scale: 0.92 }}
                          onClick={() => setConfirmId(null)}
                          style={{ fontSize: 11, padding: "4px 8px", borderRadius: 8, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)", color: "rgba(255,255,255,0.4)", cursor: "pointer" }}
                        >
                          戻る
                        </motion.button>
                      </div>
                    ) : (
                      <motion.button
                        whileTap={{ scale: 0.88 }}
                        onClick={() => setConfirmId(c.id)}
                        style={{ width: 30, height: 30, borderRadius: 8, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(248,113,113,0.6)" strokeWidth="2" style={{ pointerEvents: "none" }}>
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
