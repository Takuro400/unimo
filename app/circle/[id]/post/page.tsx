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

  const currentMonth = new Date().getMonth() + 1;
  const [month, setMonth] = useState(currentMonth);
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
        const { error: insertError } = await supabase.from("posts").insert({
          circle_id: id,
          posted_by: user.id,
          month,
          year: new Date().getFullYear(),
          media_url: urlData.publicUrl,
          media_type: file.type.startsWith("video") ? "video" : "image",
          caption: caption.trim() || null,
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
      <div className="flex items-center justify-center min-h-screen" style={{ background: "#0D0D0F" }}>
        <div style={{ width: 28, height: 28, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.1)", borderTopColor: "rgba(255,255,255,0.5)", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!circle || !isMember) return null;

  return (
    <div className="flex flex-col min-h-screen" style={{ background: "#0D0D0F" }}>
      {/* Header */}
      <div className="px-4 pt-12 pb-4 flex items-center gap-3">
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={() => router.back()}
          className="glass rounded-full flex items-center justify-center"
          style={{ width: 36, height: 36, border: "1px solid rgba(255,255,255,0.10)", background: "none", cursor: "pointer" }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" style={{ pointerEvents: "none" }}>
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </motion.button>
        <div>
          <h1 className="text-sm font-semibold silver-text">投稿する</h1>
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>{circle.emoji} {circle.name}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-10">
        <AnimatePresence mode="wait">
          {done ? (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="flex flex-col items-center justify-center py-20"
            >
              <div className="glass rounded-3xl p-10 flex flex-col items-center" style={{ border: "1px solid rgba(167,139,250,0.2)" }}>
                <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                  style={{ background: "rgba(167,139,250,0.12)", border: "1px solid rgba(167,139,250,0.3)" }}>
                  <span style={{ fontSize: 28 }}>✓</span>
                </div>
                <p className="text-sm font-medium silver-text">投稿しました</p>
                <button
                  onClick={() => router.push(`/circle/${id}`)}
                  className="mt-6 text-xs"
                  style={{ color: "rgba(167,139,250,0.7)", background: "none", border: "none", cursor: "pointer" }}
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
                <p className="text-xs mb-2" style={{ color: "rgba(255,255,255,0.4)", letterSpacing: "0.06em" }}>月を選択</p>
                <div className="grid grid-cols-6 gap-1.5">
                  {MONTHS.map((m, i) => (
                    <motion.button
                      key={i} type="button" whileTap={{ scale: 0.92 }}
                      onClick={() => setMonth(i + 1)}
                      className="rounded-xl py-2 text-xs"
                      style={{
                        background: month === i + 1 ? "rgba(167,139,250,0.15)" : "rgba(255,255,255,0.04)",
                        border: month === i + 1 ? "1px solid rgba(167,139,250,0.4)" : "1px solid rgba(255,255,255,0.07)",
                        color: month === i + 1 ? "#A78BFA" : "rgba(255,255,255,0.4)",
                        cursor: "pointer", transition: "all 0.2s ease",
                      }}
                    >
                      {m}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* File upload */}
              <div>
                <p className="text-xs mb-2" style={{ color: "rgba(255,255,255,0.4)", letterSpacing: "0.06em" }}>写真・動画</p>
                <label
                  className="glass rounded-2xl flex flex-col items-center justify-center cursor-pointer"
                  style={{ height: preview ? "auto" : 160, border: "1px dashed rgba(255,255,255,0.15)", overflow: "hidden" }}
                >
                  <input type="file" accept="image/*,video/*" onChange={handleFile} className="hidden" />
                  {preview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={preview} alt="preview" style={{ width: "100%", maxHeight: 300, objectFit: "cover" }} />
                  ) : (
                    <div className="flex flex-col items-center gap-2 py-8">
                      <span style={{ fontSize: 32, opacity: 0.2 }}>+</span>
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>タップして選択</span>
                    </div>
                  )}
                </label>
              </div>

              {/* Caption */}
              <div>
                <p className="text-xs mb-2" style={{ color: "rgba(255,255,255,0.4)", letterSpacing: "0.06em" }}>キャプション（任意）</p>
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="活動の様子を一言..."
                  rows={3}
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
                type="submit" disabled={!file || loading} whileTap={{ scale: 0.97 }}
                className="w-full rounded-xl py-3.5 text-sm font-medium"
                style={{
                  background: !file || loading ? "rgba(255,255,255,0.05)" : "linear-gradient(135deg, rgba(192,192,208,0.18), rgba(140,140,160,0.10))",
                  border: "1px solid rgba(255,255,255,0.14)",
                  color: !file || loading ? "rgba(255,255,255,0.25)" : "var(--silver-bright)",
                  cursor: !file || loading ? "not-allowed" : "pointer",
                  letterSpacing: "0.04em", transition: "all 0.3s ease",
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
