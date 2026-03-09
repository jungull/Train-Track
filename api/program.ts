import type { VercelRequest, VercelResponse } from '@vercel/node';

let _client: any = null;

async function getSupabase() {
    if (!_client) {
        const { createClient } = await import('@supabase/supabase-js');
        const url = process.env.SUPABASE_URL!;
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        _client = createClient(url, key);
    }
    return _client;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    try {
        const supabase = await getSupabase();

        // GET /api/program → list all days
        if (req.method === 'GET') {
            const { data, error } = await supabase.from('program_days').select('*').order('weekday', { ascending: true });
            if (error) throw error;
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
            if (error) throw error;
            return res.json({ success: true });
        }

        res.status(405).json({ error: 'Method not allowed' });
    } catch (err: any) {
        res.status(500).json({
            error: err.message || err,
            diagnostic: 'Standardized inlined program.ts'
        });
    }
}
