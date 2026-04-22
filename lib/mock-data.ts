import type { Circle, Post } from "./types";

export const MOCK_CIRCLES: Circle[] = [
  { id: "1", name: "写真部", description: "日常の美しさをレンズに収める。四季折々の九工大キャンパスを撮影。", emoji: "📷", category: "文化系", icon_url: null, background_url: null, created_by: null, created_at: "2024-01-01" },
  { id: "2", name: "ダンスサークル NEXUS", description: "ストリートダンスからK-POPまで。毎週練習＆学祭で本番。", emoji: "🎭", category: "文化系", icon_url: null, background_url: null, created_by: null, created_at: "2024-01-01" },
  { id: "3", name: "音楽サークル Acoustic", description: "アコースティックギター・ピアノ・歌。弾き語りライブを定期開催。", emoji: "🎵", category: "文化系", icon_url: null, background_url: null, created_by: null, created_at: "2024-01-01" },
  { id: "4", name: "テニス部", description: "硬式テニス。九州学生リーグにも参戦する本格派。", emoji: "🎾", category: "体育系", icon_url: null, background_url: null, created_by: null, created_at: "2024-01-01" },
  { id: "5", name: "映画研究会", description: "自主映画の制作・上映。脚本から撮影・編集まで全部自分たちで。", emoji: "🎬", category: "文化系", icon_url: null, background_url: null, created_by: null, created_at: "2024-01-01" },
  { id: "6", name: "バスケットボール部", description: "男女混合で活動中。インカレも目指す！", emoji: "🏀", category: "体育系", icon_url: null, background_url: null, created_by: null, created_at: "2024-01-01" },
  { id: "7", name: "ロボット研究会", description: "NHK学生ロボコン出場を目指し毎日設計・製作。", emoji: "🤖", category: "技術系", icon_url: null, background_url: null, created_by: null, created_at: "2024-01-01" },
  { id: "8", name: "料理サークル Spice", description: "週1の料理会と学祭の模擬店が活動の柱。", emoji: "🍳", category: "文化系", icon_url: null, background_url: null, created_by: null, created_at: "2024-01-01" },
];

export const MOCK_POSTS: Record<string, Post[]> = {
  "1": [
    { id: "p1", circle_id: "1", posted_by: null, month: 4, year: 2025, media_url: "", media_type: "image", caption: "桜と正門。今年の春も最高の光だった。", created_at: "2025-04-05" },
    { id: "p2", circle_id: "1", posted_by: null, month: 4, year: 2025, media_url: "", media_type: "image", caption: "新入部員歓迎撮影会 📸", created_at: "2025-04-20" },
    { id: "p3", circle_id: "1", posted_by: null, month: 3, year: 2025, media_url: "", media_type: "image", caption: "卒業式の前日。夕焼けのキャンパス。", created_at: "2025-03-24" },
    { id: "p4", circle_id: "1", posted_by: null, month: 7, year: 2025, media_url: "", media_type: "image", caption: "夏の海撮影遠征 in 北九州", created_at: "2025-07-15" },
  ],
  "2": [
    { id: "p5", circle_id: "2", posted_by: null, month: 11, year: 2025, media_url: "", media_type: "image", caption: "学祭本番！5曲フルで踊りきった！", created_at: "2025-11-03" },
    { id: "p6", circle_id: "2", posted_by: null, month: 4, year: 2025, media_url: "", media_type: "image", caption: "新歓ダンスバトル開催 🔥", created_at: "2025-04-18" },
  ],
  "3": [
    { id: "p7", circle_id: "3", posted_by: null, month: 6, year: 2025, media_url: "", media_type: "image", caption: "定期ライブ vol.12 大成功！ありがとうございました", created_at: "2025-06-28" },
  ],
  "4": [
    { id: "p8", circle_id: "4", posted_by: null, month: 5, year: 2025, media_url: "", media_type: "image", caption: "春季リーグ戦2回戦突破！次も頑張ります", created_at: "2025-05-11" },
    { id: "p9", circle_id: "4", posted_by: null, month: 2, year: 2025, media_url: "", media_type: "image", caption: "冬合宿 in 阿蘇。3日間みっちり練習", created_at: "2025-02-10" },
  ],
  "5": [
    { id: "p10", circle_id: "5", posted_by: null, month: 7, year: 2025, media_url: "", media_type: "image", caption: "自主映画『夏の残像』完成試写会 🎬", created_at: "2025-07-20" },
    { id: "p11", circle_id: "5", posted_by: null, month: 4, year: 2025, media_url: "", media_type: "image", caption: "撮影現場の裏側。機材準備中。", created_at: "2025-04-12" },
  ],
  "6": [
    { id: "p12", circle_id: "6", posted_by: null, month: 3, year: 2025, media_url: "", media_type: "image", caption: "新入生歓迎試合！今年も熱い世代が入ってきた", created_at: "2025-03-30" },
    { id: "p13", circle_id: "6", posted_by: null, month: 10, year: 2025, media_url: "", media_type: "image", caption: "秋の学内リーグ優勝🏆", created_at: "2025-10-25" },
  ],
  "7": [
    { id: "p14", circle_id: "7", posted_by: null, month: 8, year: 2025, media_url: "", media_type: "image", caption: "NHKロボコン九州地区大会 予選通過！", created_at: "2025-08-02" },
    { id: "p15", circle_id: "7", posted_by: null, month: 1, year: 2025, media_url: "", media_type: "image", caption: "新年最初の設計会議。今年のコンセプト決定。", created_at: "2025-01-09" },
  ],
  "8": [
    { id: "p16", circle_id: "8", posted_by: null, month: 11, year: 2025, media_url: "", media_type: "image", caption: "学祭カレー屋 完売御礼！200食が3時間で消えた🍛", created_at: "2025-11-04" },
    { id: "p17", circle_id: "8", posted_by: null, month: 1, year: 2025, media_url: "", media_type: "image", caption: "新年最初の料理会。おせちリメイク料理", created_at: "2025-01-12" },
  ],
};

export const CATEGORY_COLORS: Record<string, string> = {
  "文化系": "rgba(167,139,250,0.12)",
  "体育系": "rgba(192,192,200,0.10)",
  "技術系": "rgba(100,180,220,0.10)",
};
