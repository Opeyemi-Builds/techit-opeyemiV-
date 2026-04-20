-- ============================================================
-- TechIT Network — Complete Supabase SQL Schema
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================
-- PROFILES
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email             TEXT NOT NULL,
  first_name        TEXT NOT NULL,
  last_name         TEXT NOT NULL,
  username          TEXT UNIQUE,
  phone             TEXT,
  country           TEXT DEFAULT '',
  country_code      TEXT DEFAULT '',
  avatar_url        TEXT,
  bio               TEXT,
  role              TEXT NOT NULL DEFAULT 'founder' CHECK (role IN ('founder','collaborator','investor','organisation')),
  secondary_roles   TEXT[] DEFAULT '{}',
  credit_balance    INTEGER NOT NULL DEFAULT 250,
  credibility_score FLOAT NOT NULL DEFAULT 0,
  is_verified       BOOLEAN DEFAULT FALSE,
  is_onboarded      BOOLEAN DEFAULT FALSE,

  -- Founder fields
  startup_stage     TEXT,
  industries        TEXT[] DEFAULT '{}',
  experience        TEXT,

  -- Collaborator fields
  skills            TEXT[] DEFAULT '{}',
  weekly_hours      INTEGER,
  risk_tolerance    TEXT,

  -- Investor fields
  investment_focus  TEXT[] DEFAULT '{}',
  ticket_size       TEXT,

  -- Organisation fields
  org_name          TEXT,
  org_type          TEXT,
  website           TEXT,

  -- Shared social
  linkedin_url      TEXT,
  github_url        TEXT,
  portfolio_url     TEXT,
  timezone          TEXT,

  -- Certifications stored as JSONB array
  certifications    JSONB DEFAULT '[]',

  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- POSTS (Social Feed)
