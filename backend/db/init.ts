import Database from 'better-sqlite3';

const db = new Database('learnquest.db');

db.exec(`
CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  avatar TEXT,
  level INTEGER DEFAULT 1,
  xp INTEGER DEFAULT 0,
  parent_phone TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS quests (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  difficulty INTEGER NOT NULL,
  description TEXT,
  max_score INTEGER DEFAULT 100,
  time_limit INTEGER DEFAULT 60,
  completion_score INTEGER DEFAULT 80,
  levels TEXT, -- JSON string for levels array
  play_mode TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY,
  quest_id TEXT NOT NULL,
  prompt TEXT NOT NULL,
  "order" INTEGER DEFAULT 0,
  type TEXT DEFAULT 'text',
  payload TEXT,
  FOREIGN KEY (quest_id) REFERENCES quests (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS answers (
  id TEXT PRIMARY KEY,
  question_id TEXT NOT NULL,
  label TEXT NOT NULL,
  value TEXT NOT NULL,
  is_correct BOOLEAN DEFAULT 0,
  FOREIGN KEY (question_id) REFERENCES questions (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS progress (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  quest_id TEXT NOT NULL,
  completed BOOLEAN DEFAULT 0,
  score INTEGER DEFAULT 0,
  attempts INTEGER DEFAULT 0,
  completed_at DATETIME,
  FOREIGN KEY (student_id) REFERENCES students (id),
  FOREIGN KEY (quest_id) REFERENCES quests (id)
);

CREATE TABLE IF NOT EXISTS sms_logs (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL,
  sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  status TEXT DEFAULT 'pending',
  FOREIGN KEY (student_id) REFERENCES students (id)
);

CREATE TABLE IF NOT EXISTS sms_templates (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL UNIQUE,
    template TEXT NOT NULL
);
`);

console.log('Database initialized');

db.close();
