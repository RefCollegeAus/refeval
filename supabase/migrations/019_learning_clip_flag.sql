-- Phase 15.8b: Add is_learning_clip boolean flag to clips table
ALTER TABLE clips ADD COLUMN IF NOT EXISTS is_learning_clip boolean NOT NULL DEFAULT false;