-- ============================================================
CREATE TABLE IF NOT EXISTS posts (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content     TEXT NOT NULL CHECK (char_length(content) <= 3000),
  media_urls  TEXT[] DEFAULT '{}',
  tags        TEXT[] DEFAULT '{}',
  likes       TEXT[] DEFAULT '{}',
  views       INTEGER DEFAULT 0,
  collab_tag  TEXT CHECK (collab_tag IN ('PAID','FREE','HIRING','INVESTING')),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- COMMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS comments (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id     UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content     TEXT NOT NULL CHECK (char_length(content) <= 1000),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PROJECTS
-- ============================================================
CREATE TABLE IF NOT EXISTS projects (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  founder_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  pitch         TEXT NOT NULL,
  problem       TEXT NOT NULL,
  solution      TEXT NOT NULL,
  industry      TEXT NOT NULL,
  tech_stack    TEXT[] DEFAULT '{}',
  stage         TEXT DEFAULT 'Idea',
  monetization  TEXT,
  ai_score      FLOAT,
  ai_eval_data  JSONB,
  status        TEXT DEFAULT 'active' CHECK (status IN ('active','paused','completed')),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- COLLAB REQUESTS
-- ============================================================
CREATE TABLE IF NOT EXISTS collab_requests (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id    UUID REFERENCES projects(id) ON DELETE SET NULL,
  type          TEXT NOT NULL CHECK (type IN ('paid','free','equity')),
  message       TEXT NOT NULL,
  compensation  TEXT,
  credits_used  INTEGER DEFAULT 0,
  status        TEXT DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined')),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT no_self_request CHECK (from_id != to_id)
);

-- ============================================================
-- COLLABORATIONS (accepted collab requests become collaborations)
-- ============================================================
CREATE TABLE IF NOT EXISTS collaborations (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id    UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role          TEXT NOT NULL,
  match_score   FLOAT,
  is_paid       BOOLEAN DEFAULT FALSE,
  compensation  TEXT,
  status        TEXT DEFAULT 'active' CHECK (status IN ('active','paused','completed')),
  joined_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);

-- ============================================================
-- CONVERSATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS conversations (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  participant_ids  UUID[] NOT NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- MESSAGES
-- ============================================================
CREATE TABLE IF NOT EXISTS messages (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id  UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content          TEXT NOT NULL CHECK (char_length(content) <= 5000),
  file_urls        TEXT[] DEFAULT '{}',
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type        TEXT NOT NULL CHECK (type IN ('match','collab_request','message','credit','system','like','comment')),
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  read        BOOLEAN DEFAULT FALSE,
  metadata    JSONB,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CREDIT TRANSACTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS credit_transactions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount      INTEGER NOT NULL,
  action      TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- WORKSPACES
-- ============================================================
CREATE TABLE IF NOT EXISTS workspaces (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id)
);

CREATE TABLE IF NOT EXISTS workspace_files (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  path         TEXT NOT NULL DEFAULT '/',
  content      TEXT DEFAULT '',
  language     TEXT,
  file_url     TEXT,
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, path, name)
);

-- ============================================================
-- INDEXES for performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_profiles_user_id      ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_username      ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_role          ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_country       ON profiles(country);
CREATE INDEX IF NOT EXISTS idx_profiles_skills        ON profiles USING GIN(skills);
CREATE INDEX IF NOT EXISTS idx_profiles_industries    ON profiles USING GIN(industries);
CREATE INDEX IF NOT EXISTS idx_profiles_name_search   ON profiles USING GIN((first_name || ' ' || last_name) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_posts_author_id        ON posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at       ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_collab_tag       ON posts(collab_tag);
CREATE INDEX IF NOT EXISTS idx_posts_tags             ON posts USING GIN(tags);

CREATE INDEX IF NOT EXISTS idx_comments_post_id       ON comments(post_id);

CREATE INDEX IF NOT EXISTS idx_projects_founder_id    ON projects(founder_id);
CREATE INDEX IF NOT EXISTS idx_projects_industry      ON projects(industry);
CREATE INDEX IF NOT EXISTS idx_projects_status        ON projects(status);

CREATE INDEX IF NOT EXISTS idx_collab_requests_from   ON collab_requests(from_id);
CREATE INDEX IF NOT EXISTS idx_collab_requests_to     ON collab_requests(to_id);
CREATE INDEX IF NOT EXISTS idx_collab_requests_status ON collab_requests(status);

CREATE INDEX IF NOT EXISTS idx_messages_conv_id       ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created       ON messages(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user     ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read     ON notifications(user_id, read);

CREATE INDEX IF NOT EXISTS idx_credit_tx_user         ON credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_tx_created      ON credit_transactions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ws_files_workspace     ON workspace_files(workspace_id);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_posts_updated_at
  BEFORE UPDATE ON posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_ws_files_updated_at
  BEFORE UPDATE ON workspace_files
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- AUTO-CREATE PROFILE ON SIGNUP (Supabase Auth Trigger)
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (user_id, email, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'last_name', '')
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- CREDIBILITY SCORE FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION calculate_credibility(p_user_id UUID)
RETURNS FLOAT AS $$
DECLARE
  v_score FLOAT := 0;
  v_completed_projects INTEGER;
  v_collab_count INTEGER;
  v_positive_feedback FLOAT;
  v_cert_count INTEGER;
  v_post_count INTEGER;
  v_days_on_platform INTEGER;
BEGIN
  -- Completed collaborations
  SELECT COUNT(*) INTO v_completed_projects
  FROM collaborations WHERE user_id = p_user_id AND status = 'completed';

  -- Total collaborations
  SELECT COUNT(*) INTO v_collab_count
  FROM collaborations WHERE user_id = p_user_id;

  -- Certifications
  SELECT jsonb_array_length(certifications) INTO v_cert_count
  FROM profiles WHERE user_id = p_user_id;

  -- Post engagement
  SELECT COUNT(*) INTO v_post_count
  FROM posts WHERE author_id = p_user_id;

  -- Days on platform
  SELECT EXTRACT(DAY FROM (NOW() - created_at))::INTEGER INTO v_days_on_platform
  FROM profiles WHERE user_id = p_user_id;

  -- Score formula
  v_score := LEAST(100,
    (v_completed_projects * 15) +
    (COALESCE(v_cert_count, 0) * 10) +
    (LEAST(v_post_count, 10) * 3) +
    (LEAST(v_days_on_platform, 365) * 0.05)
  );

  RETURN ROUND(v_score::NUMERIC, 1);
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
ALTER TABLE profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts             ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments          ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects          ENABLE ROW LEVEL SECURITY;
ALTER TABLE collab_requests   ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaborations    ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations     ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages          ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications     ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces        ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_files   ENABLE ROW LEVEL SECURITY;

-- PROFILES policies
CREATE POLICY "Profiles are publicly viewable"
  ON profiles FOR SELECT USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- POSTS policies
CREATE POLICY "Posts are publicly viewable"
  ON posts FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create posts"
  ON posts FOR INSERT WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors can update own posts"
  ON posts FOR UPDATE USING (auth.uid() = author_id);

CREATE POLICY "Authors can delete own posts"
  ON posts FOR DELETE USING (auth.uid() = author_id);

-- COMMENTS policies
CREATE POLICY "Comments are publicly viewable"
  ON comments FOR SELECT USING (true);

CREATE POLICY "Authenticated users can comment"
  ON comments FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authors can delete own comments"
  ON comments FOR DELETE USING (auth.uid() = author_id);

-- PROJECTS policies
CREATE POLICY "Projects are publicly viewable"
  ON projects FOR SELECT USING (true);

CREATE POLICY "Founders can create projects"
  ON projects FOR INSERT WITH CHECK (auth.uid() = founder_id);

CREATE POLICY "Founders can update own projects"
  ON projects FOR UPDATE USING (auth.uid() = founder_id);

CREATE POLICY "Founders can delete own projects"
  ON projects FOR DELETE USING (auth.uid() = founder_id);

-- COLLAB REQUESTS policies
CREATE POLICY "Users see their own requests"
  ON collab_requests FOR SELECT
  USING (auth.uid() = from_id OR auth.uid() = to_id);

CREATE POLICY "Authenticated users can send requests"
  ON collab_requests FOR INSERT WITH CHECK (auth.uid() = from_id);

CREATE POLICY "Recipients can update status"
  ON collab_requests FOR UPDATE USING (auth.uid() = to_id);

-- COLLABORATIONS policies
CREATE POLICY "Collaborations viewable by members"
  ON collaborations FOR SELECT USING (true);

CREATE POLICY "Founders can add collaborators"
  ON collaborations FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- CONVERSATIONS policies
CREATE POLICY "Users see own conversations"
  ON conversations FOR SELECT
  USING (auth.uid() = ANY(participant_ids));

CREATE POLICY "Users can create conversations"
  ON conversations FOR INSERT
  WITH CHECK (auth.uid() = ANY(participant_ids));

-- MESSAGES policies
CREATE POLICY "Participants can view messages"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE id = conversation_id
      AND auth.uid() = ANY(participant_ids)
    )
  );

CREATE POLICY "Participants can send messages"
  ON messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM conversations
      WHERE id = conversation_id
      AND auth.uid() = ANY(participant_ids)
    )
  );

-- NOTIFICATIONS policies
CREATE POLICY "Users see own notifications"
  ON notifications FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications"
  ON notifications FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can mark own notifications"
  ON notifications FOR UPDATE USING (auth.uid() = user_id);

-- CREDIT TRANSACTIONS policies
CREATE POLICY "Users see own transactions"
  ON credit_transactions FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert transactions"
  ON credit_transactions FOR INSERT WITH CHECK (true);

-- WORKSPACES policies
CREATE POLICY "Workspace members can view"
  ON workspaces FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects p
      LEFT JOIN collaborations c ON c.project_id = p.id
      WHERE p.id = project_id
      AND (p.founder_id = auth.uid() OR c.user_id = auth.uid())
    )
  );

