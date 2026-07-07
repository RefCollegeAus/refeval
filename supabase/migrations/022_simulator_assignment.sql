-- Add simulator_session_id to learning_assignments
ALTER TABLE learning_assignments
  ADD COLUMN IF NOT EXISTS simulator_session_id uuid
    REFERENCES simulator_sessions(id) ON DELETE SET NULL;
