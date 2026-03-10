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

        const toNullableNumber = (value: any) => {
            if (value === null || value === undefined || value === '') return null;
            const parsed = typeof value === 'number' ? value : Number(value);
            return Number.isFinite(parsed) ? parsed : null;
        };

        // GET /api/sessions?date=2024-01-15 → fetch one session
        if (req.method === 'GET') {
            const date = req.query.date as string;
            if (!date) return res.status(400).json({ error: 'date query param required' });

            const { data: session, error: sErr } = await supabase.from('sessions').select('*').eq('date', date).single();
            if (sErr) {
                if (sErr.code === 'PGRST116') return res.json(null); // Not found
                throw sErr;
            }

            const [setRes, runRes, emomRes] = await Promise.all([
                supabase.from('set_entries').select('*').eq('session_id', session.id),
                supabase.from('run_entries').select('*').eq('session_id', session.id),
                supabase.from('emom_entries').select('*').eq('session_id', session.id),
            ]);

            return res.json({
                ...session,
                set_entries: setRes.data || [],
                run_entries: runRes.data || [],
                emom_entries: emomRes.data || [],
            });
        }

        // POST /api/sessions → create/update session
        if (req.method === 'POST') {
            const { date, weekday, bodyweight, waist_circumference, calories_protein, calories_carbs, calories_fats, notes, set_entries, run_entries, emom_entries } = req.body;

            const { data: existing } = await supabase.from('sessions').select('id').eq('date', date).single();
            let sessionId: number;

            if (existing) {
                sessionId = existing.id;
                await supabase.from('sessions').update({ bodyweight, waist_circumference, calories_protein, calories_carbs, calories_fats, notes }).eq('id', sessionId);
                await supabase.from('set_entries').delete().eq('session_id', sessionId);
                await supabase.from('run_entries').delete().eq('session_id', sessionId);
                await supabase.from('emom_entries').delete().eq('session_id', sessionId);
            } else {
                const { data: newSession, error } = await supabase.from('sessions')
                    .insert({ date, weekday, bodyweight, waist_circumference, calories_protein, calories_carbs, calories_fats, notes })
                    .select('id').single();
                if (error || !newSession) throw error || new Error('Insert failed');
                sessionId = newSession.id;
            }

            if (set_entries?.length > 0) {
                const rows = set_entries.map((e: any) => ({
                    session_id: sessionId,
                    block_title: e.block_title, exercise_name: e.exercise_name,
                    set_index: toNullableNumber(e.set_index),
                    weight: toNullableNumber(e.weight),
                    reps: toNullableNumber(e.reps),
                    rpe: toNullableNumber(e.rpe),
                    notes: e.notes,
                    category: e.category || 'strength',
                    distance: toNullableNumber(e.distance),
                    duration_seconds: toNullableNumber(e.duration_seconds),
                }));
                const { error } = await supabase.from('set_entries').insert(rows);
                if (error) throw error;
            }

            if (run_entries?.length > 0) {
                const rows = run_entries.map((e: any) => ({
                    session_id: sessionId,
                    block_title: e.block_title, run_type: e.run_type,
                    target_pace: e.target_pace, actual_pace: e.actual_pace,
                    duration_seconds: toNullableNumber(e.duration_seconds),
                    distance: toNullableNumber(e.distance),
                    rpe: toNullableNumber(e.rpe),
                    notes: e.notes,
                }));
                const { error } = await supabase.from('run_entries').insert(rows);
                if (error) throw error;
            }

            if (emom_entries?.length > 0) {
                const rows = emom_entries.map((e: any) => ({
                    session_id: sessionId,
                    block_title: e.block_title, target_reps: e.target_reps,
                    minutes: toNullableNumber(e.minutes),
                    completed_minutes: toNullableNumber(e.completed_minutes),
                }));
                const { error } = await supabase.from('emom_entries').insert(rows);
                if (error) throw error;
            }

            return res.json({ success: true });
        }

        res.status(405).json({ error: 'Method not allowed' });
    } catch (err: any) {
        res.status(500).json({
            error: err.message || err,
            diagnostic: 'Standardized inlined sessions.ts'
        });
    }
}
