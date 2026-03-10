-- Run this in Supabase SQL editor to enable nutrition history + calories charts.
CREATE TABLE IF NOT EXISTS nutrition_history (
  id SERIAL PRIMARY KEY,
  date TEXT UNIQUE NOT NULL,
  weekday TEXT,
  protein_grams INTEGER,
  carbs_grams INTEGER,
  fat_grams INTEGER,
  calories INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO nutrition_history (date, weekday, protein_grams, carbs_grams, fat_grams, calories) VALUES
  ('2026-02-20', 'Friday', 107, 211, 130, 2454),
  ('2026-02-23', 'Monday', 88, 104, 41, 1137),
  ('2026-02-24', 'Tuesday', 88, 164, 24, 1192),
  ('2026-02-25', 'Wednesday', 185, 202, 79, 2267),
  ('2026-02-26', 'Thursday', 200, 230, 92, 2468),
  ('2026-02-27', 'Friday', 133, 262, 60, 2096),
  ('2026-03-02', 'Monday', 177, 227, 118, 2702),
  ('2026-03-03', 'Tuesday', 120, 247, 73, 2117),
  ('2026-03-04', 'Wednesday', 176, 114, 76, 1844),
  ('2026-03-05', 'Thursday', 226, 348, 127, 3475),
  ('2026-03-09', 'Monday', 168, 148, 75, 1947)
ON CONFLICT (date) DO UPDATE SET
  weekday = EXCLUDED.weekday,
  protein_grams = EXCLUDED.protein_grams,
  carbs_grams = EXCLUDED.carbs_grams,
  fat_grams = EXCLUDED.fat_grams,
  calories = EXCLUDED.calories;
