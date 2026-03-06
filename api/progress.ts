import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabase } from './_lib/supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
    const supabase = await getSupabase();

    const [sessionsRes, setRes, runRes, gtgRes] = await Promise.all([
        supabase.from('sessions').select('*').order('date', { ascending: true }),
        supabase.from('set_entries').select('*'),
        supabase.from('run_entries').select('*'),
        supabase.from('gtg_events').select('*'),
    ]);

    res.json({
        sessions: sessionsRes.data || [],
        set_entries: setRes.data || [],
        run_entries: runRes.data || [],
        gtg_events: gtgRes.data || [],
    });
}
