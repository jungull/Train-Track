-- Supabase Postgres Migration for Program Templates & Cycles
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)

-- 1. Weekly Programs (Parent object for a 1 or 2 week cycle)
CREATE TABLE IF NOT EXISTS weekly_programs (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  cycle_weeks INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT false,
  anchor_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Program Cycle Days (Individual days within a program)
-- day_index is 0-6 for a 1 week program, or 0-13 for a 2 week program
CREATE TABLE IF NOT EXISTS program_cycle_days (
  id SERIAL PRIMARY KEY,
  program_id INTEGER REFERENCES weekly_programs(id) ON DELETE CASCADE,
  day_index INTEGER NOT NULL,
  title TEXT,
  exercises TEXT, -- JSON string
  UNIQUE(program_id, day_index)
);

-- 3. Day Templates (Saved templates that can be dropped onto any day)
CREATE TABLE IF NOT EXISTS day_templates (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  exercises TEXT, -- JSON string
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Seed Migration: Port existing program_days into a "Default Program"
DO $$
DECLARE
  new_prog_id INTEGER;
BEGIN
  -- Create the Default Program if no programs exist
  IF NOT EXISTS (SELECT 1 FROM weekly_programs) THEN
    INSERT INTO weekly_programs (title, cycle_weeks, is_active, anchor_date)
    VALUES ('Default Program', 1, true, (CURRENT_DATE - EXTRACT(DOW FROM CURRENT_DATE)::INTEGER))
    RETURNING id INTO new_prog_id;

    -- Migrate the legacy 7 days into the new program
    INSERT INTO program_cycle_days (program_id, day_index, title, exercises)
    SELECT new_prog_id, weekday, title, exercises
    FROM program_days;

    -- Create some default templates based on the user's current days
    INSERT INTO day_templates (title, exercises)
    SELECT title, exercises
    FROM program_days
    WHERE title != 'Rest'
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
