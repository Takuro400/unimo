"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/useAuth";
import { supabase } from "@/lib/supabase";
import type { Circle } from "@/lib/types";

const EMOJIS = ["🎯","📷","🎭","🎵","🎾","🏀","🤖","🍳","🎬","⚽","🏊","🎸","🎨","📚","🏃","🎤"];
const CATEGORIES = ["文化系","体育系","技術系","その他"];

function isVideo(url: string | null): boolean {
  if (!url) return false;
  return /\.(mp4|webm|mov|m4v)(\?|$)/i.test(url);
}

export default function SettingsPage() {
  const user = useAuth();
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [circle, setCircle] = useState<Circle | null>(null);
  const [isMember, setIsMember] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [emoji, setEmoji] = useState("🎯");
  const [category, setCategory] = useState("文化系");
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [iconPreview, setIconPreview] = useState<string | null>(null);
  const [backgroundFile, setBackgroundFile] = useState<File | null>(null);
  const [backgroundPreview, setBackgroundPreview] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const iconInput = useRef<HTMLInputElement>(null);
  const bgInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      if (supabase && user.id !== "dev-user") {
        const [{ data: circleData }, { data: memberData }] = await Promise.all([
          supabase.from("circles").select("*").eq("id", id).single(),
          supabase.from("circle_members").select("id").eq("circle_id", id).eq("user_id", user.id).single(),
        ]);
        if (!memberData) {
          router.replace(`/circle/${id}`);
          return;
        }
        if (circleData) {
          setCircle(circleData);
          setName(circleData.name);
          setDescription(circleData.description ?? "");
          setEmoji(circleData.emoji);
          setCategory(circleData.category ?? "文化系");
          setIconPreview(circleData.icon_url);
          setBackgroundPreview(circleData.background_url);
        }
        setIsMember(true);
      } else {
        setIsMember(true);
      }
      setAuthLoading(false);
    })();
  }, [user, id, router]);

  function handleIconSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setIconFile(f);
    setIconPreview(URL.createObjectURL(f));
  }

  function handleBackgroundSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setBackgroundFile(f);
    setBackgroundPreview(URL.createObjectURL(f));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setError("");
    setSaving(true);

    try {
      if (!supabase || !user || user.id === "dev-user") {
        router.push(`/circle/${id}`);
        return;
      }

      let iconUrl = circle?.icon_url ?? null;
      let backgroundUrl = circle?.background_url ?? null;

      if (iconFile) {
        const ext = iconFile.name.split(".").pop();
        const path = `circles/${id}/icon-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("posts").upload(path, iconFile, { contentType: iconFile.type, upsert: true });
        if (upErr) throw upErr;
        const { data } = supabase.storage.from("posts").getPublicUrl(path);
        iconUrl = data.publicUrl;
      }

      if (backgroundFile) {
        const ext = backgroundFile.name.split(".").pop();
        const path = `circles/${id}/bg-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("posts").upload(path, backgroundFile, { contentType: backgroundFile.type, cacheControl: "3600", upsert: true });
        if (upErr) throw upErr;
        const { data } = supabase.storage.from("posts").getPublicUrl(path);
        backgroundUrl = data.publicUrl;
      }

      const { error: updateErr } = await supabase
        .from("circles")
        .update({
          name: name.trim(),
          description: description.trim() || null,
          emoji,
          category,
          icon_url: iconUrl,
          background_url: backgroundUrl,
        })
        .eq("id", id);

      if (updateErr) throw updateErr;

      router.push(`/circle/${id}`);
    } catch (err: unknown) {
      const e = err as { message?: string; details?: string };
      setError([e?.message, e?.details].filter(Boolean).join(" | ") || "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  if (user === undefined || authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: "#0D0D0F" }}>
        <div style={{ width: 28, height: 28, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.1)", borderTopColor: "rgba(255,255,255,0.5)", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!isMember) return null;

  return (
    <div className="flex flex-col min-h-screen" style={{ background: "#0D0D0F" }}>
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
        <h1 className="text-base font-semibold silver-text">サークル設定</h1>
      </div>

      <form onSubmit={handleSave} className="flex-1 overflow-y-auto px-4 pb-10 flex flex-col gap-5">

        {/* Background */}
        <div>
          <p className="text-xs mb-2" style={{ color: "rgba(255,255,255,0.4)", letterSpacing: "0.06em" }}>背景画像・動画</p>
          <div
            onClick={() => bgInput.current?.click()}
            className="rounded-2xl overflow-hidden cursor-pointer relative"
            style={{
              height: 180,
              background: backgroundPreview ? "transparent" : "rgba(255,255,255,0.04)",
              border: "1px dashed rgba(255,255,255,0.15)",
            }}
          >
            <input ref={bgInput} type="file" accept="image/*,video/*" onChange={handleBackgroundSelect} style={{ display: "none" }} />
            {backgroundPreview ? (
              isVideo(backgroundPreview) ? (
                <video src={backgroundPreview} autoPlay muted loop playsInline style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={backgroundPreview} alt="background" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              )
            ) : (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", flexDirection: "column", gap: 8 }}>
                <span style={{ fontSize: 24, opacity: 0.2 }}>🎬</span>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>タップして選択（画像 or 動画）</span>
              </div>
            )}
          </div>
          <p className="text-xs mt-1.5" style={{ color: "rgba(255,255,255,0.25)" }}>
            ライブ映像・PV（mp4等）も設定可能
          </p>
        </div>

        {/* Icon */}
        <div>
          <p className="text-xs mb-2" style={{ color: "rgba(255,255,255,0.4)", letterSpacing: "0.06em" }}>アイコン画像（任意）</p>
          <div className="flex items-center gap-3">
            <div
              onClick={() => iconInput.current?.click()}
              className="rounded-2xl overflow-hidden cursor-pointer flex items-center justify-center flex-shrink-0"
              style={{
                width: 72, height: 72,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.10)",
              }}
            >
              <input ref={iconInput} type="file" accept="image/*" onChange={handleIconSelect} style={{ display: "none" }} />
              {iconPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={iconPreview} alt="icon" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <span style={{ fontSize: 32 }}>{emoji}</span>
              )}
            </div>
            <div className="flex-1 text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
              {iconPreview ? "画像を変更するにはタップ" : "画像を設定しない場合は絵文字が使われます"}
            </div>
          </div>
        </div>

        {/* Emoji (fallback) */}
        <div>
          <p className="text-xs mb-2" style={{ color: "rgba(255,255,255,0.4)", letterSpacing: "0.06em" }}>絵文字（画像未設定時に使用）</p>
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
              >{e}</motion.button>
            ))}
          </div>
        </div>

        {/* Name */}
        <div>
          <p className="text-xs mb-2" style={{ color: "rgba(255,255,255,0.4)", letterSpacing: "0.06em" }}>サークル名</p>
          <input
            type="text" value={name} onChange={(e) => setName(e.target.value)}
            maxLength={40} required
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
              >{cat}</motion.button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div>
          <p className="text-xs mb-2" style={{ color: "rgba(255,255,255,0.4)", letterSpacing: "0.06em" }}>説明文</p>
          <textarea
            value={description} onChange={(e) => setDescription(e.target.value)}
            placeholder="活動内容を一言で..." rows={3} maxLength={200}
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
          type="submit" disabled={!name.trim() || saving} whileTap={{ scale: 0.97 }}
          className="w-full rounded-xl py-3.5 text-sm font-medium mt-2"
          style={{
            background: !name.trim() || saving
              ? "rgba(255,255,255,0.04)"
              : "linear-gradient(135deg, rgba(167,139,250,0.22), rgba(167,139,250,0.10))",
            border: "1px solid rgba(167,139,250,0.3)",
            color: !name.trim() || saving ? "rgba(255,255,255,0.2)" : "#C4B5FD",
            cursor: !name.trim() || saving ? "not-allowed" : "pointer",
            letterSpacing: "0.04em", transition: "all 0.3s ease",
          }}
        >
          {saving ? "保存中..." : "保存する"}
        </motion.button>
      </form>
    </div>
  );
}
