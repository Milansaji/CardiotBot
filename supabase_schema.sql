-- ============================================================
-- SUPABASE SCHEMA: WHATSAPP CRM (Auth & Agents Edition)
-- Run this in Supabase SQL Editor to set up/reset the database.
-- ============================================================

-- 1. Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create PROFILES table (Linked to Auth Users)
-- This replaces the old 'agents' table. Users signed up via Supabase Auth will appear here.
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'agent' CHECK (role IN ('admin', 'agent')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create WORKFLOWS table (Created first so contacts can reference it)
CREATE TABLE IF NOT EXISTS workflows (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  trigger_after_days INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create CONTACTS table
CREATE TABLE IF NOT EXISTS contacts (
  id BIGSERIAL PRIMARY KEY,
  phone_number TEXT UNIQUE NOT NULL,
  profile_name TEXT,
  last_message_at BIGINT,
  unread_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'ongoing' CHECK (status IN ('ongoing', 'converted', 'rejected', 'human_takeover', 'follow_up')),
  lead_temperature TEXT DEFAULT 'warm' CHECK (lead_temperature IN ('hot', 'warm', 'cold')),
  button_click_count INTEGER DEFAULT 0,
  
  -- Foreign Keys
  workflow_id BIGINT REFERENCES workflows(id) ON DELETE SET NULL, -- Fixed Missing FK
  workflow_step INTEGER DEFAULT 0,
  workflow_paused BOOLEAN DEFAULT FALSE,
  last_workflow_sent_at BIGINT,
  
  -- Agent Assignment (References Profiles now)
  assigned_agent_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create MESSAGES table
CREATE TABLE IF NOT EXISTS messages (
  id BIGSERIAL PRIMARY KEY,
  whatsapp_message_id TEXT UNIQUE,
  from_number TEXT NOT NULL,
  profile_name TEXT,
  message_type TEXT DEFAULT 'text',
  message_text TEXT,
  media_id TEXT,
  media_url TEXT,
  media_mime_type TEXT,
  timestamp BIGINT,
  received_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW()),
  status TEXT DEFAULT 'received',
  is_read BOOLEAN DEFAULT FALSE,
  direction TEXT DEFAULT 'incoming',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Create SEGMENTS table
CREATE TABLE IF NOT EXISTS segments (
  id BIGSERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  contact_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Create CONTACT_SEGMENTS (Junction)
CREATE TABLE IF NOT EXISTS contact_segments (
  id BIGSERIAL PRIMARY KEY,
  contact_id BIGINT NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  segment_id BIGINT NOT NULL REFERENCES segments(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(contact_id, segment_id)
);

-- 8. Create TEMPLATE_MESSAGES table
CREATE TABLE IF NOT EXISTS template_messages (
  id BIGSERIAL PRIMARY KEY,
  template_name TEXT NOT NULL,
  segment_id BIGINT REFERENCES segments(id),
  total_sent INTEGER DEFAULT 0,
  total_failed INTEGER DEFAULT 0,
  total_delivered INTEGER DEFAULT 0,
  total_read INTEGER DEFAULT 0,
  total_clicked INTEGER DEFAULT 0,
  sent_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Create BUTTON_INTERACTIONS table
CREATE TABLE IF NOT EXISTS button_interactions (
  id BIGSERIAL PRIMARY KEY,
  contact_id BIGINT NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  message_id TEXT NOT NULL,
  button_text TEXT,
  clicked_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Create WORKFLOW_STEPS table
CREATE TABLE IF NOT EXISTS workflow_steps (
  id BIGSERIAL PRIMARY KEY,
  workflow_id BIGINT NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  delay_hours INTEGER NOT NULL,
  template_name TEXT NOT NULL,
  template_language TEXT DEFAULT 'en_US',
  template_components JSONB
);

-- 11. Create WORKFLOW_LOGS table
CREATE TABLE IF NOT EXISTS workflow_logs (
  id BIGSERIAL PRIMARY KEY,
  contact_id BIGINT NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  workflow_id BIGINT NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  step_id BIGINT NOT NULL REFERENCES workflow_steps(id) ON DELETE CASCADE,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'sent',
  error_message TEXT
);

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Function to handle new user signup (Auto-create profile)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Stats RPC Functions (For Dashboard Performance)
CREATE OR REPLACE FUNCTION get_status_breakdown()
RETURNS TABLE (status text, count bigint)
LANGUAGE sql
AS $$
  SELECT status, COUNT(*) as count
  FROM contacts
  GROUP BY status;
$$;

CREATE OR REPLACE FUNCTION get_temperature_breakdown()
RETURNS TABLE (lead_temperature text, count bigint)
LANGUAGE sql
AS $$
  SELECT lead_temperature, COUNT(*) as count
  FROM contacts
  GROUP BY lead_temperature;
$$;

CREATE OR REPLACE FUNCTION get_total_unread_count()
RETURNS bigint
LANGUAGE sql
AS $$
  SELECT COALESCE(SUM(unread_count), 0)
  FROM contacts;
$$;

-- Segment Count Trigger
CREATE OR REPLACE FUNCTION update_segment_contact_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE segments SET contact_count = contact_count + 1 WHERE id = NEW.segment_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE segments SET contact_count = GREATEST(contact_count - 1, 0) WHERE id = OLD.segment_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_segment_count ON contact_segments;
CREATE TRIGGER trigger_update_segment_count
  AFTER INSERT OR DELETE ON contact_segments
  FOR EACH ROW EXECUTE FUNCTION update_segment_contact_count();

-- ============================================================
-- RLS POLICIES (Security)
-- ============================================================

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;

-- Profiles: Public read, Self update
CREATE POLICY "Public profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Other Tables: Authenticated users full access (for now)
CREATE POLICY "Auth users full access contacts" ON contacts FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth users full access messages" ON messages FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth users full access segments" ON segments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth users full access workflows" ON workflows FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- DONE
-- ============================================================
