import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from './_lib/supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    const { data, error } = await supabase
        .from('set_entries')
        .select('exercise_name, weight, reps')
        .gt('weight', 0)
        .gt('reps', 0);

    if (error) return res.status(500).json({ error: error.message });

    // Calculate best 1RM per exercise using Epley formula
    const best: Record<string, number> = {};
    for (const row of data || []) {
        const e1rm = row.weight * (1 + row.reps / 30);
        if (!best[row.exercise_name] || e1rm > best[row.exercise_name]) {
            best[row.exercise_name] = Math.round(e1rm * 10) / 10;
        }
    }
    res.json(best);
}
