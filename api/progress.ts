import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabase } from './_lib/supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    try {
        if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
        const supabase = await getSupabase();

        // Sequential queries to avoid potential concurrency/timeout issues in Lambda
        const sessionsRes = await supabase.from('sessions').select('*').order('date', { ascending: true });
        if (sessionsRes.error) throw sessionsRes.error;

        const setRes = await supabase.from('set_entries').select('*');
        if (setRes.error) throw setRes.error;

        const runRes = await supabase.from('run_entries').select('*');
        if (runRes.error) throw runRes.error;

        const gtgRes = await supabase.from('gtg_events').select('*');
        if (gtgRes.error) throw gtgRes.error;

        res.json({
            sessions: sessionsRes.data || [],
            set_entries: setRes.data || [],
            run_entries: runRes.data || [],
            gtg_events: gtgRes.data || [],
        });
    } catch (err: any) {
        res.status(500).json({
            error: err.message || err,
            details: err,
            diagnostic: "Inlined sequential getSupabase used"
        });
    }
}
