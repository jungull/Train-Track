import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from './_lib/supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    // Get max id per exercise_name to find the most recent set
    const { data, error } = await supabase.rpc('get_recent_exercises');

    if (error) {
        // Fallback: just query directly
        const { data: fallback } = await supabase
            .from('set_entries')
            .select('exercise_name, weight, reps, sessions!inner(date)')
            .order('id', { ascending: false });

        // Deduplicate by exercise name
        const seen = new Set<string>();
        const result = (fallback || []).filter((row: any) => {
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

    res.json(data);
}
