-- ============================================================
-- お気に入り機能 — Supabase で実行する SQL
-- ============================================================

-- 1. favorites テーブル作成
CREATE TABLE IF NOT EXISTS favorites (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  circle_id  UUID        NOT NULL REFERENCES circles(id)   ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, circle_id)
);

-- 2. インデックス
CREATE INDEX IF NOT EXISTS idx_favorites_user_id   ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_circle_id ON favorites(circle_id);

-- 3. RLS 有効化
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

-- 4. ポリシー
CREATE POLICY "favorites_select_own"
  ON favorites FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "favorites_insert_own"
  ON favorites FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "favorites_delete_own"
  ON favorites FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- (任意) circles テーブルに拡張フィールドを追加
-- 活動日・部員数・部費・活動場所を比較ビューで表示する場合に使用
-- ============================================================
-- ALTER TABLE circles ADD COLUMN IF NOT EXISTS activity_days  TEXT;
-- ALTER TABLE circles ADD COLUMN IF NOT EXISTS member_count   INTEGER;
-- ALTER TABLE circles ADD COLUMN IF NOT EXISTS fee            TEXT;
-- ALTER TABLE circles ADD COLUMN IF NOT EXISTS location       TEXT;
