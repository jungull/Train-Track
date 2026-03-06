import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from './_lib/supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    // Join set_entries with sessions to get dates
    const { data, error } = await supabase
        .from('set_entries')
        .select('*, sessions!inner(date)')
        .order('id', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });

    // Flatten the join
    const result = (data || []).map((row: any) => ({
        ...row,
        date: row.sessions?.date,
        sessions: undefined,
    }));

    res.json(result);
}
