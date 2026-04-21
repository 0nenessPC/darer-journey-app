-- NDA Agreements Table
-- Stores legally binding confidentiality agreement records for each user.
-- Records are immutable: no UPDATE or DELETE allowed.

CREATE TABLE IF NOT EXISTS nda_agreements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  agreement_version TEXT NOT NULL,
  agreement_text TEXT NOT NULL,
  ip_address TEXT,
  signed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_agent TEXT,
  participant_name TEXT NOT NULL,
  darer_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast lookups by user_id
CREATE INDEX IF NOT EXISTS idx_nda_user_id ON nda_agreements(user_id);

-- Index for checking latest agreement by user and version
CREATE INDEX IF NOT EXISTS idx_nda_user_version ON nda_agreements(user_id, agreement_version);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS
ALTER TABLE nda_agreements ENABLE ROW LEVEL SECURITY;

-- INSERT: users can insert their own agreement
CREATE POLICY "Users can insert their own NDA agreement"
  ON nda_agreements
  FOR INSERT
  WITH CHECK (user_id = auth.uid()::TEXT);

-- SELECT: users can only read their own agreements
CREATE POLICY "Users can view their own NDA agreements"
  ON nda_agreements
  FOR SELECT
  USING (user_id = auth.uid()::TEXT);

-- NO UPDATE policy: agreements are immutable once signed
-- NO DELETE policy: agreements cannot be removed
