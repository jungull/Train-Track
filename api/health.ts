import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
    res.json({
        ok: true,
        env: {
            has_supabase_url: !!process.env.SUPABASE_URL,
            url_suffix: process.env.SUPABASE_URL?.slice(-4),
            has_supabase_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
            key_suffix: process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(-4),
            node_version: process.version,
        }
    });
}
