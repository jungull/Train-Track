import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from './_lib/supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method === 'POST') {
        const { type, date, timestamp, target, completed, source } = req.body;
        const { error } = await supabase.from('gtg_events').insert({
            type, date, timestamp, target, completed, source,
        });
        if (error) return res.status(500).json({ error: error.message });
        return res.json({ success: true });
    }

    res.status(405).json({ error: 'Method not allowed' });
}
