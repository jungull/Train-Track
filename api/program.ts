import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabase } from './_lib/supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const supabase = getSupabase();
    // GET /api/program → list all days
    if (req.method === 'GET') {
        const { data, error } = await supabase.from('program_days').select('*').order('weekday', { ascending: true });
        if (error) return res.status(500).json({ error: error.message });
        return res.json(data);
    }

    // PUT /api/program?weekday=2 → update one day
    if (req.method === 'PUT') {
        const weekday = req.query.weekday;
        const { title, exercises } = req.body;
        const { error } = await supabase.from('program_days').update({
            title,
            exercises: JSON.stringify(exercises),
        }).eq('weekday', Number(weekday));
        if (error) return res.status(500).json({ error: error.message });
        return res.json({ success: true });
    }

    res.status(405).json({ error: 'Method not allowed' });
}
