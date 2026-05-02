"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/useAuth";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { MOCK_CIRCLES } from "@/lib/mock-data";
import type { Circle } from "@/lib/types";

const MONTHS = ["1月","2月","3月","4月","5月","6月","7月","8月","9月","10月","11月","12月"];

export default function PostPage() {
  const user = useAuth();
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [circle, setCircle] = useState<Circle | null>(null);
  const [isMember, setIsMember] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentDay = now.getDate();
  const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  const [month, setMonth] = useState(currentMonth);
  const [day, setDay] = useState(currentDay);
  const [time, setTime] = useState(currentTime);
  const [caption, setCaption] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    (async () => {
      if (supabase && user.id !== "dev-user") {
        const [{ data: circleData }, { data: memberData }] = await Promise.all([
          supabase.from("circles").select("*").eq("id", id).single(),
          supabase.from("circle_members").select("id").eq("circle_id", id).eq("user_id", user.id).single(),
        ]);
        setCircle(circleData ?? MOCK_CIRCLES.find((c) => c.id === id) ?? null);
        if (!memberData) {
          router.replace(`/circle/${id}`);
          return;
        }
        setIsMember(true);
      } else {
        setCircle(MOCK_CIRCLES.find((c) => c.id === id) ?? null);
        setIsMember(true);
      }
      setAuthLoading(false);
    })();
  }, [user, id, router]);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setError("");
    setLoading(true);

    try {
      if (isSupabaseConfigured && supabase && user && user.id !== "dev-user") {
        const ext = file.name.split(".").pop();
        const path = `${id}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from("posts").upload(path, file, { contentType: file.type, upsert: true });
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage.from("posts").getPublicUrl(path);
        const year = now.getFullYear();
        const maxDay = new Date(year, month, 0).getDate();
        const clampedDay = Math.min(day, maxDay);
        const [hh, mm] = time.split(":").map(Number);
        const postedAt = new Date(year, month - 1, clampedDay, hh, mm, 0);

        const { error: insertError } = await supabase.from("posts").insert({
          circle_id: id,
          posted_by: user.id,
          month,
          year,
          media_url: urlData.publicUrl,
          media_type: file.type.startsWith("video") ? "video" : "image",
          caption: caption.trim() || null,
          created_at: postedAt.toISOString(),
        });
        if (insertError) throw insertError;
      }
      setDone(true);
      setTimeout(() => router.push("/"), 1500);
    } catch (err) {
      console.error(err);
      setError("投稿に失敗しました。もう一度お試しください。");
    } finally {
      setLoading(false);
    }
  }

  if (user === undefined || authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: "#FAFAFA" }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            border: "2px solid #E5E5E5",
            borderTopColor: "#D4537E",
            animation: "spin 0.8s linear infinite",
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!circle || !isMember) return null;

  return (
    <div className="flex flex-col min-h-screen" style={{ background: "#FAFAFA" }}>
      {/* Header */}
      <div
        className="px-4 pt-12 pb-4 flex items-center gap-3"
        style={{
          background: "rgba(250,250,250,0.92)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderBottom: "0.5px solid #E5E5E5",
        }}
      >
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={() => router.back()}
          className="rounded-full flex items-center justify-center"
          style={{
            width: 36,
            height: 36,
            background: "#FFFFFF",
            border: "0.5px solid #E5E5E5",
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
            cursor: "pointer",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6C757D" strokeWidth="2" style={{ pointerEvents: "none" }}>
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </motion.button>
        <div>
          <h1 className="text-sm font-semibold" style={{ color: "#1F2937" }}>投稿する</h1>
          <p className="text-xs" style={{ color: "#9CA3AF" }}>{circle.emoji} {circle.name}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-10 pt-4">
        <AnimatePresence mode="wait">
          {done ? (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="flex flex-col items-center justify-center py-20"
            >
              <div
                className="rounded-3xl p-10 flex flex-col items-center"
                style={{
                  background: "#FFFFFF",
                  border: "0.5px solid #E5E5E5",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
                }}
              >
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                  style={{ background: "#FFF0F6", border: "1px solid rgba(212,83,126,0.2)" }}
                >
                  <span style={{ fontSize: 28, color: "#D4537E" }}>✓</span>
                </div>
                <p className="text-sm font-medium" style={{ color: "#1F2937" }}>投稿しました</p>
                <button
                  onClick={() => router.push(`/circle/${id}`)}
                  className="mt-6 text-xs"
                  style={{ color: "#D4537E", background: "none", border: "none", cursor: "pointer" }}
                >
                  サークルページに戻る
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.form
              key="form"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              onSubmit={handleSubmit}
              className="flex flex-col gap-4"
            >
              {/* Month select */}
              <div>
                <p className="text-xs mb-2" style={{ color: "#6C757D", letterSpacing: "0.06em" }}>月を選択</p>
                <div className="grid grid-cols-6 gap-1.5">
                  {MONTHS.map((m, i) => (
                    <motion.button
                      key={i} type="button" whileTap={{ scale: 0.92 }}
                      onClick={() => setMonth(i + 1)}
                      className="rounded-xl py-2 text-xs"
                      style={{
                        background: month === i + 1 ? "#FFF0F6" : "#FFFFFF",
                        border: month === i + 1
                          ? "1px solid rgba(212,83,126,0.4)"
                          : "0.5px solid #E5E5E5",
                        color: month === i + 1 ? "#D4537E" : "#6C757D",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                        fontWeight: month === i + 1 ? 600 : 400,
                      }}
                    >
                      {m}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Day & Time */}
              <div className="flex gap-3">
                <div className="flex-1">
                  <p className="text-xs mb-2" style={{ color: "#6C757D", letterSpacing: "0.06em" }}>日</p>
                  <input
                    type="number"
                    min={1}
                    max={new Date(new Date().getFullYear(), month, 0).getDate()}
                    value={day}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      const max = new Date(new Date().getFullYear(), month, 0).getDate();
                      setDay(Math.max(1, Math.min(v, max)));
                    }}
                    className="w-full rounded-xl px-4 py-3 text-sm outline-none text-center"
                    style={{
                      background: "#FFFFFF",
                      border: "0.5px solid #E5E5E5",
                      color: "#1F2937",
                      appearance: "none",
                      MozAppearance: "textfield",
                    }}
                  />
                </div>
                <div className="flex-1">
                  <p className="text-xs mb-2" style={{ color: "#6C757D", letterSpacing: "0.06em" }}>時間</p>
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                    style={{
                      background: "#FFFFFF",
                      border: "0.5px solid #E5E5E5",
                      color: "#1F2937",
                      colorScheme: "light",
                    }}
                  />
                </div>
              </div>

              {/* File upload */}
              <div>
                <p className="text-xs mb-2" style={{ color: "#6C757D", letterSpacing: "0.06em" }}>写真・動画</p>
                <label
                  className="rounded-2xl flex flex-col items-center justify-center cursor-pointer"
                  style={{
                    height: preview ? "auto" : 160,
                    border: "1.5px dashed #E5E5E5",
                    background: "#FFFFFF",
                    overflow: "hidden",
                  }}
                >
                  <input type="file" accept="image/*,video/*" onChange={handleFile} className="hidden" />
                  {preview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={preview} alt="preview" style={{ width: "100%", maxHeight: 300, objectFit: "cover" }} />
                  ) : (
                    <div className="flex flex-col items-center gap-2 py-8">
                      <span style={{ fontSize: 32, opacity: 0.25, color: "#D4537E" }}>+</span>
                      <span style={{ fontSize: 11, color: "#9CA3AF" }}>タップして選択</span>
                    </div>
                  )}
                </label>
              </div>

              {/* Caption */}
              <div>
                <p className="text-xs mb-2" style={{ color: "#6C757D", letterSpacing: "0.06em" }}>キャプション（任意）</p>
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="活動の様子を一言..."
                  rows={3}
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none resize-none"
                  style={{
                    background: "#FFFFFF",
                    border: "0.5px solid #E5E5E5",
                    color: "#1F2937",
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
                    style={{ color: "#EF4444" }}
                  >
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>

              <motion.button
                type="submit"
                disabled={!file || loading}
                whileTap={{ scale: 0.97 }}
                className="w-full rounded-xl py-3.5 text-sm font-medium"
                style={{
                  background: !file || loading ? "rgba(0,0,0,0.04)" : "#D4537E",
                  border: !file || loading ? "0.5px solid #E5E5E5" : "none",
                  color: !file || loading ? "#9CA3AF" : "#FFFFFF",
                  cursor: !file || loading ? "not-allowed" : "pointer",
                  letterSpacing: "0.04em",
                  transition: "all 0.3s ease",
                  boxShadow: !file || loading ? "none" : "0 4px 14px rgba(212,83,126,0.35)",
                }}
              >
                {loading ? "投稿中..." : "投稿する"}
              </motion.button>
            </motion.form>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
