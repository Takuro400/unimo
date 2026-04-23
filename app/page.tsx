"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { useAuth } from "@/lib/useAuth";
import { supabase } from "@/lib/supabase";
import { MOCK_CIRCLES, MOCK_POSTS } from "@/lib/mock-data";
import type { Circle, Post } from "@/lib/types";
import { useRouter } from "next/navigation";

type CircleFeedItem = { circle: Circle; posts: Post[] };

const GRADIENTS = [
  "from-slate-700 to-slate-900",
  "from-violet-900 to-slate-900",
  "from-zinc-700 to-zinc-900",
  "from-stone-700 to-stone-900",
  "from-neutral-800 to-zinc-900",
  "from-gray-700 to-gray-900",
  "from-zinc-800 to-slate-900",
  "from-slate-600 to-zinc-900",
];

function groupPostsByCircle(
  posts: (Post & { circle: Circle })[]
): CircleFeedItem[] {
  const byCircle = new Map<string, CircleFeedItem>();
  for (const p of posts) {
    if (!p.circle) continue;
    let entry = byCircle.get(p.circle_id);
    if (!entry) {
      entry = { circle: p.circle, posts: [] };
      byCircle.set(p.circle_id, entry);
    }
    entry.posts.push(p);
  }
  const items = Array.from(byCircle.values());
  for (const item of items) {
    item.posts.sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  }
  items.sort((a, b) => {
    const la = a.posts[a.posts.length - 1]?.created_at ?? "";
    const lb = b.posts[b.posts.length - 1]?.created_at ?? "";
    return new Date(lb).getTime() - new Date(la).getTime();
  });
  return items;
}

function buildMockFeed(): CircleFeedItem[] {
  const circleMap = Object.fromEntries(MOCK_CIRCLES.map((c) => [c.id, c]));
  const enriched = Object.values(MOCK_POSTS)
    .flat()
    .filter((p) => circleMap[p.circle_id])
    .map((p) => ({ ...p, circle: circleMap[p.circle_id] }));
  return groupPostsByCircle(enriched);
}

