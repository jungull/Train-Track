-- Supabase Postgres Schema for Fitness Logger
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)

-- Settings (single row for app configuration)
CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  program_start_date DATE DEFAULT CURRENT_DATE,
  units TEXT DEFAULT 'lb',
  pushup_start_time TEXT DEFAULT '09:00',
  pushup_end_time TEXT DEFAULT '21:00',
  plank_start_time TEXT DEFAULT '09:00',
  plank_end_time TEXT DEFAULT '21:00',
  nag_interval INTEGER DEFAULT 30,
  pushup_start_reps INTEGER DEFAULT 12,
  pushup_weekly_add INTEGER DEFAULT 3,
  plank_start_sec INTEGER DEFAULT 20,
  plank_weekly_add INTEGER DEFAULT 5,
  emom_start INTEGER DEFAULT 7,
  emom_weekly_add INTEGER DEFAULT 1,
  gtg_daily_target_sets INTEGER DEFAULT 5,
  gtg_cooldown_minutes INTEGER DEFAULT 15,
  gtg_pushup_enabled INTEGER DEFAULT 1,
  gtg_plank_enabled INTEGER DEFAULT 1
);

-- Seed default settings row
INSERT INTO settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- Workout sessions
CREATE TABLE IF NOT EXISTS sessions (
  id SERIAL PRIMARY KEY,
  date TEXT UNIQUE NOT NULL,
  weekday INTEGER,
  bodyweight REAL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Set entries (strength, bodyweight, sprint, interval, timed)
CREATE TABLE IF NOT EXISTS set_entries (
  id SERIAL PRIMARY KEY,
  session_id INTEGER REFERENCES sessions(id) ON DELETE CASCADE,
  block_title TEXT,
  exercise_name TEXT,
  set_index INTEGER,
  weight REAL,
  reps INTEGER,
  rpe REAL,
  notes TEXT,
  category TEXT DEFAULT 'strength',
  distance REAL,
  duration_seconds INTEGER
);

-- Run entries
CREATE TABLE IF NOT EXISTS run_entries (
  id SERIAL PRIMARY KEY,
  session_id INTEGER REFERENCES sessions(id) ON DELETE CASCADE,
  block_title TEXT,
  run_type TEXT,
  target_pace TEXT,
  actual_pace TEXT,
  duration_seconds INTEGER,
  distance REAL,
  rpe REAL,
  notes TEXT
);

-- EMOM entries
CREATE TABLE IF NOT EXISTS emom_entries (
  id SERIAL PRIMARY KEY,
  session_id INTEGER REFERENCES sessions(id) ON DELETE CASCADE,
  block_title TEXT,
  target_reps INTEGER,
  minutes INTEGER,
  completed_minutes INTEGER
);

-- GTG events
CREATE TABLE IF NOT EXISTS gtg_events (
  id SERIAL PRIMARY KEY,
  type TEXT,
  date TEXT,
  timestamp TEXT,
  target INTEGER,
  completed INTEGER,
  source TEXT
);

-- Program days (0=Sunday .. 6=Saturday)
CREATE TABLE IF NOT EXISTS program_days (
  weekday INTEGER PRIMARY KEY,
  title TEXT,
  exercises TEXT  -- JSON string
);

-- Seed default program
INSERT INTO program_days (weekday, title, exercises) VALUES
  (0, 'Rest', '[]'),
  (1, 'PULL + Legs', '[{"name":"Squats","sets":5,"reps":8},{"name":"Pull-ups","sets":3,"reps":10},{"name":"Rows","sets":2,"reps":10},{"name":"Curls","sets":2,"reps":10},{"name":"Rear Delt Flys","sets":3,"reps":20},{"name":"Shrugs","sets":4,"reps":12},{"name":"Light Jog (30 min)","sets":1,"reps":1}]'),
  (2, 'PUSH + Sprints', '[{"name":"250m Sprint","sets":4,"reps":1},{"name":"Bench Press","sets":3,"reps":8},{"name":"Flys","sets":2,"reps":15},{"name":"Overhead Press","sets":2,"reps":8},{"name":"Lateral Raises","sets":3,"reps":15},{"name":"Tricep Extensions","sets":2,"reps":12},{"name":"Hanging Leg Raises","sets":3,"reps":12}]'),
  (3, 'PULL / CORE', '[{"name":"Cable Crunch","sets":3,"reps":12},{"name":"Reverse Incline Crunches","sets":3,"reps":15},{"name":"Planks","sets":3,"reps":60},{"name":"Pull-ups","sets":2,"reps":10},{"name":"Rear Delt Flys","sets":2,"reps":20}]'),
  (4, 'PUSH + Sprints', '[{"name":"250m Sprint","sets":4,"reps":1},{"name":"Incline Dumbbell Press","sets":3,"reps":10},{"name":"Flys","sets":2,"reps":15},{"name":"Overhead Press","sets":2,"reps":8},{"name":"Lateral Raises","sets":3,"reps":15},{"name":"Tricep Extensions","sets":2,"reps":12},{"name":"Hanging Leg Raises","sets":3,"reps":12}]'),
  (5, 'PULL + Posterior Chain', '[{"name":"Deadlifts","sets":5,"reps":5},{"name":"Row","sets":2,"reps":10},{"name":"Pull-ups","sets":2,"reps":10},{"name":"Curls","sets":2,"reps":10},{"name":"Rear Delt Flys","sets":3,"reps":20},{"name":"Shrugs","sets":4,"reps":12},{"name":"Light Jog (30 min)","sets":1,"reps":1}]'),
  (6, 'Circuit + Volume', '[{"name":"HIIT Circuit","sets":1,"reps":1},{"name":"Pushups","sets":3,"reps":20},{"name":"Curls","sets":3,"reps":15},{"name":"Side Raises","sets":3,"reps":20},{"name":"Tricep Extensions","sets":3,"reps":15},{"name":"Rear Delt Flys","sets":3,"reps":20},{"name":"Planks","sets":3,"reps":60}]')
ON CONFLICT (weekday) DO NOTHING;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_set_entries_session ON set_entries(session_id);
CREATE INDEX IF NOT EXISTS idx_set_entries_exercise ON set_entries(exercise_name);
CREATE INDEX IF NOT EXISTS idx_sessions_date ON sessions(date);
CREATE INDEX IF NOT EXISTS idx_gtg_events_date ON gtg_events(date);
