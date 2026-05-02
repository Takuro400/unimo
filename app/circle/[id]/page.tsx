"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/useAuth";
import { useFavorites } from "@/lib/useFavorites";
import { supabase } from "@/lib/supabase";
import { MOCK_CIRCLES, MOCK_POSTS } from "@/lib/mock-data";
import type { Circle, Post } from "@/lib/types";
import Dial from "@/components/Dial";
import FavoriteButton from "@/components/FavoriteButton";

const MONTHS = ["1月","2月","3月","4月","5月","6月","7月","8月","9月","10月","11月","12月"];
const GRADIENTS = [
  "from-slate-200 to-slate-300",
  "from-zinc-200 to-zinc-300",
  "from-neutral-200 to-neutral-300",
  "from-stone-200 to-stone-300",
];

type View = "month" | "day" | "posts";

function getPostDay(post: Post): number {
  const d = new Date(post.created_at);
  return isNaN(d.getTime()) ? 1 : d.getDate();
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export default function CircleDetailPage() {
  const user = useAuth();
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = params.id as string;

  const initialMonth = (() => {
    const v = Number(searchParams.get("month"));
    return Number.isFinite(v) && v >= 1 && v <= 12 ? v : new Date().getMonth() + 1;
  })();
  const initialDay = (() => {
    const v = Number(searchParams.get("day"));
    return Number.isFinite(v) && v >= 1 && v <= 31 ? v : 1;
  })();
  const initialView = (() => {
    const v = searchParams.get("view");
    return v === "day" || v === "posts" ? (v as View) : "month";
  })();

  const [circle, setCircle] = useState<Circle | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isMember, setIsMember] = useState(false);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [favLimitToast, setFavLimitToast] = useState(false);
  const [deleteErrorToast, setDeleteErrorToast] = useState(false);

  const {
    isFavorited: isCircleFavorited,
    isPending: isCircleFavPending,
    toggle: toggleCircleFavorite,
    errorToast: circFavError,
    clearErrorToast: clearCircFavError,
  } = useFavorites();

  const [view, setView] = useState<View>(initialView);
  const [selectedMonth, setSelectedMonth] = useState(initialMonth);
  const [selectedDay, setSelectedDay] = useState<number>(initialDay);

  useEffect(() => {
    if (!user) return;
    (async () => {
      if (supabase) {
        const [{ data: circleData }, { data: postsData }, { data: memberData }] = await Promise.all([
          supabase.from("circles").select("*").eq("id", id).single(),
          supabase.from("posts").select("*").eq("circle_id", id).order("created_at", { ascending: false }),
          user.id !== "dev-user"
            ? supabase.from("circle_members").select("id").eq("circle_id", id).eq("user_id", user.id).single()
            : Promise.resolve({ data: null }),
        ]);
        setCircle(circleData ?? MOCK_CIRCLES.find((c) => c.id === id) ?? null);
        setPosts(postsData ?? MOCK_POSTS[id] ?? []);
        setIsMember(!!memberData);
      } else {
        setCircle(MOCK_CIRCLES.find((c) => c.id === id) ?? null);
        setPosts(MOCK_POSTS[id] ?? []);
        setIsMember(true);
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const meta = (user.user_metadata ?? {}) as any;
      setFavorites(Array.isArray(meta.favorites) ? meta.favorites : []);
      setLoading(false);
    })();
  }, [user, id]);

  async function toggleFavorite(postId: string) {
    if (!isMember) return;
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
    if (supabase && user?.id !== "dev-user") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const currentMeta = (user?.user_metadata ?? {}) as any;
      await supabase.auth.updateUser({ data: { ...currentMeta, favorites: next } });
    }
  }

  async function deletePost(post: Post) {
    if (!user || post.posted_by !== user.id) return;

    setPosts((prev) => prev.filter((p) => p.id !== post.id));
    if (favorites.includes(post.id)) {
      const nextFavs = favorites.filter((id) => id !== post.id);
      setFavorites(nextFavs);
      if (supabase && user.id !== "dev-user") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const currentMeta = (user.user_metadata ?? {}) as any;
        await supabase.auth.updateUser({ data: { ...currentMeta, favorites: nextFavs } });
      }
    }

    if (supabase && user.id !== "dev-user") {
      const { error: delErr } = await supabase.from("posts").delete().eq("id", post.id);
      if (delErr) {
        console.error("post delete failed", delErr);
        setPosts((prev) => [post, ...prev]);
        setDeleteErrorToast(true);
        setTimeout(() => setDeleteErrorToast(false), 3000);
        return;
      }
      const marker = "/storage/v1/object/public/posts/";
      const idx = post.media_url?.indexOf(marker) ?? -1;
      if (idx >= 0) {
        const path = post.media_url.slice(idx + marker.length);
        await supabase.storage.from("posts").remove([path]).catch(() => {});
      }
    }
  }

  const monthPosts = useMemo(
    () => posts.filter((p) => p.month === selectedMonth),
    [posts, selectedMonth]
  );
  const dayPosts = useMemo(
    () => monthPosts.filter((p) => getPostDay(p) === selectedDay),
    [monthPosts, selectedDay]
  );

  const monthsWithPosts = useMemo(
    () => new Set(posts.map((p) => p.month - 1)),
    [posts]
  );
  const daysWithPosts = useMemo(
    () => new Set(monthPosts.map((p) => getPostDay(p) - 1)),
    [monthPosts]
  );

  const dayCount = useMemo(() => {
    const year = monthPosts[0]?.year ?? new Date().getFullYear();
    const calendarDays = daysInMonth(year, selectedMonth);
    const postMaxDay = monthPosts.reduce((mx, p) => Math.max(mx, getPostDay(p)), 0);
    return Math.max(calendarDays, postMaxDay);
  }, [monthPosts, selectedMonth]);

  const daysArray = useMemo(
    () => Array.from({ length: dayCount }, (_, i) => `${i + 1}日`),
    [dayCount]
  );

  useEffect(() => {
    if (selectedDay > dayCount) setSelectedDay(Math.max(1, dayCount));
  }, [dayCount, selectedDay]);

  const monthPreview = monthPosts.slice(0, 3);
  const dayPreview = dayPosts.slice(0, 3);

  if (user === undefined || loading) {
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

  if (!circle) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: "#FAFAFA" }}>
        <p style={{ color: "#9CA3AF" }}>サークルが見つかりません</p>
      </div>
    );
  }

  function onBackFromDay() {
    setView("month");
  }
  function onBackFromPosts() {
    setView("day");
  }
  function onPickMonth() {
    setSelectedDay(1);
    setView("day");
  }
  function onPickDay() {
    setView("posts");
  }

  return (
    <div className="flex flex-col min-h-screen" style={{ background: "#FAFAFA" }}>
      {/* Header */}
      <div
        className="sticky top-0 z-50 px-4 pt-12 pb-3"
        style={{
          background: "rgba(250,250,250,0.92)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderBottom: "0.5px solid #E5E5E5",
        }}
      >
        <div className="flex items-center gap-3">
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => {
              if (view === "posts") onBackFromPosts();
              else if (view === "day") onBackFromDay();
              else router.back();
            }}
            className="rounded-full flex items-center justify-center flex-shrink-0"
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
          <h1 className="text-base font-semibold truncate" style={{ color: "#1F2937" }}>
            {circle.name}
          </h1>
          <div className="ml-auto flex items-center gap-2">
            <span
              style={{
                fontSize: 11,
                color: "#9CA3AF",
                letterSpacing: "0.04em",
              }}
            >
              {view === "month"
                ? "月を選ぶ"
                : view === "day"
                ? `${selectedMonth}月 / 日を選ぶ`
                : `${selectedMonth}月${selectedDay}日`}
            </span>
            <FavoriteButton
              circleId={id}
              isFavorited={isCircleFavorited(id)}
              isPending={isCircleFavPending(id)}
              onToggle={toggleCircleFavorite}
              size={34}
            />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-28">
        {/* Circle info (compact, only on month view) */}
        {view === "month" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="px-4 pb-3 pt-3 flex items-start gap-3"
          >
            <div
              className="rounded-2xl flex items-center justify-center flex-shrink-0 overflow-hidden"
              style={{
                width: 48,
                height: 48,
                background: "#F1EFE8",
                border: "0.5px solid #E5E5E5",
              }}
            >
              {circle.icon_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={circle.icon_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <span style={{ fontSize: 24 }}>{circle.emoji}</span>
              )}
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
              {circle.category && (
                <span
                  className="inline-block rounded-full px-2 py-0.5 mb-1"
                  style={{
                    fontSize: 10,
                    background: "#FFF0F6",
                    color: "#D4537E",
                    border: "1px solid rgba(212,83,126,0.2)",
                  }}
                >
                  {circle.category}
                </span>
              )}
              <p className="text-xs" style={{ color: "#9CA3AF" }}>
                {posts.length}件の投稿
              </p>
            </div>
            {isMember && (
              <Link href={`/circle/${id}/settings`} style={{ flexShrink: 0 }}>
                <motion.div
                  whileTap={{ scale: 0.92 }}
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
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6C757D" strokeWidth="2">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                  </svg>
                </motion.div>
              </Link>
            )}
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          {view === "month" && (
            <motion.div
              key="month"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="flex flex-col items-center px-4 pt-1"
            >
              <PreviewStrip
                label={`${selectedMonth}月のプレビュー`}
                previews={monthPreview}
                total={monthPosts.length}
              />
              <div className="mt-3">
                <Dial
                  items={MONTHS}
                  initialIndex={selectedMonth - 1}
                  onChange={(idx) => setSelectedMonth(idx + 1)}
                  activeIndices={monthsWithPosts}
                  size={290}
                />
              </div>
            </motion.div>
          )}

          {view === "day" && (
            <motion.div
              key="day"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="flex flex-col items-center px-4 pt-1"
            >
              <PreviewStrip
                label={`${selectedMonth}月${selectedDay}日のプレビュー`}
                previews={dayPreview}
                total={dayPosts.length}
              />
              <div className="mt-3">
                <Dial
                  key={`day-dial-${dayCount}`}
                  items={daysArray}
                  initialIndex={Math.min(selectedDay, dayCount) - 1}
                  onChange={(idx) => setSelectedDay(idx + 1)}
                  activeIndices={daysWithPosts}
                  size={310}
                />
              </div>
            </motion.div>
          )}

          {view === "posts" && (
            <motion.div
              key="posts"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="px-3 pt-2"
            >
              <div className="flex items-baseline gap-2 px-1 pb-3">
                <h2 className="text-lg font-semibold" style={{ color: "#1F2937" }}>
                  {selectedMonth}月{selectedDay}日
                </h2>
                <span className="text-xs" style={{ color: "#9CA3AF" }}>
                  {dayPosts.length}件
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {dayPosts.map((post, i) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    index={i}
                    canFavorite={isMember}
                    favorited={favorites.includes(post.id)}
                    onToggleFavorite={() => toggleFavorite(post.id)}
                    canDelete={!!user && post.posted_by === user.id}
                    onDelete={() => deletePost(post)}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Favorite limit toast */}
      <AnimatePresence>
        {favLimitToast && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            style={{
              position: "fixed",
              bottom: 112,
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 80,
              padding: "10px 18px",
              borderRadius: 12,
              background: "#FFFFFF",
              border: "0.5px solid #E5E5E5",
              color: "#6C757D",
              fontSize: 12,
              letterSpacing: "0.03em",
              boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
              whiteSpace: "nowrap",
            }}
          >
            お気に入りは6つまで。マイページで整理してね
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete error toast */}
      <AnimatePresence>
        {deleteErrorToast && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            style={{
              position: "fixed",
              bottom: 112,
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 80,
              padding: "10px 18px",
              borderRadius: 12,
              background: "#FFFFFF",
              border: "1px solid rgba(239,68,68,0.3)",
              color: "#EF4444",
              fontSize: 12,
              whiteSpace: "nowrap",
              letterSpacing: "0.03em",
              boxShadow: "0 8px 24px rgba(0,0,0,0.10)",
            }}
          >
            削除に失敗しました。権限を確認してください。
          </motion.div>
        )}
      </AnimatePresence>

      {/* お気に入り操作エラートースト */}
      <AnimatePresence>
        {circFavError && (
          <motion.div
            key="circfav-error"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            onClick={clearCircFavError}
            style={{
              position: "fixed",
              bottom: 140,
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 80,
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "10px 16px",
              borderRadius: 12,
              background: "#FFFFFF",
              border: "1px solid rgba(239,68,68,0.3)",
              color: "#EF4444",
              fontSize: 12,
              whiteSpace: "nowrap",
              letterSpacing: "0.03em",
              boxShadow: "0 8px 24px rgba(0,0,0,0.10)",
              cursor: "pointer",
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            {circFavError.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fixed bottom CTA */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          padding: "16px 20px 32px",
          background: "linear-gradient(to top, rgba(250,250,250,1) 60%, transparent)",
        }}
      >
        {view === "month" && (
          <OpenButton
            label={
              monthPosts.length > 0
                ? `${selectedMonth}月を開く`
                : "この月は投稿がありません"
            }
            disabled={monthPosts.length === 0}
            onClick={onPickMonth}
          />
        )}
        {view === "day" && (
          <OpenButton
            label={
              dayPosts.length > 0
                ? `${selectedMonth}月${selectedDay}日を開く`
                : "この日は投稿がありません"
            }
            disabled={dayPosts.length === 0}
            onClick={onPickDay}
          />
        )}
        {view === "posts" && isMember && (
          <Link href={`/circle/${id}/post`} style={{ textDecoration: "none", display: "block" }}>
            <motion.div
              whileTap={{ scale: 0.97 }}
              className="w-full rounded-2xl py-4 flex items-center justify-center gap-2"
              style={{
                background: "#D4537E",
                cursor: "pointer",
                boxShadow: "0 4px 14px rgba(212,83,126,0.35)",
              }}
            >
              <span style={{ fontSize: 18 }}>📷</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: "#FFFFFF", letterSpacing: "0.04em" }}>
                投稿する
              </span>
            </motion.div>
          </Link>
        )}
      </div>
    </div>
  );
}

function PreviewStrip({
  label,
  previews,
  total,
}: {
  label: string;
  previews: Post[];
  total: number;
}) {
  return (
    <div className="w-full flex flex-col items-center">
      <div className="flex items-end justify-center gap-2" style={{ minHeight: 112 }}>
        <AnimatePresence mode="popLayout">
          {previews.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              className="rounded-2xl flex items-center justify-center"
              style={{
                width: 92,
                height: 92,
                border: "1.5px dashed #E5E5E5",
                background: "#FFFFFF",
              }}
            >
              <span style={{ fontSize: 18, color: "#E5E5E5" }}>○</span>
            </motion.div>
          ) : (
            previews.map((post, i) => (
              <motion.div
                key={post.id}
                layout
                initial={{ opacity: 0, y: 12, scale: 0.85 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.85 }}
                transition={{
                  duration: 0.35,
                  delay: i * 0.05,
                  ease: [0.25, 0.46, 0.45, 0.94],
                }}
                className="rounded-2xl overflow-hidden"
                style={{
                  width: 92,
                  height: 92,
                  border: "1px solid rgba(212,83,126,0.22)",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.10), 0 0 20px rgba(212,83,126,0.06)",
                }}
              >
                {post.media_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={post.media_url}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  />
                ) : (
                  <div
                    className="bg-gradient-to-br from-slate-100 to-slate-200"
                    style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}
                  >
                    <span style={{ fontSize: 22, opacity: 0.3 }}>🖼️</span>
                  </div>
                )}
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
      <p
        className="mt-2 text-xs"
        style={{ color: "#9CA3AF", letterSpacing: "0.05em" }}
      >
        {label}
        {total > 3 && (
          <span style={{ color: "#D4537E", marginLeft: 6 }}>
            +{total - 3}
          </span>
        )}
      </p>
    </div>
  );
}

function OpenButton({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <motion.button
      whileTap={disabled ? undefined : { scale: 0.97 }}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className="w-full rounded-2xl py-4"
      style={{
        background: disabled ? "rgba(0,0,0,0.04)" : "#D4537E",
        border: disabled ? "0.5px solid #E5E5E5" : "none",
        color: disabled ? "#9CA3AF" : "#FFFFFF",
        fontSize: 14,
        fontWeight: 600,
        letterSpacing: "0.05em",
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "all 0.25s ease",
        boxShadow: disabled ? "none" : "0 4px 14px rgba(212,83,126,0.35)",
      }}
    >
      {label}
    </motion.button>
  );
}

function PostCard({
  post,
  index,
  canFavorite,
  favorited,
  onToggleFavorite,
  canDelete,
  onDelete,
}: {
  post: Post;
  index: number;
  canFavorite: boolean;
  favorited: boolean;
  onToggleFavorite: () => void;
  canDelete: boolean;
  onDelete: () => void;
}) {
  const gradient = GRADIENTS[index % GRADIENTS.length];
  const [confirmDel, setConfirmDel] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.06 }}
      className="rounded-xl overflow-hidden"
      style={{
        position: "relative",
        background: "#FFFFFF",
        border: "0.5px solid #E5E5E5",
        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
      }}
    >
      {post.media_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={post.media_url}
          alt={post.caption ?? ""}
          loading="lazy"
          decoding="async"
          style={{ width: "100%", height: 140, objectFit: "cover", display: "block" }}
        />
      ) : (
        <div
          className={`bg-gradient-to-br ${gradient} flex items-center justify-center`}
          style={{ height: 140 }}
        >
          <span style={{ fontSize: 32, opacity: 0.3 }}>🖼️</span>
        </div>
      )}
      {canDelete && (
        <div style={{ position: "absolute", top: 6, left: 6 }}>
          {confirmDel ? (
            <div style={{ display: "flex", gap: 4 }}>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={(e) => { e.stopPropagation(); onDelete(); setConfirmDel(false); }}
                style={{
                  fontSize: 10,
                  padding: "4px 8px",
                  borderRadius: 8,
                  background: "#EF4444",
                  border: "none",
                  color: "#fff",
                  cursor: "pointer",
                  fontWeight: 700,
                  backdropFilter: "blur(6px)",
                }}
              >
                削除
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={(e) => { e.stopPropagation(); setConfirmDel(false); }}
                style={{
                  fontSize: 10,
                  padding: "4px 8px",
                  borderRadius: 8,
                  background: "rgba(255,255,255,0.85)",
                  border: "0.5px solid #E5E5E5",
                  color: "#6C757D",
                  cursor: "pointer",
                  backdropFilter: "blur(6px)",
                }}
              >
                戻る
              </motion.button>
            </div>
          ) : (
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={(e) => { e.stopPropagation(); setConfirmDel(true); }}
              aria-label="この投稿を削除"
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.85)",
                border: "0.5px solid #E5E5E5",
                backdropFilter: "blur(6px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                padding: 0,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ pointerEvents: "none" }}>
                <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
              </svg>
            </motion.button>
          )}
        </div>
      )}
      {canFavorite && (
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite();
          }}
          aria-label={favorited ? "お気に入りを解除" : "お気に入りに追加"}
          style={{
            position: "absolute",
            top: 6,
            right: 6,
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: favorited ? "rgba(212,83,126,0.12)" : "rgba(255,255,255,0.85)",
            border: favorited ? "1px solid rgba(212,83,126,0.4)" : "0.5px solid #E5E5E5",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            padding: 0,
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill={favorited ? "#D4537E" : "none"}
            stroke={favorited ? "#D4537E" : "#6C757D"}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </motion.button>
      )}
      {post.caption && (
        <div className="px-2.5 py-2">
          <p
            className="text-xs leading-relaxed"
            style={{
              color: "#6C757D",
              overflow: "hidden",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
            }}
          >
            {post.caption}
          </p>
        </div>
      )}
    </motion.div>
  );
}
