-- Add game_date column to reviews table
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS game_date date;
