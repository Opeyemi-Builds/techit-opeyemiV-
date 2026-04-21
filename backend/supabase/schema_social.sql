-- ============================================================
-- TechIT Network — Social Schema Extensions
-- Run in Supabase SQL Editor AFTER schema_fix.sql
-- ============================================================

-- ── Friend / Connection Requests ──────────────────────────────
CREATE TABLE IF NOT EXISTS connections (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_id       UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  to_id         UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  status        TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','accepted','declined','blocked')),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(from_id, to_id)
);

CREATE INDEX IF NOT EXISTS idx_connections_from   ON connections(from_id);
CREATE INDEX IF NOT EXISTS idx_connections_to     ON connections(to_id);
CREATE INDEX IF NOT EXISTS idx_connections_status ON connections(status);

ALTER TABLE connections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "connections_select" ON connections;
DROP POLICY IF EXISTS "connections_insert" ON connections;
DROP POLICY IF EXISTS "connections_update" ON connections;
CREATE POLICY "connections_select" ON connections FOR SELECT
  USING (auth.uid() = from_id OR auth.uid() = to_id);
CREATE POLICY "connections_insert" ON connections FOR INSERT
  WITH CHECK (auth.uid() = from_id);
CREATE POLICY "connections_update" ON connections FOR UPDATE
  USING (auth.uid() = to_id OR auth.uid() = from_id);

-- Notification trigger for connection requests
CREATE OR REPLACE FUNCTION handle_connection_notification()
RETURNS TRIGGER AS $$
DECLARE v_name TEXT;
BEGIN
  SELECT first_name || ' ' || last_name INTO v_name FROM profiles WHERE user_id = NEW.from_id;
  IF NEW.status = 'pending' THEN
    INSERT INTO notifications (user_id, type, title, body, metadata, read)
    VALUES (NEW.to_id, 'connection_request', v_name || ' wants to connect with you',
            'You have a new connection request', jsonb_build_object('from_id', NEW.from_id, 'request_id', NEW.id), false);
  ELSIF NEW.status = 'accepted' THEN
    SELECT first_name || ' ' || last_name INTO v_name FROM profiles WHERE user_id = NEW.to_id;
    INSERT INTO notifications (user_id, type, title, body, metadata, read)
    VALUES (NEW.from_id, 'connection_accepted', v_name || ' accepted your connection request',
            'You are now connected', jsonb_build_object('user_id', NEW.to_id, 'request_id', NEW.id), false);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_connection_change ON connections;
CREATE TRIGGER on_connection_change
  AFTER INSERT OR UPDATE ON connections
  FOR EACH ROW EXECUTE FUNCTION handle_connection_notification();

-- ── Project Join Requests (separate from collab_requests) ─────
CREATE TABLE IF NOT EXISTS project_join_requests (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  message     TEXT DEFAULT '',
  role        TEXT DEFAULT 'Collaborator',
  status      TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','accepted','declined')),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_pjr_project ON project_join_requests(project_id);
CREATE INDEX IF NOT EXISTS idx_pjr_user    ON project_join_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_pjr_status  ON project_join_requests(status);

ALTER TABLE project_join_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pjr_select" ON project_join_requests;
DROP POLICY IF EXISTS "pjr_insert" ON project_join_requests;
DROP POLICY IF EXISTS "pjr_update" ON project_join_requests;
CREATE POLICY "pjr_select" ON project_join_requests FOR SELECT USING (
  auth.uid() = user_id OR
  EXISTS (SELECT 1 FROM projects WHERE id = project_id AND founder_id = auth.uid())
);
CREATE POLICY "pjr_insert" ON project_join_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "pjr_update" ON project_join_requests FOR UPDATE USING (
  EXISTS (SELECT 1 FROM projects WHERE id = project_id AND founder_id = auth.uid())
);

-- Notify founder on join request
CREATE OR REPLACE FUNCTION handle_join_request_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_founder_id UUID;
  v_project_title TEXT;
  v_requester_name TEXT;
BEGIN
  SELECT founder_id, title INTO v_founder_id, v_project_title FROM projects WHERE id = NEW.project_id;
  SELECT first_name || ' ' || last_name INTO v_requester_name FROM profiles WHERE user_id = NEW.user_id;

  IF NEW.status = 'pending' THEN
    INSERT INTO notifications (user_id, type, title, body, metadata, read)
    VALUES (v_founder_id, 'join_request',
            v_requester_name || ' wants to join ' || v_project_title,
            COALESCE(NEW.message, 'They want to collaborate on your project'),
            jsonb_build_object('project_id', NEW.project_id, 'user_id', NEW.user_id, 'request_id', NEW.id),
            false);
  ELSIF NEW.status = 'accepted' THEN
    -- Auto-create collaboration record
    INSERT INTO collaborations (project_id, user_id, role, status, joined_at)
    VALUES (NEW.project_id, NEW.user_id, NEW.role, 'active', NOW())
    ON CONFLICT (project_id, user_id) DO UPDATE SET status = 'active';

    -- Notify requester
    INSERT INTO notifications (user_id, type, title, body, metadata, read)
    VALUES (NEW.user_id, 'join_accepted',
            'Your request to join ' || v_project_title || ' was accepted!',
            'You are now a collaborator on this project',
            jsonb_build_object('project_id', NEW.project_id),
            false);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_join_request ON project_join_requests;
CREATE TRIGGER on_join_request
  AFTER INSERT OR UPDATE ON project_join_requests
  FOR EACH ROW EXECUTE FUNCTION handle_join_request_notification();

-- ── Post Saves / Bookmarks ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS post_saves (
  user_id    UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  post_id    UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, post_id)
);

ALTER TABLE post_saves ENABLE ROW LEVEL SECURITY;
CREATE POLICY "post_saves_all" ON post_saves USING (auth.uid() = user_id);

-- ── Search index on profiles ────────────────────────────────────
DROP INDEX IF EXISTS idx_profiles_search;
CREATE INDEX idx_profiles_search ON profiles
  USING GIN(to_tsvector('english',
    coalesce(first_name,'') || ' ' ||
    coalesce(last_name,'') || ' ' ||
    coalesce(username,'') || ' ' ||
    coalesce(bio,'') || ' ' ||
    coalesce(array_to_string(skills, ' '),'')
  ));

-- ── Search index on projects ────────────────────────────────────
DROP INDEX IF EXISTS idx_projects_search;
CREATE INDEX idx_projects_search ON projects
  USING GIN(to_tsvector('english',
    coalesce(title,'') || ' ' ||
    coalesce(pitch,'') || ' ' ||
    coalesce(problem,'') || ' ' ||
    coalesce(industry,'')
  ));

-- ── Search index on posts ───────────────────────────────────────
DROP INDEX IF EXISTS idx_posts_search;
CREATE INDEX idx_posts_search ON posts
  USING GIN(to_tsvector('english', coalesce(content,'')));

-- ── Workspace access control ────────────────────────────────────
ALTER TABLE workspace_files ADD COLUMN IF NOT EXISTS file_url TEXT;
ALTER TABLE workspace_files ADD COLUMN IF NOT EXISTS size_bytes INTEGER DEFAULT 0;

-- ── Enable realtime on new tables ──────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE connections;
ALTER PUBLICATION supabase_realtime ADD TABLE project_join_requests;

SELECT 'Social schema applied successfully' AS status;
