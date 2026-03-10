import express from 'express';
import Database from 'better-sqlite3';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

const db = new Database('fitness.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY,
    program_start_date TEXT,
    units TEXT,
    pushup_start_time TEXT,
    pushup_end_time TEXT,
    plank_start_time TEXT,
    plank_end_time TEXT,
    nag_interval INTEGER,
    pushup_start_reps INTEGER,
    pushup_weekly_add INTEGER,
    plank_start_sec INTEGER,
    plank_weekly_add INTEGER,
    emom_start INTEGER,
    emom_weekly_add INTEGER
  );

  INSERT OR IGNORE INTO settings (id, program_start_date, units, pushup_start_time, pushup_end_time, plank_start_time, plank_end_time, nag_interval, pushup_start_reps, pushup_weekly_add, plank_start_sec, plank_weekly_add, emom_start, emom_weekly_add)
  VALUES (1, date('now', 'localtime'), 'lb', '09:00', '21:00', '09:00', '21:00', 30, 12, 3, 20, 5, 7, 1);

  CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT UNIQUE,
    weekday INTEGER,
    bodyweight REAL,
    notes TEXT,
    created_at TEXT
  );

  CREATE TABLE IF NOT EXISTS set_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER,
    block_title TEXT,
    exercise_name TEXT,
    set_index INTEGER,
    weight REAL,
    reps INTEGER,
    rpe REAL,
    notes TEXT,
    FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS run_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER,
    block_title TEXT,
    run_type TEXT,
    target_pace TEXT,
    actual_pace TEXT,
    duration_seconds INTEGER,
    distance REAL,
    rpe REAL,
    notes TEXT,
    FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS emom_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER,
    block_title TEXT,
    target_reps INTEGER,
    minutes INTEGER,
    completed_minutes INTEGER,
    FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS gtg_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT,
    date TEXT,
    timestamp TEXT,
    target INTEGER,
    completed INTEGER,
    source TEXT
  );

  CREATE TABLE IF NOT EXISTS program_days (
    weekday INTEGER PRIMARY KEY,
    title TEXT,
    exercises TEXT
  );

  INSERT OR IGNORE INTO program_days (weekday, title, exercises) VALUES
    (0, 'Rest', '[]'),
    (1, 'PULL + Legs', '[{"name":"Squats","sets":5,"reps":8},{"name":"Pull-ups","sets":3,"reps":10},{"name":"Rows","sets":2,"reps":10},{"name":"Curls","sets":2,"reps":10},{"name":"Rear Delt Flys","sets":3,"reps":20},{"name":"Shrugs","sets":4,"reps":12},{"name":"Light Jog (30 min)","sets":1,"reps":1}]'),
    (2, 'PUSH + Sprints', '[{"name":"250m Sprint","sets":4,"reps":1},{"name":"Bench Press","sets":3,"reps":8},{"name":"Flys","sets":2,"reps":15},{"name":"Overhead Press","sets":2,"reps":8},{"name":"Lateral Raises","sets":3,"reps":15},{"name":"Tricep Extensions","sets":2,"reps":12},{"name":"Hanging Leg Raises","sets":3,"reps":12}]'),
    (3, 'PULL / CORE', '[{"name":"Cable Crunch","sets":3,"reps":12},{"name":"Reverse Incline Crunches","sets":3,"reps":15},{"name":"Planks","sets":3,"reps":60},{"name":"Pull-ups","sets":2,"reps":10},{"name":"Rear Delt Flys","sets":2,"reps":20}]'),
    (4, 'PUSH + Sprints', '[{"name":"250m Sprint","sets":4,"reps":1},{"name":"Incline Dumbbell Press","sets":3,"reps":10},{"name":"Flys","sets":2,"reps":15},{"name":"Overhead Press","sets":2,"reps":8},{"name":"Lateral Raises","sets":3,"reps":15},{"name":"Tricep Extensions","sets":2,"reps":12},{"name":"Hanging Leg Raises","sets":3,"reps":12}]'),
    (5, 'PULL + Posterior Chain', '[{"name":"Deadlifts","sets":5,"reps":5},{"name":"Row","sets":2,"reps":10},{"name":"Pull-ups","sets":2,"reps":10},{"name":"Curls","sets":2,"reps":10},{"name":"Rear Delt Flys","sets":3,"reps":20},{"name":"Shrugs","sets":4,"reps":12},{"name":"Light Jog (30 min)","sets":1,"reps":1}]'),
    (6, 'Circuit + Volume', '[{"name":"HIIT Circuit","sets":1,"reps":1},{"name":"Pushups","sets":3,"reps":20},{"name":"Curls","sets":3,"reps":15},{"name":"Side Raises","sets":3,"reps":20},{"name":"Tricep Extensions","sets":3,"reps":15},{"name":"Rear Delt Flys","sets":3,"reps":20},{"name":"Planks","sets":3,"reps":60}]');