CREATE POLICY "Founders can create workspaces"
  ON workspaces FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM projects WHERE id = project_id AND founder_id = auth.uid())
  );

-- WORKSPACE FILES policies
CREATE POLICY "Members can view files"
  ON workspace_files FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workspaces ws
      JOIN projects p ON p.id = ws.project_id
      LEFT JOIN collaborations c ON c.project_id = p.id
      WHERE ws.id = workspace_id
      AND (p.founder_id = auth.uid() OR c.user_id = auth.uid())
    )
  );

CREATE POLICY "Members can manage files"
  ON workspace_files FOR ALL USING (
    EXISTS (
      SELECT 1 FROM workspaces ws
      JOIN projects p ON p.id = ws.project_id
      LEFT JOIN collaborations c ON c.project_id = p.id
      WHERE ws.id = workspace_id
      AND (p.founder_id = auth.uid() OR c.user_id = auth.uid())
    )
  );

-- ============================================================
-- REALTIME SUBSCRIPTIONS
-- Enable realtime for messaging and notifications
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE posts;
ALTER PUBLICATION supabase_realtime ADD TABLE collab_requests;

-- ============================================================
-- STORAGE BUCKET
-- Run this via Supabase Dashboard > Storage or API
-- ============================================================
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('techit-uploads', 'techit-uploads', true);

-- Storage RLS
-- CREATE POLICY "Public read access" ON storage.objects FOR SELECT USING (bucket_id = 'techit-uploads');
-- CREATE POLICY "Auth users can upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'techit-uploads' AND auth.role() = 'authenticated');
-- CREATE POLICY "Users delete own files" ON storage.objects FOR DELETE USING (bucket_id = 'techit-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);
