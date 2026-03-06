import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from './_lib/supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method === 'GET') {
        const { data, error } = await supabase.from('settings').select('*').eq('id', 1).single();
        if (error) return res.status(500).json({ error: error.message });
        return res.json(data);
    }

    if (req.method === 'PUT') {
        const b = req.body;
        const { error } = await supabase.from('settings').update({
            program_start_date: b.program_start_date,
            units: b.units,
            pushup_start_time: b.pushup_start_time,
            pushup_end_time: b.pushup_end_time,
            plank_start_time: b.plank_start_time,
            plank_end_time: b.plank_end_time,
            nag_interval: b.nag_interval,
            pushup_start_reps: b.pushup_start_reps,
            pushup_weekly_add: b.pushup_weekly_add,
            plank_start_sec: b.plank_start_sec,
            plank_weekly_add: b.plank_weekly_add,
            emom_start: b.emom_start,
            emom_weekly_add: b.emom_weekly_add,
            gtg_daily_target_sets: b.gtg_daily_target_sets ?? 5,
            gtg_cooldown_minutes: b.gtg_cooldown_minutes ?? 15,
            gtg_pushup_enabled: b.gtg_pushup_enabled ?? 1,
            gtg_plank_enabled: b.gtg_plank_enabled ?? 1,
        }).eq('id', 1);
        if (error) return res.status(500).json({ error: error.message });
        return res.json({ success: true });
    }

    res.status(405).json({ error: 'Method not allowed' });
}
