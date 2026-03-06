import Database from 'better-sqlite3';

const db = new Database('fitness.db');

const sessions = db.prepare('SELECT * FROM sessions').all();

const insertSet = db.prepare('INSERT INTO set_entries (session_id, block_title, exercise_name, set_index, weight, reps, rpe, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');

db.transaction(() => {
  // Clear existing to avoid duplicates if run multiple times
  db.prepare('DELETE FROM set_entries').run();

  for (const session of sessions) {
    const notes = session.notes || '';
    const lines = notes.split('\n');
    
    for (const line of lines) {
      const lower = line.toLowerCase();
      
      // Push-ups
      if (lower.startsWith('push-ups:')) {
        let match = line.match(/Push-ups:\s*(\d+)\s*in/i);
        if (match) {
           insertSet.run(session.id, 'Strength', 'Pushups', 1, 0, parseInt(match[1]), null, line);
           continue;
        }
        match = line.match(/Push-ups:\s*([\d,]+)/i);
        if (match) {
          const reps = match[1].split(',').map(n => parseInt(n.trim()));
          reps.forEach((r, i) => {
            if (!isNaN(r)) insertSet.run(session.id, 'Strength', 'Pushups', i+1, 0, r, null, '');
          });
          continue;
        }
        match = line.match(/Push-ups:\s*(\d+)x(\d+)/i) || line.match(/Push-ups:\s*(\d+)×(\d+)/i);
        if (match) {
          const sets = parseInt(match[1]);
          const reps = parseInt(match[2]);
          for(let i=0; i<sets; i++) {
            insertSet.run(session.id, 'Strength', 'Pushups', i+1, 0, reps, null, '');
          }
          continue;
        }
        match = line.match(/Push-ups:\s*(\d+)/i);
        if (match) {
          insertSet.run(session.id, 'Strength', 'Pushups', 1, 0, parseInt(match[1]), null, '');
        }
      }

      // Pull-ups
      if (lower.startsWith('pull-ups:')) {
        let match = line.match(/Pull-ups:\s*([\d,]+)/i);
        if (match) {
          const reps = match[1].split(',').map(n => parseInt(n.trim()));
          reps.forEach((r, i) => {
            if (!isNaN(r)) insertSet.run(session.id, 'Strength', 'Pull-ups', i+1, 0, r, null, '');
          });
          continue;
        }
        match = line.match(/Pull-ups:\s*(\d+)/i);
        if (match) {
          insertSet.run(session.id, 'Strength', 'Pull-ups', 1, 0, parseInt(match[1]), null, '');
        }
      }

      // Bench
      if (lower.startsWith('bench:')) {
        const match = line.match(/Bench:\s*(\d+)x(\d+)x(\d+)/i) || line.match(/Bench:\s*(\d+)×(\d+)×(\d+)/i);
        if (match) {
          const weight = parseInt(match[1]);
          const reps = parseInt(match[2]);
          const sets = parseInt(match[3]);
          for(let i=0; i<sets; i++) {
            insertSet.run(session.id, 'Strength', 'Bench Press', i+1, weight, reps, null, '');
          }
        }
      }

      // Squat
      if (lower.startsWith('squat:')) {
        const parts = line.substring(6).split(';');
        parts.forEach((p, i) => {
          const m = p.match(/(\d+)x(\d+)/i) || p.match(/(\d+)×(\d+)/i);
          if (m) {
            insertSet.run(session.id, 'Strength', 'Squat', i+1, parseInt(m[1]), parseInt(m[2]), null, p.trim());
          }
        });
      }

      // Trap bar DL
      if (lower.startsWith('trap bar dl')) {
        const parts = line.split(':');
        if (parts.length > 1) {
          const sets = parts[1].split(';');
          sets.forEach((p, i) => {
            const m = p.match(/(\d+)x(\d+)/i) || p.match(/(\d+)×(\d+)/i);
            if (m) {
              insertSet.run(session.id, 'Strength', 'Trap Bar Deadlift', i+1, parseInt(m[1]), parseInt(m[2]), null, p.trim());
            }
          });
        }
      }

      // Incline DB
      if (lower.startsWith('incline db:')) {
        const parts = line.substring(11).split(';');
        parts.forEach((p, i) => {
          const m = p.match(/(\d+)x(\d+)/i) || p.match(/(\d+)×(\d+)/i);
          if (m) {
            insertSet.run(session.id, 'Strength', 'Incline DB Press', i+1, parseInt(m[1]), parseInt(m[2]), null, p.trim());
          }
        });
      }

      // Cable row
      if (lower.startsWith('cable row:')) {
        const parts = line.substring(10).split(';');
        parts.forEach((p, i) => {
          const m = p.match(/(\d+)x(\d+)/i) || p.match(/(\d+)×(\d+)/i);
          if (m) {
            insertSet.run(session.id, 'Strength', 'Cable Row', i+1, parseInt(m[1]), parseInt(m[2]), null, p.trim());
          }
        });
      }
      
      // Lateral raises
      if (lower.startsWith('lateral raises:')) {
        const parts = line.substring(15).split(';');
        parts.forEach((p, i) => {
          const m = p.match(/(\d+)x(\d+)x(\d+)/i) || p.match(/(\d+)×(\d+)×(\d+)/i);
          if (m) {
            const weight = parseInt(m[1]);
            const reps = parseInt(m[2]);
            const sets = parseInt(m[3]);
            for(let j=0; j<sets; j++) {
              insertSet.run(session.id, 'Strength', 'Lateral Raises', i*10+j+1, weight, reps, null, p.trim());
            }
          }
        });
      }
    }
  }
})();

console.log('Parsed notes into set_entries successfully.');
