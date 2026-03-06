import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabase } from './_lib/supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const supabase = getSupabase();
    // GET /api/sessions?date=2024-01-15 → fetch one session
    if (req.method === 'GET') {
        const date = req.query.date as string;
        if (!date) return res.status(400).json({ error: 'date query param required' });

        const { data: session } = await supabase.from('sessions').select('*').eq('date', date).single();
        if (!session) return res.json(null);

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

        const { data: existing } = await supabase.from('sessions').select('id').eq('date', date).single();
        let sessionId: number;

        if (existing) {
            sessionId = existing.id;
            await supabase.from('sessions').update({ bodyweight, notes }).eq('id', sessionId);
            await supabase.from('set_entries').delete().eq('session_id', sessionId);
            await supabase.from('run_entries').delete().eq('session_id', sessionId);
            await supabase.from('emom_entries').delete().eq('session_id', sessionId);
        } else {
            const { data: newSession, error } = await supabase.from('sessions')
                .insert({ date, weekday, bodyweight, notes })
                .select('id').single();
            if (error || !newSession) return res.status(500).json({ error: error?.message || 'Insert failed' });
            sessionId = newSession.id;
        }

        if (set_entries?.length > 0) {
            const rows = set_entries.map((e: any) => ({
                session_id: sessionId,
                block_title: e.block_title, exercise_name: e.exercise_name,
                set_index: e.set_index, weight: e.weight, reps: e.reps,
                rpe: e.rpe, notes: e.notes,
                category: e.category || 'strength',
                distance: e.distance || null, duration_seconds: e.duration_seconds || null,
            }));
            await supabase.from('set_entries').insert(rows);
        }

        if (run_entries?.length > 0) {
            const rows = run_entries.map((e: any) => ({
                session_id: sessionId,
                block_title: e.block_title, run_type: e.run_type,
                target_pace: e.target_pace, actual_pace: e.actual_pace,
                duration_seconds: e.duration_seconds, distance: e.distance,
                rpe: e.rpe, notes: e.notes,
            }));
            await supabase.from('run_entries').insert(rows);
        }

        if (emom_entries?.length > 0) {
            const rows = emom_entries.map((e: any) => ({
                session_id: sessionId,
                block_title: e.block_title, target_reps: e.target_reps,
                minutes: e.minutes, completed_minutes: e.completed_minutes,
            }));
            await supabase.from('emom_entries').insert(rows);
        }

        return res.json({ success: true });
    }

    res.status(405).json({ error: 'Method not allowed' });
}
