```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabase } from './_lib/supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    try {
        const supabase = await getSupabase();

        if (req.method === 'GET') {
            const dateStr = req.query.date as string;
            const history = req.query.history === '1';

            if (history) {
                // Aggregated GTG history
                // Note: Supabase `sum()` aggregation requires a specific setup or RLS policy
                // This query attempts to use `sum()` directly.
                // If `completed.sum()` doesn't work as expected, you might need a view or a different approach.
                const { data, error } = await supabase.from('gtg_events')
                    .select('date, type, sum(completed) as total_volume, count(id) as sets_completed') // Added count(id) for sets_completed
                    .order('date', { ascending: false })
                    .group('date, type'); // Group by date and type for aggregation
                if (error) throw error;
                return res.json(data);
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
