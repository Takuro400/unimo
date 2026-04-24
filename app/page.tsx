"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence, PanInfo, useMotionValue, animate } from "framer-motion";
import { useAuth } from "@/lib/useAuth";
import { supabase } from "@/lib/supabase";
import { MOCK_CIRCLES, MOCK_POSTS } from "@/lib/mock-data";
import type { Circle, Post } from "@/lib/types";
import { useRouter } from "next/navigation";
import BottomNav from "@/components/BottomNav";

type CircleFeedItem = { circle: Circle; posts: Post[] };

type PosterProfile = { user_id: string; nickname: string | null; avatar_url: string | null };

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
  const [showNicknameModal, setShowNicknameModal] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [myCircleIds, setMyCircleIds] = useState<Set<string>>(new Set());
  const [favLimitToast, setFavLimitToast] = useState(false);
  const [profiles, setProfiles] = useState<Record<string, PosterProfile>>({});

  // First-time welcome: prompt for nickname if not set
  useEffect(() => {
    if (!user) return;
    if (user.id === "dev-user") return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const meta = (user.user_metadata ?? {}) as any;
    if (!meta.nickname?.trim()) setShowNicknameModal(true);
  }, [user]);

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

          // Fetch poster profiles for the displayed posts (graceful if table missing)
          const posterIds = Array.from(
            new Set(enriched.map((p) => p.posted_by).filter(Boolean) as string[])
          );
          if (posterIds.length > 0) {
            const { data: profileData, error: profileErr } = await supabase
              .from("profiles")
              .select("user_id, nickname, avatar_url")
              .in("user_id", posterIds);
            if (!profileErr && profileData) {
              const map: Record<string, PosterProfile> = {};
              for (const p of profileData as PosterProfile[]) map[p.user_id] = p;
              setProfiles(map);
            }
          }
        } else {
          setFeed(buildMockFeed());
        }

        if (user.id !== "dev-user") {
          const { data: memberData } = await supabase
            .from("circle_members")
            .select("circle_id")
            .eq("user_id", user.id);
          if (memberData) {
            setMyCircleIds(new Set(memberData.map((r) => r.circle_id)));
          }
        } else {
          setMyCircleIds(new Set(MOCK_CIRCLES.map((c) => c.id)));
        }
      } else {
        setFeed(buildMockFeed());
        setMyCircleIds(new Set(MOCK_CIRCLES.map((c) => c.id)));
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const meta = (user.user_metadata ?? {}) as any;
      setFavorites(Array.isArray(meta.favorites) ? meta.favorites : []);
      setDataLoading(false);
    })();
  }, [user]);

  async function toggleFavorite(postId: string, circleId: string) {
    if (!myCircleIds.has(circleId)) return;
    const already = favorites.includes(postId);
    let next: string[];
    if (already) {
      next = favorites.filter((id) => id !== postId);
    } else {
      if (favorites.length >= 6) {
        setFavLimitToast(true);
        setTimeout(() => setFavLimitToast(false), 2200);
        return;
      }
      next = [...favorites, postId];
    }
    setFavorites(next);
    if (supabase && user && user.id !== "dev-user") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const currentMeta = (user.user_metadata ?? {}) as any;
      await supabase.auth.updateUser({ data: { ...currentMeta, favorites: next } });
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
              canFavorite={myCircleIds.has(item.circle.id)}
              favorites={favorites}
              onToggleFavorite={toggleFavorite}
              profiles={profiles}
            />
          ))}
          <div style={{ height: "20svh", flexShrink: 0 }} />
        </div>
      )}

      {/* 参加する FAB — sits above the bottom nav */}
      <div style={{ position: "fixed", bottom: 116, right: 20, zIndex: 55 }}>
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

      <BottomNav />

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

      {/* First-time nickname setup */}
      <AnimatePresence>
        {showNicknameModal && (
          <NicknameSetupModal onDone={() => setShowNicknameModal(false)} />
        )}
      </AnimatePresence>

      {/* Favorite limit toast */}
      <AnimatePresence>
        {favLimitToast && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            style={{
              position: "fixed",
              bottom: 130,
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 80,
              padding: "10px 18px",
              borderRadius: 12,
              background: "rgba(20,20,22,0.95)",
              border: "1px solid rgba(167,139,250,0.3)",
              color: "rgba(196,181,253,0.9)",
              fontSize: 12,
              letterSpacing: "0.03em",
              boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
              backdropFilter: "blur(12px)",
              whiteSpace: "nowrap",
            }}
          >
            お気に入りは6つまで。マイページで整理してね
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NicknameSetupModal({ onDone }: { onDone: () => void }) {
  const [nickname, setNickname] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    const v = nickname.trim();
    if (!v) {
      setError("ニックネームを入力してください");
      return;
    }
    setError("");
    setSaving(true);
    try {
      if (supabase) {
        const { error: e } = await supabase.auth.updateUser({ data: { nickname: v } });
        if (e) throw e;
      }
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.7)",
          zIndex: 100,
          backdropFilter: "blur(6px)",
        }}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ type: "spring", damping: 22, stiffness: 280 }}
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 101,
          width: "min(92vw, 380px)",
          background: "#141416",
          border: "1px solid rgba(167,139,250,0.22)",
          borderRadius: 24,
          padding: "32px 24px 24px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.6), 0 0 40px rgba(167,139,250,0.08)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              margin: "0 auto 14px",
              background: "linear-gradient(135deg, rgba(167,139,250,0.3), rgba(167,139,250,0.1))",
              border: "1px solid rgba(167,139,250,0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 26,
            }}
          >
            ✨
          </div>
          <p className="text-base font-semibold silver-text" style={{ letterSpacing: "0.05em" }}>
            ニックネームを決めよう
          </p>
          <p className="text-xs mt-1.5" style={{ color: "rgba(255,255,255,0.45)", lineHeight: 1.6 }}>
            アプリ内で表示される名前です。<br />
            あとからマイページで変えられます。
          </p>
        </div>
        <input
          autoFocus
          type="text"
          maxLength={20}
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="例: たくろう"
          className="w-full rounded-xl px-4 py-3"
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.12)",
            color: "#E0E0E8",
            fontSize: 15,
            outline: "none",
            textAlign: "center",
            letterSpacing: "0.05em",
          }}
        />
        {error && (
          <p className="text-xs mt-2 text-center" style={{ color: "rgba(248,113,113,0.85)" }}>
            {error}
          </p>
        )}
        <motion.button
          whileTap={saving ? undefined : { scale: 0.97 }}
          onClick={saving ? undefined : handleSave}
          disabled={saving || !nickname.trim()}
          className="mt-4 w-full rounded-xl py-3"
          style={{
            background:
              saving || !nickname.trim()
                ? "rgba(255,255,255,0.04)"
                : "linear-gradient(135deg, rgba(167,139,250,0.28), rgba(167,139,250,0.12))",
            border:
              saving || !nickname.trim()
                ? "1px solid rgba(255,255,255,0.08)"
                : "1px solid rgba(167,139,250,0.38)",
            color: saving || !nickname.trim() ? "rgba(255,255,255,0.3)" : "#C4B5FD",
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: "0.05em",
            cursor: saving || !nickname.trim() ? "not-allowed" : "pointer",
            transition: "all 0.25s ease",
          }}
        >
          {saving ? "保存中..." : "はじめる"}
        </motion.button>
      </motion.div>
    </>
  );
}

