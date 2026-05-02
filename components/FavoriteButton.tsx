"use client";

import { motion, AnimatePresence } from "framer-motion";

interface FavoriteButtonProps {
  circleId: string;
  isFavorited: boolean;
  onToggle: (circleId: string) => void;
  /** 操作中（連打防止）なら true */
  isPending?: boolean;
  size?: number;
  /** ダーク背景向けスタイルにするか */
  dark?: boolean;
}

export default function FavoriteButton({
  circleId,
  isFavorited,
  onToggle,
  isPending = false,
  size = 36,
  dark = true,
}: FavoriteButtonProps) {
  return (
    <motion.button
      whileTap={isPending ? {} : { scale: 0.84 }}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!isPending) onToggle(circleId);
      }}
      aria-label={isFavorited ? "お気に入り解除" : "お気に入り登録"}
      aria-disabled={isPending}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        border: dark
          ? "1px solid rgba(255,255,255,0.12)"
          : "1px solid #E5E5E5",
        background: dark ? "rgba(255,255,255,0.06)" : "#FFFFFF",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: isPending ? "default" : "pointer",
        flexShrink: 0,
        opacity: isPending ? 0.6 : 1,
        boxShadow: isFavorited && !isPending
          ? "0 0 12px rgba(212,83,126,0.35)"
          : "none",
        transition: "box-shadow 0.3s ease, opacity 0.2s ease",
      }}
    >
      <AnimatePresence mode="wait" initial={false}>
        {isPending ? (
          // 操作中はスピナー表示
          <motion.div
            key="spinner"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              width: size * 0.44,
              height: size * 0.44,
              borderRadius: "50%",
              border: `2px solid ${dark ? "rgba(255,255,255,0.2)" : "#E5E5E5"}`,
              borderTopColor: "#D4537E",
              animation: "fav-spin 0.7s linear infinite",
            }}
          />
        ) : (
          <motion.svg
            key={isFavorited ? "filled" : "empty"}
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.6, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.34, 1.56, 0.64, 1] }}
            width={size * 0.48}
            height={size * 0.48}
            viewBox="0 0 24 24"
            fill={isFavorited ? "#D4537E" : "none"}
            stroke={
              isFavorited
                ? "#D4537E"
                : dark
                ? "rgba(255,255,255,0.4)"
                : "#9CA3AF"
            }
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ pointerEvents: "none" }}
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </motion.svg>
        )}
      </AnimatePresence>
      {/* スピナー用キーフレーム（グローバルに一度だけ定義） */}
      <style>{`@keyframes fav-spin { to { transform: rotate(360deg); } }`}</style>
    </motion.button>
  );
}
