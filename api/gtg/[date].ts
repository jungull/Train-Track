import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../_lib/supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    const { date } = req.query;
    const { data, error } = await supabase.from('gtg_events').select('*').eq('date', date as string);
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
}
