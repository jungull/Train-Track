import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database(path.join(__dirname, 'fitness.db'));

// Create tables if they don't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY, program_start_date TEXT, units TEXT,
    pushup_start_time TEXT, pushup_end_time TEXT, plank_start_time TEXT, plank_end_time TEXT,
    nag_interval INTEGER, pushup_start_reps INTEGER, pushup_weekly_add INTEGER,
    plank_start_sec INTEGER, plank_weekly_add INTEGER, emom_start INTEGER, emom_weekly_add INTEGER
  );
  INSERT OR IGNORE INTO settings (id, program_start_date, units, pushup_start_time, pushup_end_time, plank_start_time, plank_end_time, nag_interval, pushup_start_reps, pushup_weekly_add, plank_start_sec, plank_weekly_add, emom_start, emom_weekly_add)
  VALUES (1, '2026-01-26', 'lb', '09:00', '21:00', '09:00', '21:00', 30, 12, 3, 20, 5, 7, 1);
  CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT UNIQUE, weekday INTEGER, bodyweight REAL, notes TEXT, created_at TEXT
  );
  CREATE TABLE IF NOT EXISTS set_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT, session_id INTEGER, block_title TEXT, exercise_name TEXT,
    set_index INTEGER, weight REAL, reps INTEGER, rpe REAL, notes TEXT,
    FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS run_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT, session_id INTEGER, block_title TEXT, run_type TEXT,
    target_pace TEXT, actual_pace TEXT, duration_seconds INTEGER, distance REAL, rpe REAL, notes TEXT,
    FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS emom_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT, session_id INTEGER, block_title TEXT,
    target_reps INTEGER, minutes INTEGER, completed_minutes INTEGER,
    FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS gtg_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT, type TEXT, date TEXT, timestamp TEXT, target INTEGER, completed INTEGER, source TEXT
  );
  CREATE TABLE IF NOT EXISTS program_days (weekday INTEGER PRIMARY KEY, title TEXT, exercises TEXT);
  INSERT OR IGNORE INTO program_days (weekday, title, exercises) VALUES
    (0, 'Rest', '[]'),
    (1, 'PULL + Legs', '[{"name":"Squats","sets":5,"reps":8},{"name":"Pull-ups","sets":3,"reps":10},{"name":"Rows","sets":2,"reps":10},{"name":"Curls","sets":2,"reps":10},{"name":"Rear Delt Flys","sets":3,"reps":20},{"name":"Shrugs","sets":4,"reps":12},{"name":"Light Jog (30 min)","sets":1,"reps":1}]'),
    (2, 'PUSH + Sprints', '[{"name":"250m Sprint","sets":4,"reps":1},{"name":"Bench Press","sets":3,"reps":8},{"name":"Flys","sets":2,"reps":15},{"name":"Overhead Press","sets":2,"reps":8},{"name":"Lateral Raises","sets":3,"reps":15},{"name":"Tricep Extensions","sets":2,"reps":12},{"name":"Hanging Leg Raises","sets":3,"reps":12}]'),
    (3, 'PULL / CORE', '[{"name":"Cable Crunch","sets":3,"reps":12},{"name":"Reverse Incline Crunches","sets":3,"reps":15},{"name":"Planks","sets":3,"reps":60},{"name":"Pull-ups","sets":2,"reps":10},{"name":"Rear Delt Flys","sets":2,"reps":20}]'),
    (4, 'PUSH + Sprints', '[{"name":"250m Sprint","sets":4,"reps":1},{"name":"Incline Dumbbell Press","sets":3,"reps":10},{"name":"Flys","sets":2,"reps":15},{"name":"Overhead Press","sets":2,"reps":8},{"name":"Lateral Raises","sets":3,"reps":15},{"name":"Tricep Extensions","sets":2,"reps":12},{"name":"Hanging Leg Raises","sets":3,"reps":12}]'),
    (5, 'PULL + Posterior Chain', '[{"name":"Deadlifts","sets":5,"reps":5},{"name":"Row","sets":2,"reps":10},{"name":"Pull-ups","sets":2,"reps":10},{"name":"Curls","sets":2,"reps":10},{"name":"Rear Delt Flys","sets":3,"reps":20},{"name":"Shrugs","sets":4,"reps":12},{"name":"Light Jog (30 min)","sets":1,"reps":1}]'),
    (6, 'Circuit + Volume', '[{"name":"HIIT Circuit","sets":1,"reps":1},{"name":"Pushups","sets":3,"reps":20},{"name":"Curls","sets":3,"reps":15},{"name":"Side Raises","sets":3,"reps":20},{"name":"Tricep Extensions","sets":3,"reps":15},{"name":"Rear Delt Flys","sets":3,"reps":20},{"name":"Planks","sets":3,"reps":60}]');
