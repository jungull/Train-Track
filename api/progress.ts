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

        const [sessionsRes, setRes, runRes, gtgRes] = await Promise.all([
            supabase.from('sessions').select('*').order('date', { ascending: true }),
            supabase.from('set_entries').select('*'),
            supabase.from('run_entries').select('*'),
            supabase.from('gtg_events').select('*'),
        ]);

        if (sessionsRes.error) throw sessionsRes.error;
        if (setRes.error) throw setRes.error;
        if (runRes.error) throw runRes.error;
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
            diagnostic: "Inlined getSupabase used"
        });
    }
}
