-- User Feedback Table
-- Stores bug reports and feedback submitted from any screen in the DARER app.

CREATE TABLE IF NOT EXISTS user_feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  screen TEXT NOT NULL,
  feedback_text TEXT NOT NULL,
  hero_name TEXT,
  darer_id TEXT,
  quest_state JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast lookups by user_id
CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON user_feedback(user_id);

-- Index for filtering by screen
CREATE INDEX IF NOT EXISTS idx_feedback_screen ON user_feedback(screen);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

ALTER TABLE user_feedback ENABLE ROW LEVEL SECURITY;

-- INSERT: users can insert their own feedback
CREATE POLICY "Users can insert their own feedback"
  ON user_feedback
  FOR INSERT
  WITH CHECK (user_id = auth.uid()::TEXT);

-- SELECT: users can view their own feedback
CREATE POLICY "Users can view their own feedback"
  ON user_feedback
  FOR SELECT
  USING (user_id = auth.uid()::TEXT);

-- NO UPDATE policy: feedback is immutable once submitted
-- NO DELETE policy: feedback cannot be removed
