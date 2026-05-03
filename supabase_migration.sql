-- DARER Journey: 2026-05-08 Schema Migration
-- Run in Supabase SQL Editor to add normalized tables alongside existing user_progress blob.
-- These tables are write-through mirrors for analytics, querying, and data portability.
-- The user_progress JSON blob remains for fast resume-anywhere reads.

--------------------------------------------------------------------------------
-- 1. battles — individual battle/exposure records (replaces battle_history array)
--------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS battles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  boss_id text,
  boss_name text,
  boss_desc text,
  outcome text CHECK (outcome IN ('victory', 'partial', 'retreat')),
  date timestamptz DEFAULT now(),
  suds_before int,
  suds_after int,
  prep_value text,
  prep_allow_summary text,
  decide_selected_vals jsonb,
  decide_custom text,
  allow_fearful text,
  allow_likelihood int,
  allow_severity int,
  allow_can_handle text,
  allow_fear_showing text,
  allow_physical_sensations jsonb,
  allow_custom_sensation text,
  exposure_when text,
  exposure_where text,
  exposure_armory text,
  exposure_scheduled_time text,
  loot_text text,
  loot_image_url text,
  feared_happened text,
  feared_severity text,
  made_it_through text,
  engage_free_text text,
  repeat_choice text,
  xp_earned int DEFAULT 0,
  dara_letter text,
  suds_drop int GENERATED ALWAYS AS (suds_before - suds_after) STORED,
  is_tutorial boolean DEFAULT false,
  battle_chat_message_count int DEFAULT 0,
  mastery_level text,
  attempts int DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_battles_user ON battles(user_id);
CREATE INDEX IF NOT EXISTS idx_battles_user_date ON battles(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_battles_outcome ON battles(user_id, outcome);

-- RLS policies
ALTER TABLE battles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own battles"
  ON battles FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own battles"
  ON battles FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own battles"
  ON battles FOR UPDATE USING (auth.uid() = user_id);

--------------------------------------------------------------------------------
-- 2. armory_practice — practice session tracking
--------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS armory_practice (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  tool_id text NOT NULL,
  tool_name text,
  duration_seconds int DEFAULT 0,
  completed boolean DEFAULT false,
  date timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_practice_user ON armory_practice(user_id);
CREATE INDEX IF NOT EXISTS idx_practice_user_date ON armory_practice(user_id, date DESC);

ALTER TABLE armory_practice ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own practice"
  ON armory_practice FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own practice"
  ON armory_practice FOR INSERT WITH CHECK (auth.uid() = user_id);

--------------------------------------------------------------------------------
-- 3. values_data — values exploration session (guide answers + selections)
--------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS values_data (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  guide_answers jsonb,
  selected_values jsonb,
  custom_value text,
  ai_generated_values jsonb,
  completed_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_values_user ON values_data(user_id);

ALTER TABLE values_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own values data"
  ON values_data FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own values data"
  ON values_data FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own values data"
  ON values_data FOR UPDATE USING (auth.uid() = user_id);
