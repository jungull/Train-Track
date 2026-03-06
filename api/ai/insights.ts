import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });

    try {
        const { GoogleGenAI } = await import('@google/genai');
        const ai = new GoogleGenAI({ apiKey });
        const { history } = req.body;
        const prompt = `Analyze this fitness history and provide a short "Today focus" (1 sentence) and a weekly summary of what improved/stalled in 3 bullet points. Data: ${JSON.stringify(history)}`;
        const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: prompt,
        });
        res.json({ insights: response.text });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
}
