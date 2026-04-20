-- ============================================================
-- TechIT Network — Critical Schema Fixes
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================
-- FIX 1: posts.author_id must reference profiles(user_id)
-- This makes the Supabase join syntax work: profiles!author_id
-- ============================================================
DO $$
BEGIN
  -- Drop old FK to auth.users if exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'posts_author_id_fkey'
    AND table_name = 'posts'
  ) THEN
    ALTER TABLE posts DROP CONSTRAINT posts_author_id_fkey;
  END IF;
  -- Add new FK to profiles
  ALTER TABLE posts
    ADD CONSTRAINT posts_author_id_fkey
    FOREIGN KEY (author_id) REFERENCES profiles(user_id) ON DELETE CASCADE;
END $$;

-- ============================================================
-- FIX 2: comments.author_id must reference profiles(user_id)
-- ============================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'comments_author_id_fkey'
    AND table_name = 'comments'
  ) THEN
    ALTER TABLE comments DROP CONSTRAINT comments_author_id_fkey;
  END IF;
  ALTER TABLE comments
    ADD CONSTRAINT comments_author_id_fkey
    FOREIGN KEY (author_id) REFERENCES profiles(user_id) ON DELETE CASCADE;
END $$;

-- ============================================================
-- FIX 3: messages.sender_id must reference profiles(user_id)
-- ============================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'messages_sender_id_fkey'
    AND table_name = 'messages'
  ) THEN
    ALTER TABLE messages DROP CONSTRAINT messages_sender_id_fkey;
  END IF;
  ALTER TABLE messages
    ADD CONSTRAINT messages_sender_id_fkey
    FOREIGN KEY (sender_id) REFERENCES profiles(user_id) ON DELETE CASCADE;
END $$;

-- ============================================================
-- FIX 4: collab_requests FKs must reference profiles(user_id)
-- ============================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'collab_requests_from_id_fkey'
    AND table_name = 'collab_requests'
  ) THEN
    ALTER TABLE collab_requests DROP CONSTRAINT collab_requests_from_id_fkey;
  END IF;
  ALTER TABLE collab_requests
    ADD CONSTRAINT collab_requests_from_id_fkey
    FOREIGN KEY (from_id) REFERENCES profiles(user_id) ON DELETE CASCADE;

  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'collab_requests_to_id_fkey'
    AND table_name = 'collab_requests'
  ) THEN
    ALTER TABLE collab_requests DROP CONSTRAINT collab_requests_to_id_fkey;
  END IF;
  ALTER TABLE collab_requests
    ADD CONSTRAINT collab_requests_to_id_fkey
    FOREIGN KEY (to_id) REFERENCES profiles(user_id) ON DELETE CASCADE;
END $$;

-- ============================================================
-- FIX 5: Ensure workspaces and workspace_files tables exist
-- ============================================================
CREATE TABLE IF NOT EXISTS workspaces (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id)
);

