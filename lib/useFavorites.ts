"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

// ----------------------------------------------------------------
// localStorage キー
// ----------------------------------------------------------------
const LS_KEY = "unimo:circle_favorites";

// ----------------------------------------------------------------
// localStorage ユーティリティ
// ----------------------------------------------------------------
function loadLocal(): string[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}

function saveLocal(ids: string[]): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(ids));
  } catch {
    // localStorage が使えない環境では無視
  }
}

// ----------------------------------------------------------------
// 型
// ----------------------------------------------------------------
export type FavoritesError = {
  message: string;
  /** "add" | "remove" | "sync" */
  kind: string;
};

// ----------------------------------------------------------------
// フック本体
// ----------------------------------------------------------------
export function useFavorites() {
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  // エラートースト用
  const [errorToast, setErrorToast] = useState<FavoritesError | null>(null);
  // タイマー参照（自動クリア用）
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 非同期関数内から最新の favoriteIds を読む用（stale closure 対策）
  const favoriteIdsRef = useRef<string[]>([]);
  // ログイン中ユーザー
  const userRef = useRef<User | null>(null);
  // ログイン時の localStorage→DB 同期を一度だけ行うフラグ
  const syncedRef = useRef(false);
  // 操作中の circleId セット（連打防止）
  const pendingRef = useRef<Set<string>>(new Set());

  // ----------------------------------------------------------------
  // エラートーストを表示して 3 秒後に自動消去
  // ----------------------------------------------------------------
  function showError(message: string, kind: string) {
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    setErrorToast({ message, kind });
    errorTimerRef.current = setTimeout(() => {
      setErrorToast(null);
    }, 3000);
  }

  function clearErrorToast() {
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    setErrorToast(null);
  }

  // ----------------------------------------------------------------
  // favoriteIds の state と ref を同時に更新するヘルパー
  // ----------------------------------------------------------------
  function applyIds(ids: string[]) {
    favoriteIdsRef.current = ids;
    setFavoriteIds(ids);
  }

  // ----------------------------------------------------------------
  // Supabase からユーザーのお気に入りを取得
  // ----------------------------------------------------------------
  async function fetchDb(userId: string): Promise<string[]> {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from("favorites")
      .select("circle_id")
      .eq("user_id", userId);
    if (error) {
      console.warn("[useFavorites] fetchDb error:", error.message);
      return [];
    }
    return (data ?? []).map((r: { circle_id: string }) => r.circle_id);
  }

  // ----------------------------------------------------------------
  // localStorage → Supabase に未同期分をまとめてアップサート（冪等）
  // ----------------------------------------------------------------
  async function syncLocalToDb(
    userId: string,
    localIds: string[],
    dbIds: string[]
  ): Promise<void> {
    if (!supabase) return;
    const toInsert = localIds.filter((id) => !dbIds.includes(id));
    if (toInsert.length === 0) return;
    const { error } = await supabase.from("favorites").upsert(
      toInsert.map((circle_id) => ({ user_id: userId, circle_id })),
      { onConflict: "user_id,circle_id", ignoreDuplicates: true }
    );
    if (error) {
      console.warn("[useFavorites] syncLocalToDb error:", error.message);
    }
  }

  // ----------------------------------------------------------------
  // 初期化 & 認証リスナー & 複数タブ同期
  // ----------------------------------------------------------------
  useEffect(() => {
    // --- 1) localStorage から即座に読み込む ---
    const local = loadLocal();
    applyIds(local);

    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    // --- 2) 既存セッションを確認して DB とマージ ---
    supabase.auth
      .getSession()
      .then(async ({ data: { session } }) => {
        if (cancelled) return;
        if (session?.user) {
          userRef.current = session.user;
          const dbIds = await fetchDb(session.user.id);
          if (cancelled) return;
          // ローカルと DB の和集合を正とする
          const merged = Array.from(new Set([...local, ...dbIds]));
          applyIds(merged);
          saveLocal(merged);
          // ローカルにしかない分を DB に同期（一度だけ）
          if (!syncedRef.current) {
            syncedRef.current = true;
            await syncLocalToDb(session.user.id, local, dbIds);
          }
        }
        if (!cancelled) setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    // --- 3) 認証状態の変化を監視 ---
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_IN" && session?.user) {
          userRef.current = session.user;
          // ログイン直後に一度だけ同期
          if (!syncedRef.current) {
            syncedRef.current = true;
            const currentLocal = loadLocal();
            const dbIds = await fetchDb(session.user.id);
            const merged = Array.from(new Set([...currentLocal, ...dbIds]));
            applyIds(merged);
            saveLocal(merged);
            await syncLocalToDb(session.user.id, currentLocal, dbIds);
          }
        } else if (event === "SIGNED_OUT") {
          userRef.current = null;
          syncedRef.current = false;
          // ログアウト時は localStorage を保持したまま（再ログインで使える）
        }
      }
    );

    // --- 4) 複数タブ間の同期：他タブが localStorage を更新したら反映 ---
    function onStorageEvent(e: StorageEvent) {
      if (e.key !== LS_KEY) return;
      const updated = loadLocal();
      // 自分のタブが書いた変更は無視（storageEvent は他タブのみ発火するが念のため）
      if (JSON.stringify(updated) !== JSON.stringify(favoriteIdsRef.current)) {
        applyIds(updated);
      }
    }
    window.addEventListener("storage", onStorageEvent);

    return () => {
      cancelled = true;
      authListener.subscription.unsubscribe();
      window.removeEventListener("storage", onStorageEvent);
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ----------------------------------------------------------------
  // toggle — お気に入り追加 / 解除（楽観的更新 + エラー時リバート）
  // ----------------------------------------------------------------
  const toggle = useCallback(async (circleId: string): Promise<void> => {
    // --- 連打防止 ---
    if (pendingRef.current.has(circleId)) return;
    pendingRef.current.add(circleId);

    const before = favoriteIdsRef.current;
    const isFav = before.includes(circleId);

    // --- フロント側の重複チェック（UNIQUE 制約の手前で弾く）---
    if (!isFav && before.includes(circleId)) {
      pendingRef.current.delete(circleId);
      return;
    }

    // --- 楽観的更新 ---
    const next = isFav
      ? before.filter((id) => id !== circleId)
      : [...before, circleId];
    applyIds(next);
    saveLocal(next);

    // --- Supabase への反映 ---
    const uid = userRef.current?.id;
    if (isSupabaseConfigured && supabase && uid) {
      try {
        if (isFav) {
          // 解除
          const { error } = await supabase
            .from("favorites")
            .delete()
            .eq("user_id", uid)
            .eq("circle_id", circleId);
          if (error) throw error;
        } else {
          // 登録（UNIQUE 制約により重複は無視される）
          const { error } = await supabase
            .from("favorites")
            .upsert(
              { user_id: uid, circle_id: circleId },
              { onConflict: "user_id,circle_id", ignoreDuplicates: true }
            );
          if (error) throw error;
        }
      } catch (err) {
        // --- エラー時：楽観的更新をリバート ---
        console.error("[useFavorites] toggle failed:", err);
        applyIds(before);
        saveLocal(before);
        const isNetworkError =
          err instanceof Error &&
          (err.message.includes("fetch") || err.message.includes("network") || err.message.includes("Failed"));
        showError(
          isNetworkError
            ? "ネットワークエラーです。通信環境をご確認ください。"
            : "お気に入りの更新に失敗しました。もう一度お試しください。",
          isFav ? "remove" : "add"
        );
      }
    }

    pendingRef.current.delete(circleId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ----------------------------------------------------------------
  // remove — お気に入りから明示的に削除（一覧ページ用）
  // ----------------------------------------------------------------
  const remove = useCallback(async (circleId: string): Promise<void> => {
    await toggle(circleId);
  }, [toggle]);

  // ----------------------------------------------------------------
  // isFavorited — 現在お気に入り登録済みか
  // ----------------------------------------------------------------
  const isFavorited = useCallback(
    (circleId: string) => favoriteIds.includes(circleId),
    [favoriteIds]
  );

  // ----------------------------------------------------------------
  // isPending — 操作中か（ボタンの disabled 制御用）
  // ----------------------------------------------------------------
  const isPending = useCallback(
    (circleId: string) => pendingRef.current.has(circleId),
    []
  );

  return {
    favoriteIds,
    loading,
    isFavorited,
    isPending,
    toggle,
    remove,
    errorToast,
    clearErrorToast,
  };
}
