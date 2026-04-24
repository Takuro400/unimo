"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/useAuth";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { MOCK_CIRCLES } from "@/lib/mock-data";
import type { Circle } from "@/lib/types";
import BottomNav from "@/components/BottomNav";

const MONTHS = ["1月","2月","3月","4月","5月","6月","7月","8月","9月","10月","11月","12月"];

type Step = "photo" | "compose" | "done";

export default function PostFlowPage() {
  const user = useAuth();
  const router = useRouter();

  const [step, setStep] = useState<Step>("photo");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isVideo, setIsVideo] = useState(false);
  const [caption, setCaption] = useState("");
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [circleId, setCircleId] = useState<string | null>(null);

  const [myCircles, setMyCircles] = useState<Circle[]>([]);
  const [loadingCircles, setLoadingCircles] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      if (supabase && user.id !== "dev-user") {
        const { data } = await supabase
          .from("circle_members")
          .select("circle:circles(*)")
          .eq("user_id", user.id);
        if (data) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setMyCircles(data.map((r: any) => r.circle).filter(Boolean));
        }
      } else {
        setMyCircles(MOCK_CIRCLES.slice(0, 3));
      }
      setLoadingCircles(false);
    })();
  }, [user]);

  // Revoke the object URL when it changes or on unmount to avoid leaks
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (preview) URL.revokeObjectURL(preview);
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setIsVideo(f.type.startsWith("video"));
    setStep("compose");
  }

  function retake() {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview(null);
    setCircleId(null);
    setCaption("");
    setError("");
    setStep("photo");
  }

  async function handleSubmit() {
    if (!file || !circleId) return;
    setError("");
    setSubmitting(true);
    try {
      if (isSupabaseConfigured && supabase && user && user.id !== "dev-user") {
        const ext = file.name.split(".").pop() || (isVideo ? "mp4" : "jpg");
        const path = `${circleId}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("posts")
          .upload(path, file, { contentType: file.type, upsert: true });
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage.from("posts").getPublicUrl(path);
        const { error: insErr } = await supabase.from("posts").insert({
          circle_id: circleId,
          posted_by: user.id,
          month,
          year: new Date().getFullYear(),
          media_url: urlData.publicUrl,
          media_type: isVideo ? "video" : "image",
          caption: caption.trim() || null,
        });
        if (insErr) throw insErr;
      }
      setStep("done");
      setTimeout(() => router.push(`/circle/${circleId}`), 1400);
    } catch (err) {
      console.error(err);
      setError("投稿に失敗しました。もう一度お試しください。");
    } finally {
      setSubmitting(false);
    }
  }

  const selectedCircle = myCircles.find((c) => c.id === circleId) ?? null;

  return (
    <div style={{ background: "#0D0D0F", minHeight: "100svh" }}>
      <AnimatePresence mode="wait">
        {step === "photo" && (
          <PhotoStep
            key="photo"
            onPickCamera={() => cameraInputRef.current?.click()}
            onPickGallery={() => galleryInputRef.current?.click()}
            onBack={() => router.push("/")}
            loadingCircles={loadingCircles}
            hasCircles={myCircles.length > 0}
          />
        )}
        {step === "compose" && preview && (
          <ComposeStep
            key="compose"
            preview={preview}
            isVideo={isVideo}
            caption={caption}
            onChangeCaption={setCaption}
            month={month}
            onChangeMonth={setMonth}
            myCircles={myCircles}
            circleId={circleId}
            onPickCircle={setCircleId}
            submitting={submitting}
            error={error}
            onSubmit={handleSubmit}
            onRetake={retake}
            selectedCircle={selectedCircle}
          />
        )}
        {step === "done" && (
          <DoneStep key="done" selectedCircle={selectedCircle} />
        )}
      </AnimatePresence>

      {/* Hidden file inputs — opened by the camera/gallery buttons */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*,video/*"
        capture="environment"
        style={{ display: "none" }}
        onChange={handleFile}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*,video/*"
        style={{ display: "none" }}
        onChange={handleFile}
      />

      {step !== "done" && <BottomNav />}
    </div>
  );
}

// -------------------- Step 1: photo capture / select --------------------

function PhotoStep({
  onPickCamera,
  onPickGallery,
  onBack,
  loadingCircles,
  hasCircles,
}: {
  onPickCamera: () => void;
  onPickGallery: () => void;
  onBack: () => void;
  loadingCircles: boolean;
  hasCircles: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="flex flex-col"
      style={{ minHeight: "100svh", paddingBottom: 120 }}
    >
      <div style={{ padding: "48px 20px 16px" }}>
        <h1 className="text-2xl font-bold tracking-widest silver-text">投稿</h1>
        <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.4)", letterSpacing: "0.04em" }}>
          まず写真を撮影するか選択してください
        </p>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-5">
        {/* Big camera tap target */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={onPickCamera}
          className="w-full max-w-xs rounded-3xl flex flex-col items-center justify-center"
          style={{
            height: 240,
            background: "linear-gradient(135deg, rgba(167,139,250,0.22), rgba(167,139,250,0.06))",
            border: "1px solid rgba(167,139,250,0.4)",
            boxShadow: "0 12px 32px rgba(0,0,0,0.4), 0 0 28px rgba(167,139,250,0.15)",
            cursor: "pointer",
          }}
        >
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              background: "rgba(167,139,250,0.18)",
              border: "1px solid rgba(167,139,250,0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 16,
            }}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#E9E0FF" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          </div>
          <span style={{ fontSize: 15, fontWeight: 700, color: "#E9E0FF", letterSpacing: "0.06em" }}>
            カメラを起動
          </span>
          <span style={{ fontSize: 11, color: "rgba(196,181,253,0.65)", marginTop: 4 }}>
            タップして撮影
          </span>
        </motion.button>

        {/* Secondary: pick from gallery */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={onPickGallery}
          className="w-full max-w-xs rounded-2xl flex items-center justify-center gap-2"
          style={{
            padding: "12px 16px",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "rgba(255,255,255,0.7)",
            fontSize: 13,
            letterSpacing: "0.04em",
            cursor: "pointer",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="9" cy="9" r="2" />
            <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
          </svg>
          アルバムから選ぶ
        </motion.button>

        {/* Hint about circles */}
        {!loadingCircles && !hasCircles && (
          <div
            className="w-full max-w-xs rounded-2xl p-4 text-center mt-2"
            style={{
              background: "rgba(248,113,113,0.06)",
              border: "1px solid rgba(248,113,113,0.18)",
            }}
          >
            <p className="text-xs" style={{ color: "rgba(248,113,113,0.9)", lineHeight: 1.7 }}>
              参加しているサークルがまだありません。
              <br />
              招待コードでサークルに参加してから投稿できます。
            </p>
            <Link href="/" style={{ textDecoration: "none" }}>
              <span
                className="inline-block mt-3 rounded-xl px-4 py-2"
                style={{
                  fontSize: 12,
                  background: "rgba(248,113,113,0.12)",
                  border: "1px solid rgba(248,113,113,0.3)",
                  color: "rgba(248,113,113,0.9)",
                  letterSpacing: "0.04em",
                }}
              >
                ホームに戻る
              </span>
            </Link>
          </div>
        )}
      </div>

      {/* Back link (small) */}
      <div className="flex justify-center" style={{ paddingBottom: 110 }}>
        <button
          onClick={onBack}
          style={{
            fontSize: 11,
            color: "rgba(255,255,255,0.3)",
            background: "none",
            border: "none",
            cursor: "pointer",
            letterSpacing: "0.04em",
          }}
        >
          キャンセル
        </button>
      </div>
    </motion.div>
  );
}

// -------------------- Step 2: compose --------------------

function ComposeStep({
  preview,
  isVideo,
  caption,
  onChangeCaption,
  month,
  onChangeMonth,
  myCircles,
  circleId,
  onPickCircle,
  submitting,
  error,
  onSubmit,
  onRetake,
  selectedCircle,
}: {
  preview: string;
  isVideo: boolean;
  caption: string;
  onChangeCaption: (v: string) => void;
  month: number;
  onChangeMonth: (m: number) => void;
  myCircles: Circle[];
  circleId: string | null;
  onPickCircle: (id: string) => void;
  submitting: boolean;
  error: string;
  onSubmit: () => void;
  onRetake: () => void;
  selectedCircle: Circle | null;
}) {
  const canSubmit = !submitting && !!circleId;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      style={{ paddingBottom: 200 }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3"
        style={{ padding: "48px 20px 12px" }}
      >
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={onRetake}
          className="glass rounded-full flex items-center justify-center"
          style={{ width: 36, height: 36, border: "1px solid rgba(255,255,255,0.10)", background: "none", cursor: "pointer" }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" style={{ pointerEvents: "none" }}>
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </motion.button>
        <div className="flex-1">
          <h1 className="text-sm font-semibold silver-text">投稿内容を確認</h1>
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
            どのサークルに投稿するか選んでください
          </p>
        </div>
      </div>

      <div className="px-4">
        {/* Preview */}
        <div
          className="glass rounded-2xl overflow-hidden"
          style={{ border: "1px solid rgba(255,255,255,0.08)" }}
        >
          {isVideo ? (
            <video
              src={preview}
              autoPlay
              muted
              loop
              playsInline
              controls
              style={{ width: "100%", maxHeight: 420, objectFit: "contain", display: "block", background: "#000" }}
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview}
              alt=""
              style={{ width: "100%", maxHeight: 420, objectFit: "contain", display: "block", background: "#000" }}
            />
          )}
        </div>
        <div className="flex justify-end mt-2">
          <button
            onClick={onRetake}
            style={{
              fontSize: 11,
              color: "rgba(196,181,253,0.7)",
              background: "none",
              border: "none",
              cursor: "pointer",
              letterSpacing: "0.04em",
            }}
          >
            撮り直す / 別の写真を選ぶ
          </button>
        </div>

        {/* Circle picker */}
        <div className="mt-5">
          <p className="text-xs mb-2 px-1" style={{ color: "rgba(255,255,255,0.5)", letterSpacing: "0.08em" }}>
            投稿先のサークル {selectedCircle && <span style={{ color: "#C4B5FD" }}>— {selectedCircle.name}</span>}
          </p>
          {myCircles.length === 0 ? (
            <div
              className="glass rounded-2xl p-4 text-center"
              style={{ border: "1px dashed rgba(255,255,255,0.08)" }}
            >
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                参加サークルがありません
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {myCircles.map((c) => {
                const active = c.id === circleId;
                return (
                  <motion.button
                    key={c.id}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onPickCircle(c.id)}
                    className="w-full rounded-xl flex items-center gap-3"
                    style={{
                      padding: "10px 12px",
                      background: active
                        ? "rgba(167,139,250,0.16)"
                        : "rgba(255,255,255,0.04)",
                      border: active
                        ? "1px solid rgba(167,139,250,0.42)"
                        : "1px solid rgba(255,255,255,0.07)",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                    }}
                  >
                    {c.icon_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.icon_url} alt="" style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                    ) : (
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: "50%",
                          background: "rgba(255,255,255,0.08)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 16,
                          flexShrink: 0,
                        }}
                      >
                        {c.emoji}
                      </div>
                    )}
                    <span
                      className="flex-1 text-left truncate"
                      style={{
                        fontSize: 13,
                        fontWeight: active ? 600 : 500,
                        color: active ? "#E9E0FF" : "rgba(255,255,255,0.7)",
                      }}
                    >
                      {c.name}
                    </span>
                    {active && (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C4B5FD" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </motion.button>
                );
              })}
            </div>
          )}
        </div>

        {/* Month */}
        <div className="mt-5">
          <p className="text-xs mb-2 px-1" style={{ color: "rgba(255,255,255,0.5)", letterSpacing: "0.08em" }}>
            活動の月
          </p>
          <div className="grid grid-cols-6 gap-1.5">
            {MONTHS.map((m, i) => {
              const active = month === i + 1;
              return (
                <motion.button
                  key={i}
                  type="button"
                  whileTap={{ scale: 0.92 }}
                  onClick={() => onChangeMonth(i + 1)}
                  className="rounded-xl py-2 text-xs"
                  style={{
                    background: active ? "rgba(167,139,250,0.15)" : "rgba(255,255,255,0.04)",
                    border: active ? "1px solid rgba(167,139,250,0.4)" : "1px solid rgba(255,255,255,0.07)",
                    color: active ? "#C4B5FD" : "rgba(255,255,255,0.4)",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                >
                  {m}
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Caption */}
        <div className="mt-5">
          <p className="text-xs mb-2 px-1" style={{ color: "rgba(255,255,255,0.5)", letterSpacing: "0.08em" }}>
            キャプション（任意）
          </p>
          <textarea
            value={caption}
            onChange={(e) => onChangeCaption(e.target.value)}
            placeholder="活動の様子を一言..."
            rows={3}
            className="w-full rounded-xl px-4 py-3 text-sm outline-none resize-none"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.10)",
              color: "var(--silver-bright)",
            }}
          />
        </div>

        {error && (
          <p className="text-xs mt-2 px-1" style={{ color: "rgba(248,113,113,0.85)" }}>
            {error}
          </p>
        )}
      </div>

      {/* Fixed submit bar */}
      <div
        style={{
          position: "fixed",
          bottom: 96,
          left: 0,
          right: 0,
          zIndex: 55,
          padding: "12px 20px 0",
          background: "linear-gradient(to top, #0D0D0F 60%, transparent)",
        }}
      >
        <motion.button
          whileTap={canSubmit ? { scale: 0.97 } : undefined}
          onClick={canSubmit ? onSubmit : undefined}
          disabled={!canSubmit}
          className="w-full rounded-2xl py-4"
          style={{
            background: canSubmit
              ? "linear-gradient(135deg, rgba(167,139,250,0.25), rgba(167,139,250,0.10))"
              : "rgba(255,255,255,0.04)",
            border: canSubmit
              ? "1px solid rgba(167,139,250,0.38)"
              : "1px solid rgba(255,255,255,0.08)",
            color: canSubmit ? "#C4B5FD" : "rgba(255,255,255,0.25)",
            fontSize: 14,
            fontWeight: 600,
            letterSpacing: "0.05em",
            cursor: canSubmit ? "pointer" : "not-allowed",
            transition: "all 0.25s ease",
          }}
        >
          {submitting ? "投稿中..." : circleId ? "投稿する" : "投稿先を選んでください"}
        </motion.button>
      </div>
    </motion.div>
  );
}

// -------------------- Step 3: done --------------------

function DoneStep({ selectedCircle }: { selectedCircle: Circle | null }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="flex items-center justify-center"
      style={{ minHeight: "100svh", padding: 32 }}
    >
      <div
        className="glass rounded-3xl p-10 flex flex-col items-center"
        style={{ border: "1px solid rgba(167,139,250,0.25)" }}
      >
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
          style={{ background: "rgba(167,139,250,0.15)", border: "1px solid rgba(167,139,250,0.35)" }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#C4B5FD" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <p className="text-sm font-semibold silver-text">投稿しました</p>
        {selectedCircle && (
          <p className="text-xs mt-1.5" style={{ color: "rgba(255,255,255,0.4)" }}>
            {selectedCircle.emoji} {selectedCircle.name} のページへ移動します
          </p>
        )}
      </div>
    </motion.div>
  );
}
