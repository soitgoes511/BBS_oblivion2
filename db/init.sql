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

INSERT INTO posts (author_handle, title, body)
SELECT 'SYSOP', 'Welcome to Oblivion/2 Web', 'Drop a line and relive the dial-up era.'
WHERE NOT EXISTS (SELECT 1 FROM posts);

INSERT INTO bbs_directory (name, host, port, notes)
SELECT 'The Cave', 'cavebbs.example', 23, 'Retro doors and ANSI parties'
WHERE NOT EXISTS (SELECT 1 FROM bbs_directory);