`);

// Prepared statements
const ins = {
    session: db.prepare(`INSERT OR REPLACE INTO sessions (date, weekday, bodyweight, notes, created_at) VALUES (?, ?, ?, ?, datetime('now'))`),
    set: db.prepare('INSERT INTO set_entries (session_id, block_title, exercise_name, set_index, weight, reps, rpe, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'),
    run: db.prepare('INSERT INTO run_entries (session_id, block_title, run_type, target_pace, actual_pace, duration_seconds, distance, rpe, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'),
    gtg: db.prepare('INSERT INTO gtg_events (type, date, timestamp, target, completed, source) VALUES (?, ?, ?, ?, ?, ?)'),
    emom: db.prepare('INSERT INTO emom_entries (session_id, block_title, target_reps, minutes, completed_minutes) VALUES (?, ?, ?, ?, ?)'),
};

// Helpers
type SetData = [string, number, number, number | null, string | null]; // [exercise, weight, reps, rpe, notes]
type RunData = [string, string, string | null, string | null, number | null, number | null, number | null, string | null]; // [block, type, targetPace, actualPace, duration, distance, rpe, notes]

function addSession(
    date: string, weekday: number, bw: number | null, notes: string,
    sets?: SetData[], runs?: RunData[],
    gtgs?: [string, number, number][], // [type, target, completed]
    emoms?: [string, number, number, number][] // [block, targetReps, minutes, completedMinutes]
) {
    const sid = ins.session.run(date, weekday, bw, notes).lastInsertRowid;
    if (sets) {
        const counts: Record<string, number> = {};
        for (const [ex, w, r, rpe, n] of sets) {
            counts[ex] = (counts[ex] || 0) + 1;
            ins.set.run(sid, notes, ex, counts[ex], w, r, rpe, n);
        }
    }
    if (runs) {
        for (const [block, type, tp, ap, dur, dist, rpe, n] of runs) {
            ins.run.run(sid, block, type, tp, ap, dur, dist, rpe, n);
        }
    }
    if (gtgs) {
        for (const [type, target, completed] of gtgs) {
            ins.gtg.run(type, date, date + 'T12:00:00', target, completed, 'seed');
        }
    }
    if (emoms) {
        for (const [block, target, mins, completed] of emoms) {
            ins.emom.run(sid, block, target, mins, completed);
        }
    }
}

// Helper to repeat a set entry N times
function rep(ex: string, w: number, r: number, n: number, rpe?: number | null, note?: string | null): SetData[] {
    return Array.from({ length: n }, () => [ex, w, r, rpe ?? null, note ?? null] as SetData);
}

const seed = db.transaction(() => {
    // ===== Session 1: 2026-01-29 Thu — Baseline PT =====
    addSession('2026-01-29', 4, null, 'Baseline PT', [
        ['Push-ups', 0, 28, null, '2:00 time cap'],
        ['Plank', 0, 64, null, '1:04 hold'],
        ['Pull-ups', 0, 7, null, '1:00 time cap'],
    ], [
        ['Baseline PT', 'timed', null, '7:30/mi', 450, 1.0, null, '1 mile run'],
    ], [
        ['pushup', 20, 20], ['pushup', 20, 20], ['pushup', 20, 20], ['pushup', 20, 20],
        ['plank', 45, 45], ['plank', 45, 45], ['plank', 45, 45],
    ]);

    // ===== Session 2: 2026-01-30 Fri — Treadmill intervals attempt =====
    addSession('2026-01-30', 5, null, 'Treadmill intervals attempt', [
        ['Push-ups', 0, 15, null, 'post-intervals'],
        ['Plank', 0, 30, null, '30s post-intervals'],
    ], [
        ['Warm-up', 'easy', null, '9:30/mi', 600, null, null, '10:00 warm-up'],
        ['Intervals', 'interval', null, null, null, null, null, '1:00 on/off: 10:00/9:30/6:20/10:00/6:20/11:00/7:00/11:00 (stopped—fatigue)'],
    ]);

    // ===== Session 3: 2026-01-31 Sat — No treadmill =====
    addSession('2026-01-31', 6, null, 'No treadmill', [
        ...rep('Push-ups', 0, 12, 2, null, 'GTG AM'),
        ...rep('Push-ups', 0, 15, 4, null, '1:30 rest; hard at end'),
        ...rep('Plank', 0, 40, 10, null, '0:40 on / 1:00 off'),
    ], [
        ['Jump Rope', 'cardio', null, null, 1200, null, null, '20:00; frequent misses'],
    ]);

    // ===== Session 4: 2026-02-02 Mon — Gym (speed attempt + calis) =====
    addSession('2026-02-02', 1, null, 'Gym (speed attempt + calis)', [
        ['Push-ups', 0, 15, null, null], ['Push-ups', 0, 15, null, null],
        ['Push-ups', 0, 15, null, null], ['Push-ups', 0, 15, null, null],
        ['Push-ups', 0, 10, null, null],
        ['Pull-ups', 0, 3, null, null], ['Pull-ups', 0, 3, null, null], ['Pull-ups', 0, 2, null, null],
        ...rep('Plank', 0, 30, 5, null, '1:00 rest'),
    ], [
        ['Treadmill', 'easy', null, '8:30/mi', 600, null, null, 'warm-up 10:00'],
        ['Strides', 'interval', null, null, null, null, null, '20s @ 7:00/mi / 40s @ 8:00/mi'],
        ['Intervals', 'interval', null, '6:40/mi', null, null, null, '2:00 on/off × 2 reps (gassed)'],
    ]);

    // ===== Session 5: 2026-02-03 Tue — Gym (easy run + upper) BW: 204 =====
    addSession('2026-02-03', 2, 204, 'Gym (easy run + upper)', [
        ...rep('Bench Press', 175, 6, 4),
        ...rep('Pull-ups', 0, 3, 4),
        ['Cable Row', 150, 8, null, 'near max'],
        ['Cable Row', 120, 10, null, null], ['Cable Row', 120, 8, null, null], ['Cable Row', 120, 10, null, null],
        ['Dead Bugs', 0, 6, null, '6/side; stopped—low back'],
        ...rep('McGill Curl-up', 0, 10, 4, null, '10s hold'),
        ['Side Plank', 0, 30, null, 'L side'], ['Side Plank', 0, 30, null, 'R side'],
    ], [
        ['Easy Run', 'easy', null, '9:00/mi', 1800, 3.33, null, '30:00; hamstrings tight after'],
    ]);

    // ===== Session 6: 2026-02-05 Thu — Easy + posterior chain + light calis BW: 204 =====
    addSession('2026-02-05', 4, 204, 'Easy + posterior chain + light calis', [
        ['Back Extensions', 0, 1, 8.5, 'isometric 2:00'],
        ['Back Extensions', 0, 10, null, 'slow'],
        ...rep('Push-ups', 0, 20, 3, null, 'easy'),
        ...rep('Plank', 0, 30, 3, null, 'easy'),
    ], [
        ['Easy Run', 'easy', null, '9:22/mi', 1800, null, null, '30:00; HR 144→170 drift'],
    ]);

    // ===== Session 7: 2026-02-06 Fri — Intervals + core + push-ups BW: 202 =====
    addSession('2026-02-06', 5, 202, 'Intervals + core + push-ups (incline 1%)', [
        ['Plank', 0, 60, null, '2:00 rest'], ['Plank', 0, 60, null, '2:00 rest'], ['Plank', 0, 60, 9, 'last rep RPE 9'],
        ['Push-ups', 0, 17, null, '1:00 rest'], ['Push-ups', 0, 17, null, '1:00 rest'],
        ['Push-ups', 0, 12, null, '1:00 rest'], ['Push-ups', 0, 10, null, null],
    ], [
        ['Warm-up', 'easy', null, '10:00/mi', 480, null, null, '~8:00 + leg swings'],
        ['Intervals', 'interval', '7:30/mi', '7:30/mi', null, null, null, '4 cycles: 2:00 @ 10:00/mi + 2:00 @ 7:30/mi'],
        ['Recovery', 'easy', null, '17:00/mi', 120, null, null, 'recovery walk'],
        ['Final Fast', 'interval', null, '7:30/mi', 120, null, null, 'final 2:00 fast'],
        ['Cooldown', 'easy', null, '10:30/mi', 480, null, null, '8:00 cooldown'],
    ]);

    // ===== Session 8: 2026-02-07 Sat — Mock PRT BW: 206 =====
    addSession('2026-02-07', 6, 206, 'Mock PRT (strict push-up position)', [
        ['Push-ups', 0, 30, null, '1:00 time cap; stayed in position'],
        ['Plank', 0, 86, null, '1:26 hold'],
    ], [
        ['Mock PRT', 'timed', null, '7:20/mi', 659, 1.5, null, '1.5 mi in 10:59'],
    ]);

    // ===== Session 9: 2026-02-10 Tue — Indoor track + upper BW: 203 =====
    addSession('2026-02-10', 2, 203, 'Indoor track + upper + delts/curls + core', [
        ...rep('Bench Press', 155, 8, 4),
        ...rep('Pull-ups', 0, 2, 4),
        ['Cable Row', 100, 10, 9, 'too heavy'],
        ['Cable Row', 90, 10, null, null], ['Cable Row', 90, 12, null, null],
        ['Push-ups', 0, 10, null, null], ['Push-ups', 0, 10, null, null],
        ...rep('Plank', 0, 20, 3, null, '1:00 rest'),
        ...rep('Lateral Raises', 0, 10, 3, null, 'delt/curl loop; weight not logged'),
        ...rep('Reverse Pec Deck', 0, 10, 3, null, 'delt/curl loop; weight not logged'),
        ...rep('DB Curls', 0, 10, 3, null, 'delt/curl loop; weight not logged'),
    ], [
        ['Indoor Track', 'easy', null, null, null, null, null, 'attempted jog → walked (overfull stomach + legs tired)'],
    ]);

    // ===== Session 10: 2026-02-11 Wed — Tempo BW: 202 =====
    addSession('2026-02-11', 3, 202, 'Tempo', [], [
        ['Warm-up', 'easy', null, null, 300, null, null, '5:00 walk/jog'],
        ['Tempo', 'tempo', '8:00/mi', '8:00/mi', 720, null, 6.5, '12:00 @ 7.5 mph; felt good; no tightness'],
    ]);

    // ===== Session 11: 2026-02-12 Thu — Knee management + pull-ups + delts =====
    addSession('2026-02-12', 4, null, 'Knee management + pull-ups + delts', [
        ['Pull-ups', 0, 9, null, 'ladder 1-2-3-2-1'],
        ['Pull-ups', 0, 9, null, 'ladder 1-2-3-2-1'],
        ['Pull-ups', 0, 6, null, 'ladder 1-2-2-1'],
        ['Lateral Raises', 0, 0, null, 'weight/reps not logged'],
        ['Rear Delt Flys', 0, 0, null, 'weight/reps not logged'],
    ], [
        ['Treadmill', 'easy', null, '9:30/mi', 600, null, null, '10:00; stopped—below-kneecap soreness'],
        ['Bike', 'easy', null, null, 900, null, null, '15:00 easy'],
    ]);

    // ===== Session 12: 2026-02-16 Mon — Intervals + core (incline 1%) =====
    addSession('2026-02-16', 1, null, 'Intervals + core (incline 1%)', [
        ['Plank', 0, 60, null, '2:00 rest'], ['Plank', 0, 60, null, '2:00 rest'], ['Plank', 0, 60, null, 'last shaky'],
        ['Side Plank', 0, 45, null, 'L'], ['Side Plank', 0, 45, null, 'R'],
    ], [
        ['Intervals', 'interval', null, null, 1200, null, null, '10 rounds: 1:00 @ 8.0 mph + 1:00 @ 6.0 mph; no warm-up/cooldown'],
    ]);

    // ===== Session 13: 2026-02-17 Tue — Bike/elliptical + upper A =====
    addSession('2026-02-17', 2, null, 'Bike/elliptical + upper A', [
        ['Incline DB Press', 55, 10, null, 'warm-up'],
        ['Incline DB Press', 70, 4, null, null],
        ['Incline DB Press', 60, 8, null, null], ['Incline DB Press', 60, 8, null, null],
        ...rep('Pec Deck', 130, 10, 3, null, '3-sec squeeze'),
        ['Cable Row', 130, 10, null, null], ['Cable Row', 150, 8, null, 'to failure'],
        ['Cable Row', 120, 10, null, null], ['Cable Row', 120, 10, null, null],
        ['Pull-ups', 0, 9, null, 'ladder 1-2-3-2-1'], ['Pull-ups', 0, 9, null, 'ladder + extra'],
        ...rep('Lateral Raises', 15, 10, 3),
        ...rep('Lateral Raises', 10, 10, 2),
    ], [
        ['Cardio', 'easy', null, null, null, null, null, 'elliptical/bike; duration not logged'],
    ]);

    // ===== Session 14: 2026-02-18 Wed — Tempo + legs + weighted core BW: 199 =====
    addSession('2026-02-18', 3, 199, 'Tempo + legs + weighted core', [
        ['Squat', 135, 6, null, null],
        ['Squat', 155, 7, 8, null], ['Squat', 145, 6, 8, null],
        ['Trap Bar Deadlift', 135, 8, null, 'low handles'],
        ['Trap Bar Deadlift', 155, 5, 6, 'low handles'], ['Trap Bar Deadlift', 155, 5, 4, 'low handles'],
        ['Crunch Machine', 70, 15, 3, null],
        ['Crunch Machine', 90, 12, 8, null], ['Crunch Machine', 90, 12, 6, null],
        ['Reverse Incline Sit-ups', 0, 8, 6, null], ['Reverse Incline Sit-ups', 0, 10, 8, null],
    ], [
        ['Tempo', 'tempo', '8:00/mi', '8:00/mi', 840, null, null, '14:00; knee 1/10'],
    ]);

    // ===== Session 15: 2026-02-19 Thu — Bike + upper B + pull-ups + arms =====
    addSession('2026-02-19', 4, null, 'Bike + upper B + pull-ups + arms', [
        ['Incline DB Press', 60, 8, null, null],
        ['Incline DB Press', 65, 8, null, null], ['Incline DB Press', 70, 6, null, null],
        ['DB Flys', 25, 10, null, null], ['DB Flys', 25, 10, null, null],
        ['Cable Row', 120, 10, null, null], ['Cable Row', 130, 10, null, null],
        ['Cable Row', 140, 10, 8.5, null],
        ['Pull-ups', 0, 22, null, 'ladders; 22 total'],
        ['Back Extensions', 0, 9, 9, 'mostly hamstrings; stopped'],
        ['Reverse Fly Machine', 120, 8, null, null],
        ['Reverse Fly Machine', 85, 10, null, null], ['Reverse Fly Machine', 55, 15, null, null],
        ['Curl Machine', 70, 10, null, null], ['Curl Machine', 90, 8, null, null],
        ['Tricep Pushdown', 70, 8, null, 'too heavy'],
        ['Tricep Pushdown', 50, 12, null, null], ['Tricep Pushdown', 50, 8, null, null],
    ], [
        ['Bike', 'easy', null, null, 1800, null, null, '30:00 easy'],
    ]);

    // ===== Session 16: 2026-02-21 Sat — Hill sprints + hard push-ups + circuit =====
    addSession('2026-02-21', 6, null, 'Hill sprints + hard push-ups + circuit', [
        ...rep('Push-ups', 0, 10, 3, null, 'circuit round'),
        ...rep('Plank', 0, 60, 3, null, 'circuit round'),
        ...rep('Delts/Arms', 0, 0, 3, null, 'circuit; weight/reps not logged'),
    ], [
        ['Hill Sprints', 'sprint', null, null, null, null, null, '10 × 250 ft uphill; walk-back recovery; slowed across reps'],
    ], undefined, [
        ['EMOM Push-ups', 6, 10, 10],
        ['EMOM Push-ups', 10, 4, 4],
    ]);

    // ===== Bodyweight-only sessions =====
    addSession('2026-02-20', 5, 199, 'Bodyweight only');
    addSession('2026-02-22', 0, 199.2, 'Bodyweight only');
    addSession('2026-02-24', 2, 202.2, 'Bodyweight only');
    addSession('2026-02-25', 3, 199.0, 'Bodyweight only');
    addSession('2026-02-26', 4, 198.0, 'Bodyweight only');
    addSession('2026-03-02', 1, 205, 'Bodyweight only');
    addSession('2026-03-04', 3, 201.2, 'Bodyweight only');
});

seed();
console.log('✅ History seeded successfully! 16 workout sessions + 7 bodyweight entries restored.');
db.close();
