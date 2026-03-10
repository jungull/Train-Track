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
        if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
        const supabase = await getSupabase();

        const nutritionRes = await supabase.from('nutrition_history').select('*').order('date', { ascending: true });
        if (nutritionRes.error) throw nutritionRes.error;

        res.json(nutritionRes.data || []);
    } catch (err: any) {
        res.status(500).json({
            error: err.message || err,
            details: err,
            diagnostic: 'nutrition-history endpoint failed'
        });
    }
}
