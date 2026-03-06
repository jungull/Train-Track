import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../_lib/supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'PUT') return res.status(405).json({ error: 'Method not allowed' });

    const { weekday } = req.query;
    const { title, exercises } = req.body;

    const { error } = await supabase.from('program_days').update({
        title,
        exercises: JSON.stringify(exercises),
    }).eq('weekday', Number(weekday));

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
}
