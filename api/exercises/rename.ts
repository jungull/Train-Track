import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../_lib/supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { oldName, newName } = req.body;
    if (!oldName || !newName) return res.status(400).json({ error: 'oldName and newName required' });

    const { error } = await supabase
        .from('set_entries')
        .update({ exercise_name: newName })
        .eq('exercise_name', oldName);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
}
