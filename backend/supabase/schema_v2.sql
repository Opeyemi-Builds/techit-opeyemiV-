-- ============================================================
-- TechIT Network — Supabase Schema v2 (ADDITIONS / FIXES)
-- Run after schema.sql if you already ran the first version
-- Or run this entire file fresh on a new project
-- ============================================================

-- Fix: workspace_files needs ON CONFLICT for upsert
ALTER TABLE workspace_files DROP CONSTRAINT IF EXISTS workspace_files_workspace_id_path_name_key;
ALTER TABLE workspace_files ADD CONSTRAINT workspace_files_workspace_id_path_name_key UNIQUE (workspace_id, path, name);

-- Fix: conversations need better indexing
CREATE INDEX IF NOT EXISTS idx_conversations_participants ON conversations USING GIN(participant_ids);

-- Add: profiles full-text search
CREATE INDEX IF NOT EXISTS idx_profiles_fulltext ON profiles USING GIN(
  to_tsvector('english', coalesce(first_name,'') || ' ' || coalesce(last_name,'') || ' ' || coalesce(bio,''))
);

-- Add: post views increment function
CREATE OR REPLACE FUNCTION increment_post_views(post_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE posts SET views = views + 1 WHERE id = post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add: credit balance check constraint
ALTER TABLE profiles ADD CONSTRAINT credit_balance_non_negative CHECK (credit_balance >= 0);

-- Add: referral tracking
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES auth.users(id);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE DEFAULT substr(md5(random()::text), 1, 8);

-- Add: notification send helper function
CREATE OR REPLACE FUNCTION notify_user(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_body TEXT,
  p_metadata JSONB DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO notifications (user_id, type, title, body, metadata, read)
  VALUES (p_user_id, p_type, p_title, p_body, p_metadata, false)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add: auto-notify on collab request
CREATE OR REPLACE FUNCTION handle_collab_request_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_from_name TEXT;
BEGIN
  SELECT first_name || ' ' || last_name INTO v_from_name
  FROM profiles WHERE user_id = NEW.from_id;

  PERFORM notify_user(
    NEW.to_id,
    'collab_request',
    'New Collaboration Request',
    v_from_name || ' sent you a ' || NEW.type || ' collaboration request',
    jsonb_build_object('request_id', NEW.id, 'from_id', NEW.from_id, 'type', NEW.type)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_collab_request_created ON collab_requests;
CREATE TRIGGER on_collab_request_created
  AFTER INSERT ON collab_requests
  FOR EACH ROW EXECUTE FUNCTION handle_collab_request_notification();

-- Add: auto-notify on new message
CREATE OR REPLACE FUNCTION handle_new_message_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_sender_name TEXT;
  v_other_id UUID;
  v_participant_ids UUID[];
BEGIN
  SELECT first_name || ' ' || last_name INTO v_sender_name
  FROM profiles WHERE user_id = NEW.sender_id;

  SELECT participant_ids INTO v_participant_ids
  FROM conversations WHERE id = NEW.conversation_id;

  -- Notify everyone except the sender
  FOR v_other_id IN SELECT unnest(v_participant_ids) LOOP
    IF v_other_id != NEW.sender_id THEN
      PERFORM notify_user(
        v_other_id,
        'message',
        'New message from ' || v_sender_name,
        left(NEW.content, 100),
        jsonb_build_object('conversation_id', NEW.conversation_id, 'sender_id', NEW.sender_id)
      );
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_new_message ON messages;
CREATE TRIGGER on_new_message
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION handle_new_message_notification();

-- Add: auto-notify on post like
CREATE OR REPLACE FUNCTION handle_post_like_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_post_author UUID;
  v_new_likes TEXT[];
  v_old_likes TEXT[];
  v_liker_name TEXT;
BEGIN
  v_new_likes := NEW.likes;
  v_old_likes := COALESCE(OLD.likes, '{}');
  v_post_author := NEW.author_id;

  -- Only notify if likes increased
  IF array_length(v_new_likes, 1) > array_length(v_old_likes, 1) THEN
    -- Get the new liker (last element)
    DECLARE v_liker_id TEXT := v_new_likes[array_length(v_new_likes, 1)];
    BEGIN
      SELECT first_name || ' ' || last_name INTO v_liker_name
      FROM profiles WHERE user_id = v_liker_id::UUID;

      -- Don't notify if user liked own post
      IF v_liker_id::UUID != v_post_author THEN
        PERFORM notify_user(
          v_post_author,
          'like',
          v_liker_name || ' liked your post',
          left(NEW.content, 80),
          jsonb_build_object('post_id', NEW.id)
        );
      END IF;
    END;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_post_liked ON posts;
CREATE TRIGGER on_post_liked
  AFTER UPDATE OF likes ON posts
  FOR EACH ROW EXECUTE FUNCTION handle_post_like_notification();

-- ============================================================
-- Storage bucket (run in Supabase dashboard or via API)
-- ============================================================
-- INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
-- VALUES (
--   'techit-uploads',
--   'techit-uploads',
--   true,
--   10485760,  -- 10MB
--   ARRAY['image/jpeg','image/png','image/gif','image/webp','application/pdf','text/plain']
-- )
-- ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Seed data for testing (optional)
-- ============================================================
-- Uncomment to add test data after your first signup:
--
-- UPDATE profiles SET
--   bio = 'Building the future of developer tools. Passionate about AI and open source.',
--   skills = ARRAY['React','TypeScript','Node.js','Python','PostgreSQL'],
--   industries = ARRAY['AI/ML','SaaS'],
--   linkedin_url = 'https://linkedin.com',
--   github_url = 'https://github.com',
--   is_onboarded = true,
--   weekly_hours = 40,
--   risk_tolerance = 'Medium'
-- WHERE user_id = (SELECT user_id FROM profiles LIMIT 1);
