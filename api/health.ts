import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
    res.json({
        ok: true,
        env: {
            has_supabase_url: !!process.env.SUPABASE_URL,
            has_supabase_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
            node_version: process.version,
        }
    });
}
