import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../_lib/supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    const { date } = req.query;
    const { data: session } = await supabase.from('sessions').select('*').eq('date', date as string).single();

    if (!session) return res.json(null);

    const [setRes, runRes, emomRes] = await Promise.all([
        supabase.from('set_entries').select('*').eq('session_id', session.id),
        supabase.from('run_entries').select('*').eq('session_id', session.id),
        supabase.from('emom_entries').select('*').eq('session_id', session.id),
    ]);

    res.json({
        ...session,
        set_entries: setRes.data || [],
        run_entries: runRes.data || [],
        emom_entries: emomRes.data || [],
    });
}
