"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MOCK_CIRCLES, MOCK_POSTS, CATEGORY_COLORS } from "@/lib/mock-data";
import { useFavorites } from "@/lib/useFavorites";
import FavoriteButton from "@/components/FavoriteButton";

const GRADIENTS = [
  "from-slate-700 to-slate-900",
  "from-zinc-700 to-zinc-900",
  "from-neutral-700 to-neutral-900",
  "from-stone-700 to-stone-900",
  "from-gray-700 to-gray-900",
  "from-slate-600 to-slate-800",
  "from-zinc-600 to-zinc-800",
  "from-neutral-600 to-neutral-800",
];

export default function CirclesPage() {
  const router = useRouter();
  const { isFavorited, toggle } = useFavorites();

  return (
    <div className="flex flex-col min-h-screen" style={{ background: "#0D0D0F" }}>
      {/* Header */}
      <div
        className="sticky top-0 z-50 px-5 pt-12 pb-3"
        style={{ background: "linear-gradient(to bottom, #0D0D0F 80%, transparent)" }}
      >
        <div className="flex items-center gap-3">
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
            <h1 className="text-base font-semibold silver-text tracking-wide">サークル・部活一覧</h1>
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.28)" }}>{MOCK_CIRCLES.length}団体</p>
          </div>
        </div>
      </div>

      <div className="flex-1 px-3 pb-10 pt-2">
        <div className="flex gap-3">
          <div className="flex-1">
            {MOCK_CIRCLES.filter((_, i) => i % 2 === 0).map((circle, i) => {
              const posts = MOCK_POSTS[circle.id] ?? [];
              const gradient = GRADIENTS[(i * 2) % GRADIENTS.length];
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
                    <div className="glass rounded-2xl overflow-hidden" style={{ background: CATEGORY_COLORS[circle.category ?? ""] }}>
                      <div className={`w-full bg-gradient-to-br ${gradient} flex items-center justify-center relative`} style={{ height: 110 }}>
                        <span style={{ fontSize: 40, opacity: 0.4 }}>{circle.emoji}</span>
                        {circle.category && (
                          <div className="absolute top-2 left-2.5 glass rounded-full px-2 py-0.5" style={{ border: "1px solid rgba(255,255,255,0.10)" }}>
                            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.45)" }}>{circle.category}</span>
                          </div>
                        )}
                        <div className="absolute top-1.5 right-1.5">
                          <FavoriteButton
                            circleId={circle.id}
                            isFavorited={isFavorited(circle.id)}
                            onToggle={toggle}
                            size={28}
                            dark
                          />
                        </div>
                      </div>
                      <div className="px-3 py-2.5">
                        <p className="text-sm font-semibold truncate" style={{ color: "var(--silver-bright)" }}>{circle.name}</p>
                        <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.28)" }}>{posts.length}件の投稿</p>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
          <div className="flex-1 pt-6">
            {MOCK_CIRCLES.filter((_, i) => i % 2 === 1).map((circle, i) => {
              const posts = MOCK_POSTS[circle.id] ?? [];
              const gradient = GRADIENTS[(i * 2 + 1) % GRADIENTS.length];
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
                    <div className="glass rounded-2xl overflow-hidden" style={{ background: CATEGORY_COLORS[circle.category ?? ""] }}>
                      <div className={`w-full bg-gradient-to-br ${gradient} flex items-center justify-center relative`} style={{ height: 110 }}>
                        <span style={{ fontSize: 40, opacity: 0.4 }}>{circle.emoji}</span>
                        {circle.category && (
                          <div className="absolute top-2 left-2.5 glass rounded-full px-2 py-0.5" style={{ border: "1px solid rgba(255,255,255,0.10)" }}>
                            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.45)" }}>{circle.category}</span>
                          </div>
                        )}
                        <div className="absolute top-1.5 right-1.5">
                          <FavoriteButton
                            circleId={circle.id}
                            isFavorited={isFavorited(circle.id)}
                            onToggle={toggle}
                            size={28}
                            dark
                          />
                        </div>
                      </div>
                      <div className="px-3 py-2.5">
                        <p className="text-sm font-semibold truncate" style={{ color: "var(--silver-bright)" }}>{circle.name}</p>
                        <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.28)" }}>{posts.length}件の投稿</p>
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
