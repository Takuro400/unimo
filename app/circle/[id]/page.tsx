"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/useAuth";
import { supabase } from "@/lib/supabase";
import { MOCK_CIRCLES, MOCK_POSTS } from "@/lib/mock-data";
import type { Circle, Post } from "@/lib/types";

const MONTHS = ["1月","2月","3月","4月","5月","6月","7月","8月","9月","10月","11月","12月"];
const GRADIENTS = [
  "from-slate-700 to-slate-900",
  "from-zinc-700 to-zinc-900",
  "from-neutral-700 to-neutral-900",
  "from-stone-700 to-stone-900",
];

export default function CircleDetailPage() {
  const user = useAuth();
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [circle, setCircle] = useState<Circle | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

  useEffect(() => {
    if (!user) return;
    (async () => {
      // Fetch circle
      if (supabase) {
        const { data: circleData } = await supabase
          .from("circles")
          .select("*")
          .eq("id", id)
          .single();
        const { data: postsData } = await supabase
          .from("posts")
          .select("*")
          .eq("circle_id", id)
          .order("created_at", { ascending: false });
        setCircle(circleData ?? MOCK_CIRCLES.find((c) => c.id === id) ?? null);
        setPosts(postsData ?? MOCK_POSTS[id] ?? []);
      } else {
        setCircle(MOCK_CIRCLES.find((c) => c.id === id) ?? null);
        setPosts(MOCK_POSTS[id] ?? []);
      }
      setLoading(false);
    })();
  }, [user, id]);

  if (user === undefined || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: "#0D0D0F" }}>
        <div style={{ width: 28, height: 28, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.1)", borderTopColor: "rgba(255,255,255,0.5)", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!circle) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: "#0D0D0F" }}>
        <p style={{ color: "rgba(255,255,255,0.3)" }}>サークルが見つかりません</p>
      </div>
    );
  }

  const monthPosts = posts.filter((p) => p.month === selectedMonth);
  const monthsWithPosts = new Set(posts.map((p) => p.month));

  return (
    <div className="flex flex-col min-h-screen" style={{ background: "#0D0D0F" }}>
      {/* Header */}
      <div
        className="sticky top-0 z-50 px-4 pt-12 pb-3"
        style={{ background: "linear-gradient(to bottom, #0D0D0F 80%, transparent)" }}
      >
        <div className="flex items-center gap-3">
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
          <h1 className="text-base font-semibold truncate silver-text">{circle.name}</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-10">
        {/* Circle info */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="px-4 pb-5 flex items-start gap-3"
        >
          <div
            className="glass rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ width: 56, height: 56, background: "rgba(255,255,255,0.04)" }}
          >
            <span style={{ fontSize: 28 }}>{circle.emoji}</span>
          </div>
          <div className="flex-1 min-w-0 pt-1">
            {circle.category && (
              <span
                className="inline-block rounded-full px-2 py-0.5 mb-1.5"
                style={{ fontSize: 10, background: "rgba(167,139,250,0.10)", color: "rgba(167,139,250,0.8)", border: "1px solid rgba(167,139,250,0.2)" }}
              >
                {circle.category}
              </span>
            )}
            {circle.description && (
              <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.4)" }}>
                {circle.description}
              </p>
            )}
            <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.2)" }}>
              {posts.length}件の投稿
            </p>
          </div>
        </motion.div>

        {/* Divider */}
        <div style={{ height: 1, background: "rgba(255,255,255,0.05)", margin: "0 16px 0" }} />

        {/* Month tabs */}
        <div
          className="flex gap-1.5 px-3 py-3 overflow-x-auto"
          style={{ scrollbarWidth: "none" }}
        >
          {MONTHS.map((m, i) => {
            const monthNum = i + 1;
            const active = selectedMonth === monthNum;
            const hasContent = monthsWithPosts.has(monthNum);
            return (
              <motion.button
                key={monthNum}
                whileTap={{ scale: 0.93 }}
                onClick={() => setSelectedMonth(monthNum)}
                className="flex-shrink-0 rounded-xl px-3 py-1.5 relative"
                style={{
                  background: active ? "rgba(167,139,250,0.15)" : "rgba(255,255,255,0.04)",
                  border: active ? "1px solid rgba(167,139,250,0.4)" : "1px solid rgba(255,255,255,0.07)",
                  color: active ? "#A78BFA" : "rgba(255,255,255,0.35)",
                  fontSize: 12,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  minWidth: 40,
                }}
              >
                {m}
                {hasContent && !active && (
                  <span
                    style={{
                      position: "absolute",
                      top: 3,
                      right: 3,
                      width: 4,
                      height: 4,
                      borderRadius: "50%",
                      background: "rgba(167,139,250,0.5)",
                    }}
                  />
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Posts grid */}
        <div className="px-3 pt-2">
          <AnimatePresence mode="wait">
            {monthPosts.length === 0 ? (
              <motion.div
                key={`empty-${selectedMonth}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="flex flex-col items-center py-12"
              >
                <div
                  className="glass rounded-2xl px-8 py-6 flex flex-col items-center"
                  style={{ border: "1px solid rgba(255,255,255,0.06)" }}
                >
                  <span style={{ fontSize: 28, opacity: 0.2 }}>○</span>
                  <p className="text-xs mt-2" style={{ color: "rgba(255,255,255,0.2)" }}>
                    この月の投稿はありません
                  </p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key={`posts-${selectedMonth}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="grid grid-cols-2 gap-2"
              >
                {monthPosts.map((post, i) => (
                  <PostCard key={post.id} post={post} index={i} />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function PostCard({ post, index }: { post: Post; index: number }) {
  const gradient = GRADIENTS[index % GRADIENTS.length];
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.06 }}
      className="glass rounded-xl overflow-hidden"
    >
      {post.media_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={post.media_url}
          alt={post.caption ?? ""}
          style={{ width: "100%", height: 140, objectFit: "cover", display: "block" }}
        />
      ) : (
        <div
          className={`bg-gradient-to-br ${gradient} flex items-center justify-center`}
          style={{ height: 140 }}
        >
          <span style={{ fontSize: 32, opacity: 0.25 }}>🖼️</span>
        </div>
      )}
      {post.caption && (
        <div className="px-2.5 py-2">
          <p
            className="text-xs leading-relaxed"
            style={{
              color: "rgba(255,255,255,0.5)",
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
