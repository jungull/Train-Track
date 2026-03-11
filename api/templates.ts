import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabase } from './_lib/supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    try {
        const supabase = await getSupabase();

        if (req.method === 'GET') {
            const { data, error } = await supabase
                .from('day_templates')
                .select('*')
                .order('title', { ascending: true });
            
            if (error) throw error;
            return res.json(data);
        }

        if (req.method === 'POST') {
            const { title, exercises } = req.body;
            if (!title) return res.status(400).json({ error: 'Title required' });

            const { data, error } = await supabase
                .from('day_templates')
                .insert({ title, exercises: JSON.stringify(exercises || []) })
                .select()
                .single();
            
            if (error) throw error;
            return res.json(data);
        }

        if (req.method === 'DELETE') {
            const id = req.query.id;
            if (!id) return res.status(400).json({ error: 'ID required' });

            const { error } = await supabase
                .from('day_templates')
                .delete()
                .eq('id', Number(id));

            if (error) throw error;
            return res.json({ success: true });
        }

        res.status(405).json({ error: 'Method not allowed' });
    } catch (err: any) {
        res.status(500).json({ error: err.message || err });
    }
}
