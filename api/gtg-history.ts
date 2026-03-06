import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from './_lib/supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    const { data, error } = await supabase.rpc('get_gtg_history');

    if (error) {
        // Fallback: query and aggregate in JS
        const { data: raw } = await supabase
            .from('gtg_events')
            .select('*')
            .eq('source', 'app')
            .gt('completed', 0)
            .order('date', { ascending: false });

        // Group by date + type
        const grouped: Record<string, any> = {};
        for (const row of raw || []) {
            const key = `${row.date}-${row.type}`;
            if (!grouped[key]) {
                grouped[key] = { date: row.date, type: row.type, sets_completed: 0, total_volume: 0 };
            }
            grouped[key].sets_completed += 1;
            grouped[key].total_volume += row.completed;
        }

        return res.json(Object.values(grouped));
    }

    res.json(data);
}