export default function Home() {
  const user = useAuth();
  const router = useRouter();
  const [feed, setFeed] = useState<CircleFeedItem[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [showJoinModal, setShowJoinModal] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      if (supabase) {
        const { data } = await supabase
          .from("posts")
          .select("*, circles(*)")
          .order("created_at", { ascending: false })
          .limit(150);

        if (data?.length) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const enriched = (data as any[]).map((p) => ({ ...p, circle: p.circles }));
          setFeed(groupPostsByCircle(enriched));
        } else {
          setFeed(buildMockFeed());
        }
      } else {
        setFeed(buildMockFeed());
      }
      setDataLoading(false);
    })();
  }, [user]);

  if (user === undefined) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: "#0D0D0F" }}>
        <div style={{ width: 28, height: 28, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.1)", borderTopColor: "rgba(255,255,255,0.5)", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ background: "#0D0D0F", height: "100svh", overflow: "hidden", position: "relative" }}>
      {/* Floating header */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          padding: "48px 20px 16px",
          background: "linear-gradient(to bottom, rgba(13,13,15,0.85) 0%, transparent 100%)",
          pointerEvents: "none",
        }}
      >
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-widest silver-text">UniMo</h1>
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
            {user?.email?.split("@")[0]}
          </p>
        </div>
      </div>

      {/* Feed */}
      {dataLoading ? (
        <div className="flex items-center justify-center" style={{ height: "100svh" }}>
          <div style={{ width: 24, height: 24, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.1)", borderTopColor: "rgba(255,255,255,0.5)", animation: "spin 0.8s linear infinite" }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : feed.length === 0 ? (
        <div className="flex items-center justify-center flex-col gap-3" style={{ height: "100svh" }}>
          <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 14 }}>まだ投稿がありません</p>
        </div>
      ) : (
        <div
          style={{
            height: "100svh",
            overflowY: "scroll",
            scrollSnapType: "y mandatory",
            scrollbarWidth: "none",
          }}
        >
          {feed.map((item, i) => (
            <CircleCard
              key={item.circle.id}
              circle={item.circle}
              posts={item.posts}
              index={i}
              onNavigate={(id) => router.push(`/circle/${id}`)}
            />
          ))}
          <div style={{ height: "20svh", flexShrink: 0 }} />
        </div>
      )}

      {/* 参加する FAB */}
      <div style={{ position: "fixed", bottom: 32, right: 20, zIndex: 50 }}>
        <motion.div
          whileTap={{ scale: 0.94 }}
          onClick={() => setShowJoinModal(true)}
          className="glass rounded-2xl flex items-center gap-2 px-4 py-3 cursor-pointer"
          style={{
            border: "1px solid rgba(167,139,250,0.3)",
            background: "rgba(13,13,15,0.7)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
          }}
        >
          <span style={{ fontSize: 14, color: "#A78BFA" }}>🎫</span>
          <span style={{ fontSize: 13, color: "#C4B5FD", letterSpacing: "0.03em" }}>サークルに参加する</span>
        </motion.div>
      </div>

      {/* Join modal */}
      <AnimatePresence>
        {showJoinModal && (
          <JoinModal
            user={user}
            onClose={() => setShowJoinModal(false)}
            onJoined={(circleId) => {
              setShowJoinModal(false);
              router.push(`/circle/${circleId}`);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function CircleCard({
  circle,
  posts,
  index,
  onNavigate,
}: {
  circle: Circle;
  posts: Post[];
  index: number;
  onNavigate: (id: string) => void;
}) {
  const gradient = GRADIENTS[index % GRADIENTS.length];
  const lastIdx = posts.length - 1;
  const initialIdx = Math.max(0, lastIdx - 2);
  const minIdx = Math.max(0, initialIdx - 2);
  const maxIdx = Math.min(lastIdx, initialIdx + 2);

  const [idx, setIdx] = useState(initialIdx);
  const [dir, setDir] = useState(0);
  const draggedRef = useRef(false);

  const current = posts[idx];
  const isVideo = /\.(mp4|webm|mov|m4v)(\?|$)/i.test(current?.media_url ?? "");

  function handleDragEnd(_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) {
    const swipe = info.offset.x + info.velocity.x * 0.1;
    const THRESHOLD = 60;

    if (Math.abs(info.offset.x) > 10) draggedRef.current = true;

    if (swipe > THRESHOLD) {
      // 右スワイプ = 新しい写真
      if (idx >= maxIdx) {
        onNavigate(circle.id);
      } else {
        setDir(1);
        setIdx(idx + 1);
      }
    } else if (swipe < -THRESHOLD) {
      // 左スワイプ = 昔の写真
      if (idx <= minIdx) {
        onNavigate(circle.id);
      } else {
        setDir(-1);
        setIdx(idx - 1);
      }
    }
  }

  function handleClick() {
    if (draggedRef.current) {
      draggedRef.current = false;
      return;
    }
    onNavigate(circle.id);
  }

  const variants = {
    enter: (d: number) => ({ x: d > 0 ? "100%" : "-100%", opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d > 0 ? "-100%" : "100%", opacity: 0 }),
  };

  return (
    <div
      style={{
        width: "100%",
        height: "80svh",
        scrollSnapAlign: "start",
        position: "relative",
        overflow: "hidden",
        cursor: "pointer",
      }}
    >
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.25}
        onDragEnd={handleDragEnd}
        onClick={handleClick}
        style={{
          width: "100%",
          height: "100%",
          position: "absolute",
          inset: 0,
          touchAction: "pan-y",
        }}
      >
        <AnimatePresence initial={false} mode="wait" custom={dir}>
          <motion.div
            key={current?.id ?? "empty"}
            custom={dir}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ x: { type: "tween", duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] }, opacity: { duration: 0.2 } }}
            style={{ width: "100%", height: "100%", position: "absolute", inset: 0 }}
          >
            {current?.media_url ? (
              isVideo ? (
                <video
                  src={current.media_url}
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="none"
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", pointerEvents: "none" }}
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={current.media_url}
                  alt={current.caption ?? ""}
                  loading={index === 0 ? "eager" : "lazy"}
                  decoding="async"
                  draggable={false}
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", pointerEvents: "none" }}
                />
              )
            ) : (
              <div
                className={`bg-gradient-to-br ${gradient}`}
                style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                <span style={{ fontSize: 80, opacity: 0.12 }}>{circle.emoji}</span>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {/* Top overlay — circle name + progress dots */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          padding: "100px 16px 24px",
          background: "linear-gradient(to bottom, rgba(0,0,0,0.65) 0%, transparent 100%)",
          pointerEvents: "none",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {circle.icon_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={circle.icon_url}
              alt=""
              loading="lazy"
              style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: "1.5px solid rgba(255,255,255,0.25)" }}
            />
          ) : (
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 16 }}>
              {circle.emoji}
            </div>
          )}
          <span style={{ fontSize: 16, fontWeight: 700, color: "#fff", letterSpacing: "0.02em" }}>
            {circle.name}
          </span>
          {circle.category && (
            <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 999, background: "rgba(167,139,250,0.25)", border: "1px solid rgba(167,139,250,0.4)", color: "#C4B5FD", letterSpacing: "0.04em" }}>
              {circle.category}
            </span>
          )}
        </div>

        {/* Progress dots — show position within the swipe window */}
        {maxIdx > minIdx && (
          <div style={{ display: "flex", gap: 4, marginTop: 12 }}>
            {Array.from({ length: maxIdx - minIdx + 1 }).map((_, i) => {
              const dotIdx = minIdx + i;
              const active = dotIdx === idx;
              return (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    height: 2,
                    borderRadius: 1,
                    background: active ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.22)",
                    transition: "background 0.25s ease",
                  }}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom overlay — caption */}
      {current?.caption && (
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            padding: "48px 16px 24px",
            background: "linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 100%)",
            pointerEvents: "none",
          }}
        >
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.9)", lineHeight: 1.55 }}>{current.caption}</p>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 6 }}>
            {current.year}年{current.month}月
          </p>
        </div>
      )}
    </div>
  );
}

