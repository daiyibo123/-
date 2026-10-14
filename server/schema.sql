-- 《手搓神经网络》服务端 SQLite 结构（better-sqlite3 执行）
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS sessions (
  sid        TEXT PRIMARY KEY,             -- 前端生成的匿名 uuid，不含个人信息
  class_code TEXT,                         -- 可选课堂码（班级演练/内测组织用）
  ua         TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS events (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  sid      TEXT NOT NULL REFERENCES sessions(sid),
  level_id TEXT NOT NULL,                  -- 'l1'..'l8'
  seq      INTEGER NOT NULL,
  t_ms     INTEGER NOT NULL,
  type     TEXT NOT NULL,
  payload  TEXT NOT NULL,                  -- JSON 动作细节
  correct  INTEGER,                        -- 1/0/NULL(中性)
  m_id     TEXT,                           -- misconception id，错误必带
  ts       TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_events_level ON events(level_id);
CREATE INDEX IF NOT EXISTS idx_events_m     ON events(m_id);

CREATE TABLE IF NOT EXISTS level_results (
  sid        TEXT NOT NULL,
  level_id   TEXT NOT NULL,
  stars      INTEGER NOT NULL,
  score      INTEGER NOT NULL,
  duration_s INTEGER,
  hint_used  INTEGER NOT NULL DEFAULT 0,
  finished_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ai_logs (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  sid      TEXT, level_id TEXT, m_id TEXT,
  question TEXT NOT NULL,
  answer   TEXT NOT NULL,
  model    TEXT,
  fallback INTEGER NOT NULL DEFAULT 0,
  ts       TEXT NOT NULL DEFAULT (datetime('now'))
);
