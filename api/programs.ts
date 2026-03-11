import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabase } from './_lib/supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    try {
        const supabase = await getSupabase();

        // GET all programs with their nested days
        if (req.method === 'GET') {
            const { data: programs, error: pErr } = await supabase
                .from('weekly_programs')
                .select('*')
                .order('id', { ascending: true });
            if (pErr) throw pErr;

            const { data: days, error: dErr } = await supabase
                .from('program_cycle_days')
                .select('*')
                .order('day_index', { ascending: true });
            if (dErr) throw dErr;

            // Merge days into their respective programs
            const result = programs.map((prog: any) => ({
                ...prog,
                days: days.filter((d: any) => d.program_id === prog.id).map((d: any) => ({
                    ...d,
                    exercises: JSON.parse(d.exercises || '[]')
                }))
            }));
            
            return res.json(result);
        }

        // Create new program
        if (req.method === 'POST') {
            const { title, cycle_weeks } = req.body;
            if (!title) return res.status(400).json({ error: 'Title required' });

            // 1. Insert parent
            const { data: newProg, error: pErr } = await supabase
                .from('weekly_programs')
                .insert({ title, cycle_weeks: cycle_weeks || 1 })
                .select()
                .single();
            if (pErr) throw pErr;

            // 2. Insert empty days (0 to N-1)
            const daysToCreate = (cycle_weeks || 1) * 7;
            const insertDays = [];
            for (let i = 0; i < daysToCreate; i++) {
                insertDays.push({
                    program_id: newProg.id,
                    day_index: i,
                    title: 'Rest',
                    exercises: '[]'
                });
            }
            const { error: dErr } = await supabase.from('program_cycle_days').insert(insertDays);
            if (dErr) throw dErr;

            return res.json(newProg);
        }

        // Update program settings (cycle_weeks, title, is_active) or Sync days
        if (req.method === 'PUT') {
            const id = req.query.id;
            
            // Sync days if passing an array of days
            if (req.query.sync === 'true' && req.body.days) {
                // Bulk upsert days
                const updates = req.body.days.map((d: any) => {
                    const payload: any = {
                        program_id: Number(id),
                        day_index: d.day_index,
                        title: d.title,
                        exercises: JSON.stringify(d.exercises || [])
                    };
                    if (d.id) payload.id = d.id;
                    return payload;
                });
                const { error } = await supabase.from('program_cycle_days').upsert(updates, { onConflict: 'program_id,day_index' });
                if (error) throw error;
                return res.json({ success: true });
            }

            // Otherwise, update parent program fields
            const { is_active, title, cycle_weeks } = req.body;
            if (is_active === true) {
                // Set all other programs to false
                await supabase.from('weekly_programs').update({ is_active: false }).neq('id', 0);
                
                // Set this one to true and reset anchor date to today
                const { error } = await supabase
                    .from('weekly_programs')
                    .update({ is_active: true, anchor_date: new Date().toISOString() })
                    .eq('id', Number(id));
                if (error) throw error;
                return res.json({ success: true, anchor_reset: true });
            }

            const { error: uErr } = await supabase
                .from('weekly_programs')
                .update({ title, cycle_weeks })
                .eq('id', Number(id));
            if (uErr) throw uErr;
            return res.json({ success: true });
        }

        // Delete program
        if (req.method === 'DELETE') {
            const id = req.query.id;
            const { error } = await supabase.from('weekly_programs').delete().eq('id', Number(id));
            if (error) throw error;
            return res.json({ success: true });
        }

        res.status(405).json({ error: 'Method not allowed' });
    } catch (err: any) {
        res.status(500).json({ error: err.message || err });
    }
}