function JoinModal({ user, onClose, onJoined }: {
  user: { id: string } | null;
  onClose: () => void;
  onJoined: (circleId: string) => void;
}) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (code.length !== 6) return;
    setError("");
    setLoading(true);

    try {
      if (!supabase || !user) {
        setError("ログインが必要です");
        setLoading(false);
        return;
      }

      // Find invite code
      const { data: inviteData, error: inviteErr } = await supabase
        .from("invite_codes")
        .select("circle_id")
        .eq("code", code)
        .single();

      if (inviteErr || !inviteData) {
        setError("コードが違います。もう一度確認してください。");
        setLoading(false);
        return;
      }

      const circleId = inviteData.circle_id;

      // Check already a member
      const { data: existing } = await supabase
        .from("circle_members")
        .select("id")
        .eq("circle_id", circleId)
        .eq("user_id", user.id)
        .single();

      if (existing) {
        // Already member — just navigate
        onJoined(circleId);
        return;
      }

      // Insert membership
      const { error: memberErr } = await supabase
        .from("circle_members")
        .insert({ circle_id: circleId, user_id: user.id, role: "member" });

      if (memberErr) throw memberErr;

      onJoined(circleId);
    } catch {
      setError("参加に失敗しました。もう一度お試しください。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 100, backdropFilter: "blur(4px)" }}
      />

      {/* Sheet */}
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        style={{
          position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 101,
          background: "#141416",
          border: "1px solid rgba(255,255,255,0.10)",
          borderBottom: "none",
          borderRadius: "24px 24px 0 0",
          padding: "24px 24px 48px",
        }}
      >
        <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.15)", margin: "0 auto 24px" }} />

        <p className="text-base font-semibold silver-text mb-1">サークルに参加する</p>
        <p className="text-xs mb-6" style={{ color: "rgba(255,255,255,0.35)" }}>
          サークルの担当者から受け取った6桁の招待コードを入力してください
        </p>

        <form onSubmit={handleJoin} className="flex flex-col gap-3">
          <input
            ref={inputRef}
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="000000"
            inputMode="numeric"
            maxLength={6}
            className="w-full rounded-2xl outline-none text-center"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "#A78BFA",
              fontSize: 32,
              fontWeight: 700,
              letterSpacing: "0.25em",
              padding: "16px 0",
            }}
          />

          <AnimatePresence>
            {error && (
              <motion.p
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="text-xs text-center px-1"
                style={{ color: "rgba(248,113,113,0.85)" }}
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>

          <motion.button
            type="submit"
            disabled={code.length !== 6 || loading}
            whileTap={{ scale: 0.97 }}
            className="w-full rounded-2xl py-4 text-sm font-medium mt-1"
            style={{
              background: code.length === 6 && !loading
                ? "linear-gradient(135deg, rgba(167,139,250,0.25), rgba(167,139,250,0.12))"
                : "rgba(255,255,255,0.04)",
              border: "1px solid rgba(167,139,250,0.3)",
              color: code.length === 6 && !loading ? "#C4B5FD" : "rgba(255,255,255,0.2)",
              cursor: code.length === 6 && !loading ? "pointer" : "not-allowed",
              letterSpacing: "0.04em",
              transition: "all 0.25s ease",
            }}
          >
            {loading ? "参加中..." : "参加する"}
          </motion.button>
        </form>
      </motion.div>
    </>
  );
}
