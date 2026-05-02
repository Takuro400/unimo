"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MOCK_CIRCLES, MOCK_POSTS } from "@/lib/mock-data";
import { useFavorites } from "@/lib/useFavorites";
import FavoriteButton from "@/components/FavoriteButton";

const CARD_GRADIENTS = [
  "from-slate-200 to-slate-300",
  "from-zinc-200 to-zinc-300",
  "from-neutral-200 to-neutral-300",
  "from-stone-200 to-stone-300",
  "from-gray-200 to-gray-300",
  "from-slate-100 to-slate-200",
  "from-zinc-100 to-zinc-200",
  "from-neutral-100 to-neutral-200",
];

export default function CirclesPage() {
  const router = useRouter();
  const { isFavorited, toggle } = useFavorites();

  return (
    <div className="flex flex-col min-h-screen" style={{ background: "#FAFAFA" }}>
      {/* Header */}
      <div
        className="sticky top-0 z-50 px-5 pt-12 pb-3"
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
            <h1 className="text-base font-semibold tracking-wide" style={{ color: "#1F2937" }}>
              サークル・部活一覧
            </h1>
            <p className="text-xs" style={{ color: "#9CA3AF" }}>
              {MOCK_CIRCLES.length}団体
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 px-3 pb-10 pt-3">
        <div className="flex gap-3">
          {/* Left column */}
          <div className="flex-1">
            {MOCK_CIRCLES.filter((_, i) => i % 2 === 0).map((circle, i) => {
              const posts = MOCK_POSTS[circle.id] ?? [];
              const gradient = CARD_GRADIENTS[(i * 2) % CARD_GRADIENTS.length];
              return (
                <motion.div
                  key={circle.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.06 }}
                  whileTap={{ scale: 0.97 }}
                  className="mb-3"
                >
                  <Link href={`/circle/${circle.id}`} style={{ textDecoration: "none" }}>
                    <div
                      className="rounded-2xl overflow-hidden"
                      style={{
                        background: "#FFFFFF",
                        border: "0.5px solid #E5E5E5",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                      }}
                    >
                      <div
                        className={`w-full bg-gradient-to-br ${gradient} flex items-center justify-center relative`}
                        style={{ height: 110 }}
                      >
                        <span style={{ fontSize: 40, opacity: 0.35 }}>{circle.emoji}</span>
                        {circle.category && (
                          <div
                            className="absolute top-2 left-2.5 rounded-full px-2 py-0.5"
                            style={{
                              background: "rgba(255,255,255,0.85)",
                              border: "0.5px solid rgba(0,0,0,0.08)",
                              backdropFilter: "blur(8px)",
                            }}
                          >
                            <span style={{ fontSize: 10, color: "#6C757D" }}>{circle.category}</span>
                          </div>
                        )}
                        <div className="absolute top-1.5 right-1.5">
                          <FavoriteButton
                            circleId={circle.id}
                            isFavorited={isFavorited(circle.id)}
                            onToggle={toggle}
                            size={28}
                          />
                        </div>
                      </div>
                      <div className="px-3 py-2.5">
                        <p className="text-sm font-semibold truncate" style={{ color: "#1F2937" }}>
                          {circle.name}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: "#9CA3AF" }}>
                          {posts.length}件の投稿
                        </p>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>

          {/* Right column (offset) */}
          <div className="flex-1 pt-6">
            {MOCK_CIRCLES.filter((_, i) => i % 2 === 1).map((circle, i) => {
              const posts = MOCK_POSTS[circle.id] ?? [];
              const gradient = CARD_GRADIENTS[(i * 2 + 1) % CARD_GRADIENTS.length];
              return (
                <motion.div
                  key={circle.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.06 + 0.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="mb-3"
                >
                  <Link href={`/circle/${circle.id}`} style={{ textDecoration: "none" }}>
                    <div
                      className="rounded-2xl overflow-hidden"
                      style={{
                        background: "#FFFFFF",
                        border: "0.5px solid #E5E5E5",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                      }}
                    >
                      <div
                        className={`w-full bg-gradient-to-br ${gradient} flex items-center justify-center relative`}
                        style={{ height: 110 }}
                      >
                        <span style={{ fontSize: 40, opacity: 0.35 }}>{circle.emoji}</span>
                        {circle.category && (
                          <div
                            className="absolute top-2 left-2.5 rounded-full px-2 py-0.5"
                            style={{
                              background: "rgba(255,255,255,0.85)",
                              border: "0.5px solid rgba(0,0,0,0.08)",
                              backdropFilter: "blur(8px)",
                            }}
                          >
                            <span style={{ fontSize: 10, color: "#6C757D" }}>{circle.category}</span>
                          </div>
                        )}
                        <div className="absolute top-1.5 right-1.5">
                          <FavoriteButton
                            circleId={circle.id}
                            isFavorited={isFavorited(circle.id)}
                            onToggle={toggle}
                            size={28}
                          />
                        </div>
                      </div>
                      <div className="px-3 py-2.5">
                        <p className="text-sm font-semibold truncate" style={{ color: "#1F2937" }}>
                          {circle.name}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: "#9CA3AF" }}>
                          {posts.length}件の投稿
                        </p>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
