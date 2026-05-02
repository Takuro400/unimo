"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "@/lib/useAuth";
import { useFavorites } from "@/lib/useFavorites";
import { supabase } from "@/lib/supabase";
import { MOCK_CIRCLES } from "@/lib/mock-data";
import type { Circle } from "@/lib/types";
import FavoriteCard, { DeletedFavoriteCard } from "@/components/FavoriteCard";
import CompareView from "@/components/CompareView";
import BottomNav from "@/components/BottomNav";

// ----------------------------------------------------------------
// ページ本体
// ----------------------------------------------------------------
export default function FavoritesPage() {
  const user = useAuth();
  const router = useRouter();
  const {
    favoriteIds,
    loading: favLoading,
    isFavorited,
    isPending,
    toggle,
    remove,
    errorToast,
    clearErrorToast,
  } = useFavorites();

  // サークル情報の取得結果
  const [circles, setCircles] = useState<Circle[]>([]);
  // favoriteIds にあるが DB に存在しない → 削除済み
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [circlesLoading, setCirclesLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // 比較モード
  const [compareMode, setCompareMode] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);
  const [showCompare, setShowCompare] = useState(false);

  // 前回の favoriteIds（差分検知用）
  const prevIdsRef = useRef<string>("");

  // ----------------------------------------------------------------
  // favoriteIds が変わったときにサークル情報を取得
  // ----------------------------------------------------------------
  useEffect(() => {
    if (favLoading) return;

    // 変化がなければ再フェッチしない（複数タブ同期の連続更新を抑制）
    const key = JSON.stringify(favoriteIds);
    if (key === prevIdsRef.current) return;
    prevIdsRef.current = key;

    if (favoriteIds.length === 0) {
      setCircles([]);
      setDeletedIds([]);
      setCirclesLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      setCirclesLoading(true);
      setFetchError(null);

      try {
        if (supabase) {
          // 100件超でも .in() は問題なく動作する（Supabase の制限は 1000件）
          const { data, error } = await supabase
            .from("circles")
            .select("*")
            .in("id", favoriteIds);

          if (error) throw error;
          if (cancelled) return;

          const dbMap = new Map((data ?? []).map((c: Circle) => [c.id, c]));

          // 登録順を保ちながら、DB になければモックデータで補完
          const ordered: Circle[] = [];
          const missing: string[] = [];

          for (const id of favoriteIds) {
            const fromDb = dbMap.get(id);
            if (fromDb) {
              ordered.push(fromDb);
            } else {
              const fromMock = MOCK_CIRCLES.find((m) => m.id === id);
              if (fromMock) {
                ordered.push(fromMock);
              } else {
                // DB にもモックにもない → 削除されたサークル
                missing.push(id);
              }
            }
          }

          setCircles(ordered);
          setDeletedIds(missing);
        } else {
          // Supabase 未設定時はモックデータのみ
          const mocks = favoriteIds
            .map((id) => MOCK_CIRCLES.find((c) => c.id === id))
            .filter(Boolean) as Circle[];
          setCircles(mocks);
          setDeletedIds([]);
        }
      } catch (err) {
        if (!cancelled) {
          console.error("[FavoritesPage] fetch error:", err);
          setFetchError("サークル情報の取得に失敗しました。");
        }
      } finally {
        if (!cancelled) setCirclesLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [favoriteIds, favLoading]);

  // ----------------------------------------------------------------
  // 比較モード操作
  // ----------------------------------------------------------------
  function handleCompareToggle(circleId: string) {
    setSelectedForCompare((prev) => {
      if (prev.includes(circleId)) return prev.filter((id) => id !== circleId);
      if (prev.length >= 3) return prev; // 最大3件
      return [...prev, circleId];
    });
  }

  function handleCompareMode() {
    if (compareMode) {
      setCompareMode(false);
      setSelectedForCompare([]);
    } else {
      setCompareMode(true);
      setSelectedForCompare([]);
    }
  }

  // 削除済みIDを一括クリア（お気に入り一覧から除去）
  async function clearAllDeleted() {
    for (const id of deletedIds) {
      await remove(id);
    }
  }

  const compareCircles = circles.filter((c) =>
    selectedForCompare.includes(c.id)
  );
  const totalCount = circles.length + deletedIds.length;

  // ----------------------------------------------------------------
  // ローディング画面
  // ----------------------------------------------------------------
  if (user === undefined || favLoading) {
    return (
      <div
        style={{
          minHeight: "100svh",
          background: "#FAFAFA",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Spinner />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ----------------------------------------------------------------
  // 描画
  // ----------------------------------------------------------------
  return (
    <div style={{ minHeight: "100svh", background: "#FAFAFA" }}>
      {/* ──────────────── ヘッダー ──────────────── */}
      <div
        style={{
          position: "sticky",
          top: 0,
          background: "#FFFFFF",
          borderBottom: "0.5px solid #E5E5E5",
          padding: "52px 20px 14px",
          zIndex: 40,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <h1
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: "#1F2937",
                letterSpacing: "-0.01em",
              }}
            >
              お気に入り
            </h1>
            <p style={{ fontSize: 12, color: "#9CA3AF", marginTop: 1 }}>
              {totalCount > 0
                ? `${circles.length}団体を保存中${deletedIds.length > 0 ? ` (削除済み ${deletedIds.length}件)` : ""}`
                : "気になるサークル・部活を保存しよう"}
            </p>
          </div>

          {/* 比較ボタン（2件以上あるとき） */}
          {circles.length >= 2 && (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleCompareMode}
              style={{
                padding: "7px 14px",
                borderRadius: 10,
                border: compareMode
                  ? "1.5px solid #D4537E"
                  : "0.5px solid #E5E5E5",
                background: compareMode ? "#FFF0F6" : "#FFFFFF",
                color: compareMode ? "#D4537E" : "#6C757D",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
              >
                <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
              </svg>
              {compareMode ? "完了" : "比較する"}
            </motion.button>
          )}
        </div>

        {/* 比較モードのインジケーター */}
        <AnimatePresence>
          {compareMode && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              style={{ overflow: "hidden" }}
            >
              <div
                style={{
                  marginTop: 10,
                  padding: "10px 14px",
                  background: "#FFF0F6",
                  borderRadius: 10,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                }}
              >
                <p style={{ fontSize: 12, color: "#D4537E", flex: 1 }}>
                  {selectedForCompare.length === 0
                    ? "比較したい団体を2〜3つ選んでください"
                    : `${selectedForCompare.length}団体を選択中（最大3つ）`}
                </p>
                {selectedForCompare.length >= 2 && (
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowCompare(true)}
                    style={{
                      padding: "6px 12px",
                      borderRadius: 8,
                      border: "none",
                      background: "#D4537E",
                      color: "#fff",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                      flexShrink: 0,
                    }}
                  >
                    比較開始
                  </motion.button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ──────────────── コンテンツ ──────────────── */}
      <div style={{ padding: "16px 16px 100px" }}>
        {circlesLoading ? (
          // サークル情報取得中
          <div style={{ display: "flex", justifyContent: "center", paddingTop: 60 }}>
            <Spinner size={24} />
          </div>
        ) : fetchError ? (
          // 取得エラー
          <FetchErrorState
            message={fetchError}
            onRetry={() => {
              prevIdsRef.current = ""; // 強制再フェッチ
              setFetchError(null);
            }}
          />
        ) : totalCount === 0 ? (
          // 空状態
          <EmptyState />
        ) : (
          <>
            {/* 削除済みが複数あるとき一括クリアボタン */}
            {deletedIds.length >= 2 && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                whileTap={{ scale: 0.96 }}
                onClick={clearAllDeleted}
                style={{
                  display: "block",
                  width: "100%",
                  marginBottom: 12,
                  padding: "9px 16px",
                  borderRadius: 10,
                  border: "0.5px solid #FECDD3",
                  background: "#FFF0F6",
                  color: "#D4537E",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  textAlign: "center",
                }}
              >
                削除済み {deletedIds.length} 件をまとめてクリア
              </motion.button>
            )}

            {/* カードグリッド */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: 12,
              }}
            >
              <AnimatePresence>
                {/* 通常のサークルカード */}
                {circles.map((circle, i) => (
                  <FavoriteCard
                    key={circle.id}
                    circle={circle}
                    index={i}
                    isFavorited={isFavorited(circle.id)}
                    isPending={isPending(circle.id)}
                    onToggle={remove}
                    onNavigate={(id) => router.push(`/circle/${id}`)}
                    compareMode={compareMode}
                    compareSelected={selectedForCompare.includes(circle.id)}
                    onCompareToggle={handleCompareToggle}
                  />
                ))}
                {/* 削除済みサークルのプレースホルダー */}
                {deletedIds.map((id, i) => (
                  <DeletedFavoriteCard
                    key={id}
                    circleId={id}
                    index={circles.length + i}
                    onClear={remove}
                  />
                ))}
              </AnimatePresence>
            </div>
          </>
        )}
      </div>

      {/* ──────────────── 比較ビュー ──────────────── */}
      <AnimatePresence>
        {showCompare && compareCircles.length >= 2 && (
          <CompareView
            circles={compareCircles}
            onClose={() => setShowCompare(false)}
            onNavigate={(id) => {
              setShowCompare(false);
              router.push(`/circle/${id}`);
            }}
          />
        )}
      </AnimatePresence>

      {/* ──────────────── エラートースト ──────────────── */}
      <AnimatePresence>
        {errorToast && (
          <motion.div
            key="error-toast"
            initial={{ opacity: 0, y: 16, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 16, x: "-50%" }}
            transition={{ duration: 0.25 }}
            onClick={clearErrorToast}
            style={{
              position: "fixed",
              bottom: 96,
              left: "50%",
              zIndex: 300,
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "11px 16px",
              borderRadius: 14,
              background: "#1F2937",
              color: "#F9FAFB",
              fontSize: 13,
              fontWeight: 500,
              boxShadow: "0 8px 24px rgba(0,0,0,0.20)",
              cursor: "pointer",
              maxWidth: "calc(100vw - 48px)",
              whiteSpace: "nowrap",
            }}
          >
            {/* 警告アイコン */}
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#F87171"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ flexShrink: 0 }}
            >
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            {errorToast.message}
          </motion.div>
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
}

// ----------------------------------------------------------------
// 空状態
// ----------------------------------------------------------------
function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "64px 32px",
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: "50%",
          background: "#FFF0F6",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 16,
        }}
      >
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#D4537E"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      </div>
      <p
        style={{
          fontSize: 16,
          fontWeight: 600,
          color: "#1F2937",
          marginBottom: 8,
        }}
      >
        お気に入りがまだありません
      </p>
      <p
        style={{
          fontSize: 13,
          color: "#9CA3AF",
          lineHeight: 1.7,
          maxWidth: 260,
        }}
      >
        気になるサークル・部活のページで ♡ をタップするとここに保存されます
      </p>
    </motion.div>
  );
}

// ----------------------------------------------------------------
// フェッチエラー状態
// ----------------------------------------------------------------
function FetchErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "64px 32px",
        textAlign: "center",
        gap: 12,
      }}
    >
      <span style={{ fontSize: 36 }}>⚠️</span>
      <p style={{ fontSize: 14, color: "#6C757D" }}>{message}</p>
      <button
        onClick={onRetry}
        style={{
          padding: "8px 20px",
          borderRadius: 10,
          border: "0.5px solid #E5E5E5",
          background: "#fff",
          color: "#1F2937",
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        再試行
      </button>
    </motion.div>
  );
}

// ----------------------------------------------------------------
// ローディングスピナー
// ----------------------------------------------------------------
function Spinner({ size = 28 }: { size?: number }) {
  return (
    <>
      <div
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          border: `${size * 0.09}px solid #E5E5E5`,
          borderTopColor: "#D4537E",
          animation: "spin 0.8s linear infinite",
        }}
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}
