import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    try {
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(
            process.env.SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
        const { data, error } = await supabase.from('settings').select('*').eq('id', 1).single();
        if (error) return res.status(500).json({ step: 'query', error: error.message, code: error.code });
        return res.json({ step: 'success', data });
    } catch (err: any) {
        return res.status(500).json({ step: 'crash', error: err.message, stack: err.stack?.split('\n').slice(0, 5) });
    }
}