CREATE TABLE IF NOT EXISTS workspace_files (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id  UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  path          TEXT NOT NULL DEFAULT '/',
  content       TEXT DEFAULT '',
  language      TEXT DEFAULT 'text',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- FIX 6: Ensure collaborations table exists
-- ============================================================
CREATE TABLE IF NOT EXISTS collaborations (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  role        TEXT DEFAULT 'Collaborator',
  status      TEXT DEFAULT 'active' CHECK (status IN ('active','paused','completed','left')),
  joined_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);

-- ============================================================
-- FIX 7: Ensure credit_transactions table exists
-- ============================================================
CREATE TABLE IF NOT EXISTS credit_transactions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  amount      INTEGER NOT NULL,
  action      TEXT NOT NULL,
  description TEXT DEFAULT '',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- FIX 8: Ensure conversations and messages tables exist
-- ============================================================
CREATE TABLE IF NOT EXISTS conversations (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  participant_ids  UUID[] NOT NULL DEFAULT '{}',
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id  UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id        UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  content          TEXT NOT NULL,
  file_urls        TEXT[] DEFAULT '{}',
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- FIX 9: Ensure notifications table exists
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  type        TEXT NOT NULL,
  title       TEXT NOT NULL,
  body        TEXT DEFAULT '',
  read        BOOLEAN DEFAULT false,
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- FIX 10: Add missing columns if they don't exist
-- ============================================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_onboarded BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS credibility_score NUMERIC DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS credit_balance INTEGER DEFAULT 250;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS secondary_roles TEXT[] DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS investment_focus TEXT[] DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS certifications JSONB DEFAULT '[]';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS industries TEXT[] DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS skills TEXT[] DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS weekly_hours INTEGER;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS risk_tolerance TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS startup_stage TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS experience TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ticket_size TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS org_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS org_type TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS linkedin_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS github_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS portfolio_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS timezone TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS country_code TEXT DEFAULT '';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;

-- ============================================================
-- FIX 11: Enable Realtime for key tables
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE posts;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE workspace_files;
ALTER PUBLICATION supabase_realtime ADD TABLE collab_requests;

-- ============================================================
-- FIX 12: Row Level Security — allow authenticated users
-- ============================================================

-- profiles: anyone can read, owner can update
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profiles_select" ON profiles;
DROP POLICY IF EXISTS "profiles_update" ON profiles;
DROP POLICY IF EXISTS "profiles_insert" ON profiles;
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (auth.uid() = user_id);

-- posts: anyone can read, owner can insert/delete
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "posts_select" ON posts;
DROP POLICY IF EXISTS "posts_insert" ON posts;
DROP POLICY IF EXISTS "posts_update" ON posts;
DROP POLICY IF EXISTS "posts_delete" ON posts;
CREATE POLICY "posts_select" ON posts FOR SELECT USING (true);
CREATE POLICY "posts_insert" ON posts FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "posts_update" ON posts FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "posts_delete" ON posts FOR DELETE USING (auth.uid() = author_id);

-- comments
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "comments_select" ON comments;
DROP POLICY IF EXISTS "comments_insert" ON comments;
DROP POLICY IF EXISTS "comments_delete" ON comments;
CREATE POLICY "comments_select" ON comments FOR SELECT USING (true);
CREATE POLICY "comments_insert" ON comments FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "comments_delete" ON comments FOR DELETE USING (auth.uid() = author_id);

-- projects
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "projects_select" ON projects;
DROP POLICY IF EXISTS "projects_insert" ON projects;
DROP POLICY IF EXISTS "projects_update" ON projects;
DROP POLICY IF EXISTS "projects_delete" ON projects;
CREATE POLICY "projects_select" ON projects FOR SELECT USING (true);
CREATE POLICY "projects_insert" ON projects FOR INSERT WITH CHECK (auth.uid() = founder_id);
CREATE POLICY "projects_update" ON projects FOR UPDATE USING (auth.uid() = founder_id);
CREATE POLICY "projects_delete" ON projects FOR DELETE USING (auth.uid() = founder_id);

-- conversations: participants can access
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "conversations_select" ON conversations;
DROP POLICY IF EXISTS "conversations_insert" ON conversations;
CREATE POLICY "conversations_select" ON conversations FOR SELECT USING (auth.uid() = ANY(participant_ids));
CREATE POLICY "conversations_insert" ON conversations FOR INSERT WITH CHECK (auth.uid() = ANY(participant_ids));

-- messages: participants can access
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "messages_select" ON messages;
DROP POLICY IF EXISTS "messages_insert" ON messages;
CREATE POLICY "messages_select" ON messages FOR SELECT
  USING (EXISTS (SELECT 1 FROM conversations WHERE id = conversation_id AND auth.uid() = ANY(participant_ids)));
CREATE POLICY "messages_insert" ON messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id AND EXISTS (SELECT 1 FROM conversations WHERE id = conversation_id AND auth.uid() = ANY(participant_ids)));

-- notifications: user can access their own
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notifications_select" ON notifications;
DROP POLICY IF EXISTS "notifications_update" ON notifications;
CREATE POLICY "notifications_select" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "notifications_update" ON notifications FOR UPDATE USING (auth.uid() = user_id);

-- collab_requests
ALTER TABLE collab_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "collab_requests_select" ON collab_requests;
DROP POLICY IF EXISTS "collab_requests_insert" ON collab_requests;
DROP POLICY IF EXISTS "collab_requests_update" ON collab_requests;
CREATE POLICY "collab_requests_select" ON collab_requests FOR SELECT USING (auth.uid() = from_id OR auth.uid() = to_id);
CREATE POLICY "collab_requests_insert" ON collab_requests FOR INSERT WITH CHECK (auth.uid() = from_id);
CREATE POLICY "collab_requests_update" ON collab_requests FOR UPDATE USING (auth.uid() = to_id OR auth.uid() = from_id);

-- collaborations
ALTER TABLE collaborations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "collaborations_select" ON collaborations;
DROP POLICY IF EXISTS "collaborations_insert" ON collaborations;
DROP POLICY IF EXISTS "collaborations_update" ON collaborations;
CREATE POLICY "collaborations_select" ON collaborations FOR SELECT USING (true);
CREATE POLICY "collaborations_insert" ON collaborations FOR INSERT WITH CHECK (true);
CREATE POLICY "collaborations_update" ON collaborations FOR UPDATE USING (true);

-- workspaces
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "workspaces_select" ON workspaces;
DROP POLICY IF EXISTS "workspaces_insert" ON workspaces;
CREATE POLICY "workspaces_select" ON workspaces FOR SELECT USING (true);
CREATE POLICY "workspaces_insert" ON workspaces FOR INSERT WITH CHECK (true);
CREATE POLICY "workspaces_update" ON workspaces FOR UPDATE USING (true);

-- workspace_files
ALTER TABLE workspace_files ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "workspace_files_select" ON workspace_files;
DROP POLICY IF EXISTS "workspace_files_insert" ON workspace_files;
DROP POLICY IF EXISTS "workspace_files_update" ON workspace_files;
DROP POLICY IF EXISTS "workspace_files_delete" ON workspace_files;
CREATE POLICY "workspace_files_select" ON workspace_files FOR SELECT USING (true);
CREATE POLICY "workspace_files_insert" ON workspace_files FOR INSERT WITH CHECK (true);
CREATE POLICY "workspace_files_update" ON workspace_files FOR UPDATE USING (true);
CREATE POLICY "workspace_files_delete" ON workspace_files FOR DELETE USING (true);

-- credit_transactions
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "credit_transactions_select" ON credit_transactions;
DROP POLICY IF EXISTS "credit_transactions_insert" ON credit_transactions;
CREATE POLICY "credit_transactions_select" ON credit_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "credit_transactions_insert" ON credit_transactions FOR INSERT WITH CHECK (auth.uid() = user_id OR true);

-- ============================================================
-- SUCCESS
-- ============================================================
SELECT 'Schema fixes applied successfully' AS status;
