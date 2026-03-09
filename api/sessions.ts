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
            const { date, weekday, bodyweight, notes, set_entries, run_entries, emom_entries } = req.body;

            const toNumberOrNull = (value: unknown) => {
                if (value === '' || value === null || value === undefined) return null;
                const parsed = Number(value);
                return Number.isFinite(parsed) ? parsed : null;
            };

            const normalizedBodyweight = toNumberOrNull(bodyweight);
            const { data: existing } = await supabase.from('sessions').select('id').eq('date', date).single();
            let sessionId: number;

            if (existing) {
                sessionId = existing.id;
                const { error: updateErr } = await supabase.from('sessions').update({ bodyweight: normalizedBodyweight, notes }).eq('id', sessionId);
                if (updateErr) throw updateErr;

                const { error: deleteSetErr } = await supabase.from('set_entries').delete().eq('session_id', sessionId);
                if (deleteSetErr) throw deleteSetErr;

                const { error: deleteRunErr } = await supabase.from('run_entries').delete().eq('session_id', sessionId);
                if (deleteRunErr) throw deleteRunErr;

                const { error: deleteEmomErr } = await supabase.from('emom_entries').delete().eq('session_id', sessionId);
                if (deleteEmomErr) throw deleteEmomErr;
            } else {
                const { data: newSession, error } = await supabase.from('sessions')
                    .insert({ date, weekday, bodyweight: normalizedBodyweight, notes })
                    .select('id').single();
                if (error || !newSession) throw error || new Error('Insert failed');
                sessionId = newSession.id;
            }

            if (set_entries?.length > 0) {
                const rows = set_entries.map((e: any) => ({
                    session_id: sessionId,
                    block_title: e.block_title,
                    exercise_name: e.exercise_name,
                    set_index: toNumberOrNull(e.set_index),
                    weight: toNumberOrNull(e.weight),
                    reps: toNumberOrNull(e.reps),
                    rpe: toNumberOrNull(e.rpe),
                    notes: e.notes,
                    category: e.category || 'strength',
                    distance: toNumberOrNull(e.distance),
                    duration_seconds: toNumberOrNull(e.duration_seconds),
                }));
                const { error: setInsertErr } = await supabase.from('set_entries').insert(rows);
                if (setInsertErr) throw setInsertErr;
            }

            if (run_entries?.length > 0) {
                const rows = run_entries.map((e: any) => ({
                    session_id: sessionId,
                    block_title: e.block_title,
                    run_type: e.run_type,
                    target_pace: e.target_pace,
                    actual_pace: e.actual_pace,
                    duration_seconds: toNumberOrNull(e.duration_seconds),
                    distance: toNumberOrNull(e.distance),
                    rpe: toNumberOrNull(e.rpe),
                    notes: e.notes,
                }));
                const { error: runInsertErr } = await supabase.from('run_entries').insert(rows);
                if (runInsertErr) throw runInsertErr;
            }

            if (emom_entries?.length > 0) {
                const rows = emom_entries.map((e: any) => ({
                    session_id: sessionId,
                    block_title: e.block_title,
                    target_reps: toNumberOrNull(e.target_reps),
                    minutes: toNumberOrNull(e.minutes),
                    completed_minutes: toNumberOrNull(e.completed_minutes),
                }));
                const { error: emomInsertErr } = await supabase.from('emom_entries').insert(rows);
                if (emomInsertErr) throw emomInsertErr;
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
