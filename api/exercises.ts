import type { VercelRequest, VercelResponse } from '@vercel/node';

let _client: any = null;

async function getSupabase() {
    if (!_client) {
        const { createClient } = await import('@supabase/supabase-js');
        const url = process.env.SUPABASE_URL!;
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        _client = createClient(url, key);
    }
    return _client;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    try {
        const supabase = await getSupabase();
        if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

        const type = req.query.type as string || 'recent';

        // GET /api/exercises?type=recent → most recent set per exercise
        if (type === 'recent') {
            const { data, error } = await supabase
                .from('set_entries')
                .select('exercise_name, weight, reps, session_id, sessions!inner(date)')
                .order('id', { ascending: false });

            if (error) throw error;

            const seen = new Set<string>();
            const result = (data || []).filter((row: any) => {
                if (seen.has(row.exercise_name)) return false;
                seen.add(row.exercise_name);
                return true;
            }).map((row: any) => ({
                exercise_name: row.exercise_name,
                weight: row.weight,
                reps: row.reps,
                date: row.sessions?.date,
            }));
            return res.json(result);
        }

        // GET /api/exercises?type=best1rm → best 1RM per exercise
        if (type === 'best1rm') {
            const { data, error } = await supabase
                .from('set_entries')
                .select('exercise_name, weight, reps')
                .gt('weight', 0).gt('reps', 0);

            if (error) throw error;

            const best: Record<string, number> = {};
            for (const row of data || []) {
                const e1rm = row.weight * (1 + row.reps / 30);
                if (!best[row.exercise_name] || e1rm > best[row.exercise_name]) {
                    best[row.exercise_name] = Math.round(e1rm * 10) / 10;
                }
            }
            return res.json(best);
        }

        // GET /api/exercises?type=log → full exercise log with dates
        if (type === 'log') {
            const { data, error } = await supabase
                .from('set_entries')
                .select('*, sessions!inner(date)')
                .order('id', { ascending: false });

            if (error) throw error;
            const result = (data || []).map((row: any) => ({
                ...row, date: row.sessions?.date, sessions: undefined,
            }));
            return res.json(result);
        }

        res.status(400).json({ error: 'Invalid type' });
    } catch (err: any) {
        res.status(500).json({ error: err.message || err, details: err });
    }
}
