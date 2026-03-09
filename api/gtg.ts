import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabase } from './_lib/supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    try {
        const supabase = await getSupabase();

        if (req.method === 'GET') {
            const dateStr = req.query.date as string;
            const history = req.query.history === '1';

            if (history) {
                // Fetch all app events and aggregate in memory to be safe across Vercel/Supabase versions
                const { data, error } = await supabase.from('gtg_events')
                    .select('*')
                    .eq('source', 'app')
                    .gt('completed', 0)
                    .order('date', { ascending: false });

                if (error) throw error;

                const grouped: Record<string, any> = {};
                for (const row of data || []) {
                    const key = `${row.date}-${row.type}`;
                    if (!grouped[key]) {
                        grouped[key] = { date: row.date, type: row.type, sets_completed: 0, total_volume: 0 };
                    }
                    grouped[key].sets_completed += 1;
                    grouped[key].total_volume += row.completed;
                }
                return res.json(Object.values(grouped));
            }

            if (dateStr) {
                const { data, error } = await supabase.from('gtg_events')
                    .select('*')
                    .eq('date', dateStr);
                if (error) throw error;
                return res.json(data || []);
            }

            return res.status(400).json({ error: 'date or history query param required' });
        }

        if (req.method === 'POST') {
            const { type, date, timestamp, target, completed, source } = req.body;
            const { error } = await supabase.from('gtg_events').insert({
                type, date, timestamp, target, completed, source
            });
            if (error) throw error;
            return res.json({ success: true });
        }

        res.status(405).json({ error: 'Method not allowed' });
    } catch (err: any) {
        res.status(500).json({
            error: err.message || err,
            diagnostic: 'Standardized try/catch in gtg.ts'
        });
    }
}
