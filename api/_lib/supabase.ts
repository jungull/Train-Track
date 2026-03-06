import type { SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;

export async function getSupabase(): Promise<SupabaseClient> {
    if (!_client) {
        const { createClient } = await import('@supabase/supabase-js');
        const url = process.env.SUPABASE_URL;
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!url || !key) {
            throw new Error(
                `Missing env vars: SUPABASE_URL=${url ? 'set' : 'MISSING'}, SUPABASE_SERVICE_ROLE_KEY=${key ? 'set' : 'MISSING'}`
            );
        }
        _client = createClient(url, key);
    }
    return _client;
}
