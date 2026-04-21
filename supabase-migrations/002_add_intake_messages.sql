-- Add intake_messages column to user_progress
-- Stores the full multi-turn conversation between user and Dara during intake

ALTER TABLE user_progress ADD COLUMN IF NOT EXISTS intake_messages JSONB;
