"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/useAuth";
import { supabase } from "@/lib/supabase";

const EMOJIS = ["🎯","📷","🎭","🎵","🎾","🏀","🤖","🍳","🎬","⚽","🏊","🎸","🎨","📚","🏃","🎤"];
const CATEGORIES = ["文化系","体育系","技術系","その他"];

export default function NewCirclePage() {
  const user = useAuth();
  const router = useRouter();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [emoji, setEmoji] = useState("🎯");
  const [category, setCategory] = useState("文化系");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setError("");
    setLoading(true);

    try {
      if (supabase && user && user.id !== "dev-user") {
        const { data, error: err } = await supabase.from("circles").insert({
          name: name.trim(),
          description: description.trim() || null,
          emoji,
          category,
          created_by: user.id,
        }).select().single();
        if (err) throw err;
        router.push(`/circle/${data.id}`);
      } else {
        // Dev mode: just go home
        router.push("/");
      }
    } catch {
      setError("登録に失敗しました。もう一度お試しください。");
      setLoading(false);
    }
  }

  if (user === undefined) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: "#0D0D0F" }}>
        <div style={{ width: 28, height: 28, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.1)", borderTopColor: "rgba(255,255,255,0.5)", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen" style={{ background: "#0D0D0F" }}>
      {/* Header */}
      <div className="px-4 pt-12 pb-4 flex items-center gap-3">
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={() => router.back()}
          className="glass rounded-full flex items-center justify-center flex-shrink-0"
          style={{ width: 36, height: 36, border: "1px solid rgba(255,255,255,0.10)", background: "none", cursor: "pointer" }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" style={{ pointerEvents: "none" }}>
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </motion.button>
        <h1 className="text-base font-semibold silver-text">サークルを登録</h1>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-4 pb-10 flex flex-col gap-5">

        {/* Emoji picker */}
        <div>
          <p className="text-xs mb-2" style={{ color: "rgba(255,255,255,0.4)", letterSpacing: "0.06em" }}>アイコン</p>
          <div className="grid grid-cols-8 gap-2">
            {EMOJIS.map((e) => (
              <motion.button
                key={e}
                type="button"
                whileTap={{ scale: 0.88 }}
                onClick={() => setEmoji(e)}
                className="rounded-xl flex items-center justify-center"
                style={{
                  height: 40,
                  background: emoji === e ? "rgba(167,139,250,0.15)" : "rgba(255,255,255,0.04)",
                  border: emoji === e ? "1px solid rgba(167,139,250,0.4)" : "1px solid rgba(255,255,255,0.07)",
                  fontSize: 20,
                  cursor: "pointer",
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
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例：写真部"
            maxLength={40}
            required
            className="w-full rounded-xl px-4 py-3 text-sm outline-none"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.10)",
              color: "var(--silver-bright)",
            }}
          />
        </div>

        {/* Category */}
        <div>
          <p className="text-xs mb-2" style={{ color: "rgba(255,255,255,0.4)", letterSpacing: "0.06em" }}>カテゴリ</p>
          <div className="flex gap-2 flex-wrap">
            {CATEGORIES.map((cat) => (
              <motion.button
                key={cat}
                type="button"
                whileTap={{ scale: 0.94 }}
                onClick={() => setCategory(cat)}
                className="rounded-full px-3 py-1.5 text-xs"
                style={{
                  background: category === cat ? "rgba(167,139,250,0.15)" : "rgba(255,255,255,0.04)",
                  border: category === cat ? "1px solid rgba(167,139,250,0.4)" : "1px solid rgba(255,255,255,0.07)",
                  color: category === cat ? "#A78BFA" : "rgba(255,255,255,0.4)",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
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
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="活動内容を一言で..."
            rows={3}
            maxLength={200}
            className="w-full rounded-xl px-4 py-3 text-sm outline-none resize-none"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.10)",
              color: "var(--silver-bright)",
            }}
          />
        </div>

        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-xs px-1"
              style={{ color: "rgba(248,113,113,0.8)" }}
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>

        {/* Submit */}
        <motion.button
          type="submit"
          disabled={!name.trim() || loading}
          whileTap={{ scale: 0.97 }}
          className="w-full rounded-xl py-3.5 text-sm font-medium mt-2"
          style={{
            background: !name.trim() || loading
              ? "rgba(255,255,255,0.04)"
              : "linear-gradient(135deg, rgba(200,200,215,0.18), rgba(140,140,160,0.10))",
            border: "1px solid rgba(255,255,255,0.14)",
            color: !name.trim() || loading ? "rgba(255,255,255,0.2)" : "var(--silver-bright)",
            cursor: !name.trim() || loading ? "not-allowed" : "pointer",
            letterSpacing: "0.04em",
            transition: "all 0.25s ease",
          }}
        >
          {loading ? "登録中..." : `${emoji} 登録する`}
        </motion.button>
      </form>
    </div>
  );
}
