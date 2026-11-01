-- 「我的评分」：我为游戏打的分与一句短评。
-- 与 steam_games 用 appid 关联（不做外键：游戏下架后评分仍可保留，读取时过滤 is_visible）。
CREATE TABLE IF NOT EXISTS steam_ratings (
  appid INTEGER PRIMARY KEY,
  score REAL NOT NULL,
  comment TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_steam_ratings_position ON steam_ratings(position);

-- 新展柜：评分紧跟在「最爱游戏」之后。
INSERT INTO steam_showcases (type, position, visible, config, updated_at)
SELECT 'rating', 2, 1, '{"limit":6}', '2026-11-02T00:00:00.000Z'
WHERE NOT EXISTS (SELECT 1 FROM steam_showcases WHERE type = 'rating');

-- 统一成新的视觉层级：英雄区 → 观点（评分）→ 进行时 → 档案卡。
-- 本页尚未上线，此处直接写入推荐顺序；之后在后台的拖拽排序不会被覆盖。
UPDATE steam_showcases
   SET position = CASE type
     WHEN 'favorite' THEN 1
     WHEN 'rating' THEN 2
     WHEN 'recent' THEN 3
     WHEN 'collector' THEN 4
     WHEN 'top-playtime' THEN 5
     WHEN 'completionist' THEN 6
     WHEN 'rarest-achievement' THEN 7
     WHEN 'wishlist' THEN 8
     ELSE 99
   END;