`);

// Migrations: add GTG columns if missing
try { db.exec(`ALTER TABLE settings ADD COLUMN gtg_daily_target_sets INTEGER DEFAULT 5`); } catch { }
try { db.exec(`ALTER TABLE settings ADD COLUMN gtg_cooldown_minutes INTEGER DEFAULT 15`); } catch { }
try { db.exec(`ALTER TABLE settings ADD COLUMN gtg_pushup_enabled INTEGER DEFAULT 1`); } catch { }
try { db.exec(`ALTER TABLE settings ADD COLUMN gtg_plank_enabled INTEGER DEFAULT 1`); } catch { }

// Migrations: add categories and extra input fields to set_entries
try { db.exec(`ALTER TABLE set_entries ADD COLUMN category TEXT DEFAULT 'strength'`); } catch { }
try { db.exec(`ALTER TABLE set_entries ADD COLUMN distance REAL`); } catch { }
try { db.exec(`ALTER TABLE set_entries ADD COLUMN duration_seconds INTEGER`); } catch { }

const app = express();
app.use(express.json());

// Settings
app.get('/api/settings', (req, res) => {
  const settings = db.prepare('SELECT * FROM settings WHERE id = 1').get();
  res.json(settings);
});

app.put('/api/settings', (req, res) => {
  const b = req.body;
  db.prepare(`
    UPDATE settings SET
      program_start_date = ?, units = ?, pushup_start_time = ?, pushup_end_time = ?,
      plank_start_time = ?, plank_end_time = ?, nag_interval = ?,
      pushup_start_reps = ?, pushup_weekly_add = ?, plank_start_sec = ?, plank_weekly_add = ?,
      emom_start = ?, emom_weekly_add = ?,
      gtg_daily_target_sets = ?, gtg_cooldown_minutes = ?,
      gtg_pushup_enabled = ?, gtg_plank_enabled = ?
    WHERE id = 1
  `).run(
    b.program_start_date, b.units, b.pushup_start_time, b.pushup_end_time,
    b.plank_start_time, b.plank_end_time, b.nag_interval,
    b.pushup_start_reps, b.pushup_weekly_add, b.plank_start_sec, b.plank_weekly_add,
    b.emom_start, b.emom_weekly_add,
    b.gtg_daily_target_sets ?? 5, b.gtg_cooldown_minutes ?? 15,
    b.gtg_pushup_enabled ?? 1, b.gtg_plank_enabled ?? 1
  );
  res.json({ success: true });
});

// Program
app.get('/api/program', (req, res) => {
  const program = db.prepare('SELECT * FROM program_days ORDER BY weekday ASC').all();
  res.json(program);
});

app.put('/api/program/:weekday', (req, res) => {
  const { weekday } = req.params;
  const { title, exercises } = req.body;
  db.prepare('UPDATE program_days SET title = ?, exercises = ? WHERE weekday = ?').run(title, JSON.stringify(exercises), weekday);
  res.json({ success: true });
});

// Recent Exercises (for progressive overload recommendations)
app.get('/api/recent-exercises', (req, res) => {
  // Get the most recent set for each exercise
  const recent = db.prepare(`
    SELECT e.exercise_name, e.weight, e.reps, s.date
    FROM set_entries e
    JOIN sessions s ON e.session_id = s.id
    WHERE e.id IN (
      SELECT MAX(id) FROM set_entries GROUP BY exercise_name
    )
  `).all();
  res.json(recent);
});

// Best 1RM per exercise (Epley formula: weight × (1 + reps/30))
app.get('/api/best-1rm', (req, res) => {
  const rows = db.prepare(`
    SELECT exercise_name, weight, reps
    FROM set_entries
    WHERE weight > 0 AND reps > 0
  `).all() as { exercise_name: string; weight: number; reps: number }[];

  const best: Record<string, number> = {};
  for (const row of rows) {
    const e1rm = row.weight * (1 + row.reps / 30);
    if (!best[row.exercise_name] || e1rm > best[row.exercise_name]) {
      best[row.exercise_name] = Math.round(e1rm * 10) / 10;
    }
  }
  res.json(best);
});

// Sessions
app.get('/api/sessions/:date', (req, res) => {
  const { date } = req.params;
  const session = db.prepare('SELECT * FROM sessions WHERE date = ?').get(date) as any;
  if (!session) {
    return res.json(null);
  }
  const set_entries = db.prepare('SELECT * FROM set_entries WHERE session_id = ?').all(session.id);
  const run_entries = db.prepare('SELECT * FROM run_entries WHERE session_id = ?').all(session.id);
  const emom_entries = db.prepare('SELECT * FROM emom_entries WHERE session_id = ?').all(session.id);
  res.json({ ...session, set_entries, run_entries, emom_entries });
});

app.post('/api/sessions', (req, res) => {
  const { date, weekday, bodyweight, notes, set_entries, run_entries, emom_entries } = req.body;

  const transaction = db.transaction(() => {
    let session = db.prepare('SELECT id FROM sessions WHERE date = ?').get(date) as any;
    let sessionId;
    if (session) {
      sessionId = session.id;
      db.prepare('UPDATE sessions SET bodyweight = ?, notes = ? WHERE id = ?').run(bodyweight, notes, sessionId);
      db.prepare('DELETE FROM set_entries WHERE session_id = ?').run(sessionId);
      db.prepare('DELETE FROM run_entries WHERE session_id = ?').run(sessionId);
      db.prepare('DELETE FROM emom_entries WHERE session_id = ?').run(sessionId);
    } else {
      const result = db.prepare('INSERT INTO sessions (date, weekday, bodyweight, notes, created_at) VALUES (?, ?, ?, ?, datetime("now"))').run(date, weekday, bodyweight, notes);
      sessionId = result.lastInsertRowid;
    }

    if (set_entries && set_entries.length > 0) {
      const insertSet = db.prepare('INSERT INTO set_entries (session_id, block_title, exercise_name, set_index, weight, reps, rpe, notes, category, distance, duration_seconds) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
      for (const entry of set_entries) {
        insertSet.run(sessionId, entry.block_title, entry.exercise_name, entry.set_index, entry.weight, entry.reps, entry.rpe, entry.notes, entry.category || 'strength', entry.distance || null, entry.duration_seconds || null);
      }
    }

    if (run_entries && run_entries.length > 0) {
      const insertRun = db.prepare('INSERT INTO run_entries (session_id, block_title, run_type, target_pace, actual_pace, duration_seconds, distance, rpe, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
      for (const entry of run_entries) {
        insertRun.run(sessionId, entry.block_title, entry.run_type, entry.target_pace, entry.actual_pace, entry.duration_seconds, entry.distance, entry.rpe, entry.notes);
      }
    }

    if (emom_entries && emom_entries.length > 0) {
      const insertEmom = db.prepare('INSERT INTO emom_entries (session_id, block_title, target_reps, minutes, completed_minutes) VALUES (?, ?, ?, ?, ?)');
      for (const entry of emom_entries) {
        insertEmom.run(sessionId, entry.block_title, entry.target_reps, entry.minutes, entry.completed_minutes);
      }
    }
  });

  transaction();
  res.json({ success: true });
});

app.get('/api/history', (req, res) => {
  const sessions = db.prepare('SELECT * FROM sessions ORDER BY date DESC').all();
  res.json(sessions);
});

app.get('/api/progress', (req, res) => {
  const sessions = db.prepare('SELECT * FROM sessions ORDER BY date ASC').all();
  const set_entries = db.prepare('SELECT * FROM set_entries').all();
  const run_entries = db.prepare('SELECT * FROM run_entries').all();
  const gtg_events = db.prepare('SELECT * FROM gtg_events').all();
  res.json({ sessions, set_entries, run_entries, gtg_events });
});

// Exercise Log & Rename
app.get('/api/exercise-log', (req, res) => {
  const data = db.prepare(`
    SELECT e.*, s.date 
    FROM set_entries e
    JOIN sessions s ON e.session_id = s.id
    ORDER BY s.date DESC
  `).all();
  res.json(data);
});

app.post('/api/exercises/rename', (req, res) => {
  const { oldName, newName } = req.body;
  db.prepare('UPDATE set_entries SET exercise_name = ? WHERE exercise_name = ?').run(newName, oldName);
  res.json({ success: true });
});

// GTG
app.get('/api/gtg/:date', (req, res) => {
  const { date } = req.params;
  const events = db.prepare('SELECT * FROM gtg_events WHERE date = ?').all(date);
  res.json(events);
});

app.get('/api/gtg-history', (req, res) => {
  const rows = db.prepare(`
    SELECT date, type,
      COUNT(*) as sets_completed,
      SUM(completed) as total_volume
    FROM gtg_events
    WHERE source = 'app' AND completed > 0
    GROUP BY date, type
    ORDER BY date DESC
  `).all();
  res.json(rows);
});

app.post('/api/gtg', (req, res) => {
  const { type, date, timestamp, target, completed, source } = req.body;
  db.prepare('INSERT INTO gtg_events (type, date, timestamp, target, completed, source) VALUES (?, ?, ?, ?, ?, ?)').run(type, date, timestamp, target, completed, source);
  res.json({ success: true });
});

// AI Insights
app.post('/api/ai/insights', async (req, res) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const { history } = req.body;
    const prompt = `Analyze this fitness history and provide a short "Today focus" (1 sentence) and a weekly summary of what improved/stalled in 3 bullet points. Data: ${JSON.stringify(history)}`;
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    res.json({ insights: response.text });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
  }

  const PORT = 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
