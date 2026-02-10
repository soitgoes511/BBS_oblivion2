CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  handle VARCHAR(20) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role VARCHAR(10) NOT NULL DEFAULT 'user',
  approved BOOLEAN NOT NULL DEFAULT TRUE,
  bio TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  handle VARCHAR(20) NOT NULL,
  password_hash TEXT NOT NULL,
  reason TEXT,
  blue_answer TEXT NOT NULL,
  pbx_answer TEXT NOT NULL,
  ansi_group TEXT,
  auto_score SMALLINT NOT NULL DEFAULT 0,
  status VARCHAR(12) NOT NULL DEFAULT 'pending',
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);

CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  author_handle VARCHAR(20) NOT NULL,
  title VARCHAR(120) NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS message_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(80) UNIQUE NOT NULL,
  description TEXT,
  created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS topic_id UUID REFERENCES message_topics(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS bbs_directory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  host VARCHAR(255) NOT NULL,
  port INTEGER NOT NULL DEFAULT 23,
  notes TEXT,
  created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stored_name TEXT UNIQUE NOT NULL,
  original_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  byte_size BIGINT NOT NULL,
  description TEXT,
  uploader_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  uploader_handle VARCHAR(20) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS file_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(80) UNIQUE NOT NULL,
  description TEXT,
  created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE files
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES file_categories(id) ON DELETE SET NULL;

INSERT INTO message_topics (name, description)
SELECT 'General', 'General board chatter and announcements'
WHERE NOT EXISTS (SELECT 1 FROM message_topics WHERE name = 'General');

INSERT INTO message_topics (name, description)
SELECT 'Tech Talk', 'Hardware, software, and modem-era stories'
WHERE NOT EXISTS (SELECT 1 FROM message_topics WHERE name = 'Tech Talk');

INSERT INTO file_categories (name, description)
SELECT 'General Uploads', 'Mixed files and shareware-style uploads'
WHERE NOT EXISTS (SELECT 1 FROM file_categories WHERE name = 'General Uploads');

INSERT INTO file_categories (name, description)
SELECT 'ANSI Art', 'Art packs, logos, and textmode graphics'
WHERE NOT EXISTS (SELECT 1 FROM file_categories WHERE name = 'ANSI Art');

UPDATE posts
SET topic_id = (
  SELECT id FROM message_topics WHERE name = 'General' LIMIT 1
)
WHERE topic_id IS NULL;

UPDATE files
SET category_id = (
  SELECT id FROM file_categories WHERE name = 'General Uploads' LIMIT 1
)
WHERE category_id IS NULL;

INSERT INTO posts (author_handle, title, body)
SELECT 'SYSOP', 'Welcome to Oblivion/2 Web', 'Drop a line and relive the dial-up era.'
WHERE NOT EXISTS (SELECT 1 FROM posts);

INSERT INTO bbs_directory (name, host, port, notes)
SELECT 'The Cave', 'cavebbs.example', 23, 'Retro doors and ANSI parties'
WHERE NOT EXISTS (SELECT 1 FROM bbs_directory);
