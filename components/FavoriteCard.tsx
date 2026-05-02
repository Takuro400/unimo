"use client";

import { motion } from "framer-motion";
import type { Circle } from "@/lib/types";
import FavoriteButton from "@/components/FavoriteButton";

// ----------------------------------------------------------------
// カテゴリ別バッジカラー
// ----------------------------------------------------------------
const CATEGORY_BADGE: Record<string, { bg: string; color: string }> = {
  体育系:   { bg: "#FFF0F3", color: "#D4537E" },
  体育会系: { bg: "#FFF0F3", color: "#D4537E" },
  文化系:   { bg: "#F3F0FF", color: "#7C5CBF" },
  技術系:   { bg: "#F0F7FF", color: "#2E7EB5" },
  学術系:   { bg: "#F0F7FF", color: "#2E7EB5" },
};

function badge(category: string | null) {
  if (!category) return { bg: "#F1EFE8", color: "#6C757D" };
  return CATEGORY_BADGE[category] ?? { bg: "#F1EFE8", color: "#6C757D" };
}

// ----------------------------------------------------------------
// 通常カードの Props
// ----------------------------------------------------------------
interface FavoriteCardProps {
  circle: Circle;
  index: number;
  isFavorited: boolean;
  isPending?: boolean;
  onToggle: (circleId: string) => void;
  onNavigate: (circleId: string) => void;
  compareSelected?: boolean;
  onCompareToggle?: (circleId: string) => void;
  compareMode?: boolean;
}

// ----------------------------------------------------------------
// 削除済みカードの Props
// ----------------------------------------------------------------
interface DeletedCardProps {
  circleId: string;
  index: number;
  onClear: (circleId: string) => void;
}

// ----------------------------------------------------------------
// 削除済みサークルのプレースホルダーカード
// ----------------------------------------------------------------
export function DeletedFavoriteCard({ circleId, index, onClear }: DeletedCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3, delay: index * 0.04 }}
      style={{
        background: "#FAFAFA",
        borderRadius: 16,
        border: "0.5px dashed #D1D5DB",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* アイコンエリア */}
      <div
        style={{
          height: 72,
          background: "#F3F4F6",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span style={{ fontSize: 24, opacity: 0.3 }}>🗑️</span>
      </div>

      {/* テキストエリア */}
      <div style={{ padding: "10px 12px 12px" }}>
        <p style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 8, lineHeight: 1.5 }}>
          このサークルは削除されました
        </p>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClear(circleId);
          }}
          style={{
            fontSize: 11,
            color: "#D4537E",
            background: "#FFF0F6",
            border: "none",
            borderRadius: 8,
            padding: "4px 10px",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          一覧から削除
        </button>
      </div>
    </motion.div>
  );
}

// ----------------------------------------------------------------
// メタ情報の1行
// ----------------------------------------------------------------
function MetaRow({ icon, text }: { icon: string; text: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
      <span style={{ fontSize: 11 }}>{icon}</span>
      <span style={{ fontSize: 11, color: "#6C757D" }}>{text}</span>
    </div>
  );
}

// ----------------------------------------------------------------
// 通常のお気に入りカード
// ----------------------------------------------------------------
export default function FavoriteCard({
  circle,
  index,
  isFavorited,
  isPending = false,
  onToggle,
  onNavigate,
  compareSelected = false,
  onCompareToggle,
  compareMode = false,
}: FavoriteCardProps) {
  const { bg: tagBg, color: tagColor } = badge(circle.category);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.35, delay: index * 0.05 }}
      onClick={() => !compareMode && onNavigate(circle.id)}
      style={{
        background: "#FFFFFF",
        borderRadius: 16,
        border: compareSelected
          ? "1.5px solid #D4537E"
          : "0.5px solid #E5E5E5",
        boxShadow: compareSelected
          ? "0 0 0 3px rgba(212,83,126,0.12)"
          : "0 2px 8px rgba(0,0,0,0.06)",
        overflow: "hidden",
        cursor: compareMode ? "default" : "pointer",
        transition: "border-color 0.2s ease, box-shadow 0.2s ease",
        position: "relative",
        // 100件超でも軽量に動作するよう、スクロール外は描画をスキップ
        contentVisibility: "auto",
        containIntrinsicSize: "0 180px",
      } as React.CSSProperties}
    >
      {/* 比較モードのチェックボックス */}
      {compareMode && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          style={{ position: "absolute", top: 10, left: 10, zIndex: 10 }}
          onClick={(e) => {
            e.stopPropagation();
            onCompareToggle?.(circle.id);
          }}
        >
          <div
            style={{
              width: 22,
              height: 22,
              borderRadius: 6,
              border: compareSelected ? "none" : "1.5px solid #D1D5DB",
              background: compareSelected ? "#D4537E" : "#FFFFFF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
              cursor: "pointer",
            }}
          >
            {compareSelected && (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path
                  d="M2 6l3 3 5-5"
                  stroke="#fff"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </div>
        </motion.div>
      )}

      {/* アイコン・ヘッダー */}
      <div
        style={{
          height: 72,
          background: "linear-gradient(135deg, #F8F4FF 0%, #FFF0F6 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
        }}
      >
        {circle.icon_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={circle.icon_url}
            alt=""
            loading="lazy"
            decoding="async"
            style={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              objectFit: "cover",
              border: "2px solid #fff",
              boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
            }}
          />
        ) : (
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              background: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 26,
              border: "2px solid #fff",
              boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
            }}
          >
            {circle.emoji}
          </div>
        )}

        {/* お気に入りボタン（解除） */}
        <div style={{ position: "absolute", top: 8, right: 8 }}>
          <FavoriteButton
            circleId={circle.id}
            isFavorited={isFavorited}
            isPending={isPending}
            onToggle={onToggle}
            size={30}
            dark={false}
          />
        </div>
      </div>

      {/* 情報エリア */}
      <div style={{ padding: "10px 12px 12px" }}>
        <p
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: "#1F2937",
            marginBottom: 4,
            lineHeight: 1.3,
            // 長い名前は2行で打ち切り
            overflow: "hidden",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
          }}
        >
          {circle.name}
        </p>

        {circle.category && (
          <span
            style={{
              display: "inline-block",
              fontSize: 11,
              fontWeight: 500,
              color: tagColor,
              background: tagBg,
              borderRadius: 6,
              padding: "2px 8px",
              marginBottom: 8,
            }}
          >
            {circle.category}
          </span>
        )}

        {/* メタ情報（あるものだけ表示） */}
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {circle.activity_days && (
            <MetaRow icon="📅" text={circle.activity_days} />
          )}
          {circle.member_count != null && (
            <MetaRow icon="👥" text={`${circle.member_count}人`} />
          )}
          {circle.fee && <MetaRow icon="💰" text={circle.fee} />}
          {/* メタ情報が何もなければ説明文を表示 */}
          {!circle.activity_days &&
            circle.member_count == null &&
            !circle.fee &&
            circle.description && (
              <p
                style={{
                  fontSize: 11,
                  color: "#6C757D",
                  lineHeight: 1.5,
                  overflow: "hidden",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                }}
              >
                {circle.description}
              </p>
            )}
        </div>
      </div>
    </motion.div>
  );
}