function PhotoLayer({
  post,
  circleEmoji,
  gradient,
  leftPercent,
  eager,
}: {
  post: Post;
  circleEmoji: string;
  gradient: string;
  leftPercent: number;
  eager?: boolean;
}) {
  const isVideo = /\.(mp4|webm|mov|m4v)(\?|$)/i.test(post.media_url ?? "");
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: `${leftPercent}%`,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
      }}
    >
      {post.media_url ? (
        isVideo ? (
          <video
            src={post.media_url}
            autoPlay
            muted
            loop
            playsInline
            preload="none"
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.media_url}
            alt={post.caption ?? ""}
            loading={eager ? "eager" : "lazy"}
            decoding="async"
            draggable={false}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        )
      ) : (
        <div
          className={`bg-gradient-to-br ${gradient}`}
          style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <span style={{ fontSize: 80, opacity: 0.12 }}>{circleEmoji}</span>
        </div>
      )}
    </div>
  );
}

function CircleCard({
  circle,
  posts,
  index,
  onNavigate,
  canFavorite,
  favorites,
  onToggleFavorite,
  profiles,
}: {
  circle: Circle;
  posts: Post[];
  index: number;
  onNavigate: (id: string) => void;
  canFavorite: boolean;
  favorites: string[];
  onToggleFavorite: (postId: string, circleId: string) => void;
  profiles: Record<string, PosterProfile>;
}) {
  const gradient = GRADIENTS[index % GRADIENTS.length];
  const lastIdx = posts.length - 1;
  const initialIdx = Math.max(0, lastIdx - 2);
  const minIdx = Math.max(0, initialIdx - 2);
  const maxIdx = Math.min(lastIdx, initialIdx + 2);

  const [idx, setIdx] = useState(initialIdx);
  const containerRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const draggedRef = useRef(false);
  const animatingRef = useRef(false);

  const current = posts[idx];
  // Right swipe = newer (idx + 1); it needs to appear from the left, so place at leftPercent: -100
  const newerPost = idx + 1 <= lastIdx ? posts[idx + 1] : null;
  // Left swipe = older (idx - 1); appear from the right, leftPercent: +100
  const olderPost = idx - 1 >= 0 ? posts[idx - 1] : null;

  function getWidth() {
    return containerRef.current?.offsetWidth ?? (typeof window !== "undefined" ? window.innerWidth : 375);
  }

  function handleDragEnd(_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) {
    if (animatingRef.current) return;
    if (Math.abs(info.offset.x) > 8) draggedRef.current = true;

    const w = getWidth();
    const threshold = Math.min(80, w * 0.2);
    const swipe = info.offset.x + info.velocity.x * 0.15;

    const springBack = () =>
      animate(x, 0, { type: "spring", stiffness: 500, damping: 40 });

    if (swipe > threshold) {
      // 右スワイプ = 新しい写真
      if (idx >= maxIdx) {
        springBack();
        onNavigate(circle.id);
        return;
      }
      animatingRef.current = true;
      animate(x, w, {
        duration: 0.28,
        ease: [0.25, 0.46, 0.45, 0.94],
        onComplete: () => {
          setIdx((i) => i + 1);
          x.set(0);
          animatingRef.current = false;
        },
      });
    } else if (swipe < -threshold) {
      // 左スワイプ = 昔の写真
      if (idx <= minIdx) {
        springBack();
        onNavigate(circle.id);
        return;
      }
      animatingRef.current = true;
      animate(x, -w, {
        duration: 0.28,
        ease: [0.25, 0.46, 0.45, 0.94],
        onComplete: () => {
          setIdx((i) => i - 1);
          x.set(0);
          animatingRef.current = false;
        },
      });
    } else {
      springBack();
    }
  }

  function handleClick() {
    if (draggedRef.current) {
      draggedRef.current = false;
      return;
    }
    onNavigate(circle.id);
  }

  return (
    <div
      ref={containerRef}
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
        dragElastic={1}
        dragMomentum={false}
        onDragEnd={handleDragEnd}
        onClick={handleClick}
        style={{
          x,
          position: "absolute",
          inset: 0,
          touchAction: "pan-y",
        }}
      >
        {newerPost && (
          <PhotoLayer
            post={newerPost}
            circleEmoji={circle.emoji}
            gradient={gradient}
            leftPercent={-100}
          />
        )}
        {current && (
          <PhotoLayer
            post={current}
            circleEmoji={circle.emoji}
            gradient={gradient}
            leftPercent={0}
            eager={index === 0}
          />
        )}
        {olderPost && (
          <PhotoLayer
            post={olderPost}
            circleEmoji={circle.emoji}
            gradient={gradient}
            leftPercent={100}
          />
        )}
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

        {/* Progress dots — 左=新しい / 右=古い(写真ストリップの並びに合わせる) */}
        {maxIdx > minIdx && (
          <div style={{ display: "flex", gap: 4, marginTop: 12 }}>
            {Array.from({ length: maxIdx - minIdx + 1 }).map((_, i) => {
              const dotIdx = maxIdx - i;
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

      {/* Bottom overlay — caption (left side only; right side is reserved for poster chip) */}
      {current?.caption && (
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            padding: "48px 140px 24px 16px",
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

      {/* Poster chip — bottom-right */}
      {current && (
        <PosterChip
          profile={current.posted_by ? profiles[current.posted_by] : undefined}
          posterEmail={undefined}
        />
      )}

      {/* Heart favorite button — top-right, only for members of this circle */}
      {canFavorite && current && (
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(current.id, circle.id);
          }}
          aria-label={favorites.includes(current.id) ? "お気に入りを解除" : "お気に入りに追加"}
          style={{
            position: "absolute",
            top: 100,
            right: 16,
            width: 44,
            height: 44,
            borderRadius: "50%",
            background: favorites.includes(current.id)
              ? "rgba(248,113,113,0.22)"
              : "rgba(0,0,0,0.5)",
            border: favorites.includes(current.id)
              ? "1px solid rgba(248,113,113,0.6)"
              : "1px solid rgba(255,255,255,0.2)",
            backdropFilter: "blur(10px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            padding: 0,
            zIndex: 5,
            boxShadow: "0 4px 14px rgba(0,0,0,0.4)",
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill={favorites.includes(current.id) ? "#F87171" : "none"}
            stroke={favorites.includes(current.id) ? "#F87171" : "rgba(255,255,255,0.9)"}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </motion.button>
      )}
    </div>
  );
}

function PosterChip({
  profile,
  posterEmail,
}: {
  profile: PosterProfile | undefined;
  posterEmail: string | undefined;
}) {
  const name = profile?.nickname?.trim() || posterEmail?.split("@")[0] || "名無し";
  const initial = name.charAt(0).toUpperCase();
  return (
    <div
      style={{
        position: "absolute",
        bottom: 24,
        right: 16,
        zIndex: 4,
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "4px 12px 4px 4px",
        borderRadius: 999,
        background: "rgba(0,0,0,0.55)",
        border: "1px solid rgba(255,255,255,0.14)",
        backdropFilter: "blur(10px)",
        boxShadow: "0 4px 14px rgba(0,0,0,0.35)",
        maxWidth: 160,
        pointerEvents: "none",
      }}
    >
      {profile?.avatar_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={profile.avatar_url}
          alt=""
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            objectFit: "cover",
            flexShrink: 0,
            border: "1px solid rgba(255,255,255,0.25)",
          }}
        />
      ) : (
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            background: "linear-gradient(135deg, rgba(167,139,250,0.28), rgba(167,139,250,0.12))",
            border: "1px solid rgba(167,139,250,0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            fontSize: 13,
            color: "#E9E0FF",
            fontWeight: 600,
            letterSpacing: "0.02em",
          }}
        >
          {initial}
        </div>
      )}
      <span
        style={{
          fontSize: 12,
          color: "rgba(255,255,255,0.92)",
          fontWeight: 500,
          letterSpacing: "0.02em",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {name}
      </span>
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
