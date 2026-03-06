import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from './_lib/supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // POST /api/gtg → log a GTG event
    if (req.method === 'POST') {
        const { type, date, timestamp, target, completed, source } = req.body;
        const { error } = await supabase.from('gtg_events').insert({
            type, date, timestamp, target, completed, source,
        });
        if (error) return res.status(500).json({ error: error.message });
        return res.json({ success: true });
    }

    // GET /api/gtg?date=2024-01-15 → events for a date
    // GET /api/gtg?history=1 → aggregated history
    if (req.method === 'GET') {
        const date = req.query.date as string;
        const history = req.query.history as string;

        if (history) {
            // Aggregated GTG history
            const { data: raw } = await supabase
                .from('gtg_events')
                .select('*')
                .eq('source', 'app')
                .gt('completed', 0)
                .order('date', { ascending: false });

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

        if (date) {
            const { data, error } = await supabase.from('gtg_events').select('*').eq('date', date);
            if (error) return res.status(500).json({ error: error.message });
            return res.json(data);
        }

        return res.status(400).json({ error: 'date or history query param required' });
    }

    res.status(405).json({ error: 'Method not allowed' });
}
