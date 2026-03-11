import { useEffect, useMemo, useState, useRef } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { format, getDay } from 'date-fns';
import { Pencil } from 'lucide-react';

type MetricKey = 'bodyweight' | 'calories' | 'run' | 'pushups' | 'plank' | 'pullups';


const DEFAULT_NUTRITION_HISTORY = [
  { date: '2026-02-20', weekday: 'Friday', protein_grams: 107, carbs_grams: 211, fat_grams: 130 },
  { date: '2026-02-23', weekday: 'Monday', protein_grams: 88, carbs_grams: 104, fat_grams: 41 },
  { date: '2026-02-24', weekday: 'Tuesday', protein_grams: 88, carbs_grams: 164, fat_grams: 24 },
  { date: '2026-02-25', weekday: 'Wednesday', protein_grams: 185, carbs_grams: 202, fat_grams: 79 },
  { date: '2026-02-26', weekday: 'Thursday', protein_grams: 200, carbs_grams: 230, fat_grams: 92 },
  { date: '2026-02-27', weekday: 'Friday', protein_grams: 133, carbs_grams: 262, fat_grams: 60 },
  { date: '2026-03-02', weekday: 'Monday', protein_grams: 177, carbs_grams: 227, fat_grams: 118 },
  { date: '2026-03-03', weekday: 'Tuesday', protein_grams: 120, carbs_grams: 247, fat_grams: 73 },
  { date: '2026-03-04', weekday: 'Wednesday', protein_grams: 176, carbs_grams: 114, fat_grams: 76 },
  { date: '2026-03-05', weekday: 'Thursday', protein_grams: 226, carbs_grams: 348, fat_grams: 127 },
  { date: '2026-03-09', weekday: 'Monday', protein_grams: 168, carbs_grams: 148, fat_grams: 75 },
];



function resolveNutritionHistory(progressData: any, nutritionFallback: any[]) {
  const progressNutrition = Array.isArray(progressData?.nutrition_history) ? progressData.nutrition_history : [];
  if (progressNutrition.length > 0) return progressNutrition;
  if (Array.isArray(nutritionFallback) && nutritionFallback.length > 0) return nutritionFallback;
  return DEFAULT_NUTRITION_HISTORY;
}

const METRICS: { key: MetricKey; label: string; accent: string }[] = [
  { key: 'bodyweight', label: 'Bodyweight over time', accent: '#18181b' },
  { key: 'calories', label: 'Calories per day', accent: '#0ea5e9' },
  { key: 'run', label: '1.5 mile run time (minutes)', accent: '#f97316' },
  { key: 'pushups', label: 'Max push-ups (single set)', accent: '#f59e0b' },
  { key: 'plank', label: 'Max plank time (seconds)', accent: '#3b82f6' },
  { key: 'pullups', label: 'Max pull-ups (single set)', accent: '#10b981' },
];

export default function HomePage() {
  const [loading, setLoading] = useState(true);
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>('bodyweight');
  const [progress, setProgress] = useState<any>({ sessions: [], set_entries: [], run_entries: [], gtg_events: [] });
  const [todaySession, setTodaySession] = useState<any>(null);
  const [bodyweight, setBodyweight] = useState('');
  const [waist, setWaist] = useState('');
  const [calories, setCalories] = useState('');
  const [savingKey, setSavingKey] = useState<'bodyweight' | 'waist' | 'calories' | null>(null);
  const [editMode, setEditMode] = useState<Record<'bodyweight' | 'waist' | 'calories', boolean>>({
    bodyweight: false,
    waist: false,
    calories: false,
  });

  const todayStr = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    async function load() {
      try {
        const [progressRes, sessionRes] = await Promise.all([
          fetch('/api/progress'),
          fetch(`/api/sessions?date=${todayStr}`),
        ]);

        const progressData = progressRes.ok ? await progressRes.json() : null;
        const sessionData = sessionRes.ok ? await sessionRes.json() : null;

        const needsNutritionFallback = !Array.isArray(progressData?.nutrition_history) || progressData.nutrition_history.length === 0;
        let nutritionFallback: any[] = [];
        if (needsNutritionFallback) {
          const nutritionRes = await fetch('/api/nutrition-history');
          nutritionFallback = nutritionRes.ok ? await nutritionRes.json() : [];
        }
        const finalNutrition = resolveNutritionHistory(progressData, nutritionFallback);

        const normalizedProgress = {
          sessions: progressData?.sessions || [],
          set_entries: progressData?.set_entries || [],
          run_entries: progressData?.run_entries || [],
          gtg_events: progressData?.gtg_events || [],
          emom_entries: progressData?.emom_entries || [],
          nutrition_history: finalNutrition,
        };

        setProgress(normalizedProgress);
        
        let initialSession = sessionData;
        
        const cachedHomeStr = sessionStorage.getItem(`homepage-metrics-${todayStr}`);
        const cachedTodayStr = sessionStorage.getItem(`today-session-${todayStr}`);
        let mergedCache: any = {};
        
        if (cachedTodayStr) {
          try { mergedCache = { ...mergedCache, ...JSON.parse(cachedTodayStr) }; } catch(e){}
        }
        if (cachedHomeStr) {
          try { mergedCache = { ...mergedCache, ...JSON.parse(cachedHomeStr) }; } catch(e){}
        }

        if (Object.keys(mergedCache).length > 0) {
          initialSession = { ...(initialSession || {}), ...mergedCache };
          
          const sIdx = normalizedProgress.sessions.findIndex((s: any) => s.date === todayStr);
          if (sIdx >= 0) {
            normalizedProgress.sessions[sIdx] = { ...normalizedProgress.sessions[sIdx], ...mergedCache };
          } else {
            normalizedProgress.sessions.push({ ...mergedCache, date: todayStr });
          }
        }

        setTodaySession(initialSession);
        setBodyweight(initialSession?.bodyweight ? String(initialSession.bodyweight) : '');
        setWaist(initialSession?.waist_circumference ? String(initialSession.waist_circumference) : '');
        const totalCalories = (initialSession?.calories_protein || 0) + (initialSession?.calories_carbs || 0) + (initialSession?.calories_fats || 0);
        setCalories(totalCalories > 0 ? String(Math.round(totalCalories)) : '');
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [todayStr]);

  const bodyweightRef = useRef(bodyweight);
  const waistRef = useRef(waist);
  const caloriesRef = useRef(calories);
  const sessionRef = useRef(todaySession);

  useEffect(() => {
    bodyweightRef.current = bodyweight;
    waistRef.current = waist;
    caloriesRef.current = calories;
    sessionRef.current = todaySession;
  }, [bodyweight, waist, calories, todaySession]);

  useEffect(() => {
    return () => {
      const currentSess = sessionRef.current || { 
        date: todayStr, weekday: getDay(new Date()), 
        set_entries: [], run_entries: [], emom_entries: [], 
        bodyweight: null, waist_circumference: null, 
        calories_protein: null, calories_carbs: null, calories_fats: null 
      };
      
      const unsubmittedBodyweight = parseFloat(bodyweightRef.current) || null;
      const unsubmittedWaist = parseFloat(waistRef.current) || null;
      const unsubmittedCalories = parseInt(caloriesRef.current) || null;

      const needsSave = 
        unsubmittedBodyweight !== currentSess.bodyweight ||
        unsubmittedWaist !== currentSess.waist_circumference ||
        unsubmittedCalories !== currentSess.calories_carbs;

      if (needsSave) {
        const payload = {
          date: currentSess.date,
          weekday: currentSess.weekday,
          bodyweight: String(unsubmittedBodyweight) !== String(currentSess.bodyweight || '') ? unsubmittedBodyweight : currentSess.bodyweight,
          waist_circumference: String(unsubmittedWaist) !== String(currentSess.waist_circumference || '') ? unsubmittedWaist : currentSess.waist_circumference,
          calories_carbs: String(unsubmittedCalories) !== String(currentSess.calories_carbs || '') ? unsubmittedCalories : currentSess.calories_carbs,
        };
        fetch('/api/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          keepalive: true
        }).catch(console.error);
        
        sessionStorage.setItem(`homepage-metrics-${todayStr}`, JSON.stringify(payload));
      }
    };
  }, [todayStr]);

  const sessionDateMap = useMemo(
    () => Object.fromEntries((progress.sessions || []).map((s: any) => [s.id, s.date])),
    [progress.sessions],
  );

  const chartData = useMemo(() => {
    const sessions = [...(progress.sessions || [])].sort((a: any, b: any) => a.date.localeCompare(b.date));

    if (selectedMetric === 'bodyweight') {
      return sessions
        .filter((s: any) => typeof s.bodyweight === 'number' && s.bodyweight > 0)
        .map((s: any) => ({ date: s.date.slice(5), value: s.bodyweight }));
    }

    if (selectedMetric === 'calories') {
      const nutritionRows = [...(progress.nutrition_history || [])]
        .map((row: any) => {
          const macroCalories = ((Number(row.protein_grams) || 0) * 4) + ((Number(row.carbs_grams) || 0) * 4) + ((Number(row.fat_grams) || 0) * 9);
          const directCalories = Number(row.calories) || 0;
          const totalCalories = directCalories > 0 ? directCalories : macroCalories;
          return {
            date: row.date,
            value: Math.round(totalCalories * 10) / 10,
          };
        })
        .filter((r: any) => r.date && r.value > 0)
        .sort((a: any, b: any) => a.date.localeCompare(b.date));

      if (nutritionRows.length > 0) {
        return nutritionRows.map((r: any) => ({ date: r.date.slice(5), value: r.value }));
      }

      return sessions
        .map((s: any) => ({
          date: s.date.slice(5),
          value: Math.round(((s.calories_protein || 0) + (s.calories_carbs || 0) + (s.calories_fats || 0)) * 10) / 10,
        }))
        .filter((r: any) => r.value > 0);
    }

    if (selectedMetric === 'run') {
      const runRows = (progress.run_entries || []).filter((r: any) => Number(r.distance) === 1.5 && Number(r.duration_seconds) > 0);
      return runRows
        .map((r: any) => ({ date: (sessionDateMap[r.session_id] || '').slice(5), value: Math.round((r.duration_seconds / 60) * 100) / 100 }))
        .filter((r: any) => r.date)
        .sort((a: any, b: any) => a.date.localeCompare(b.date));
    }

    if (selectedMetric === 'pushups') {
      const grouped: Record<string, number> = {};
      for (const row of progress.gtg_events || []) {
        if (row.type !== 'pushups') continue;
        grouped[row.date] = Math.max(grouped[row.date] || 0, Number(row.completed) || 0);
      }
      return Object.entries(grouped)
        .map(([date, value]) => ({ date: date.slice(5), value }))
        .sort((a, b) => a.date.localeCompare(b.date));
    }

    if (selectedMetric === 'plank') {
      const grouped: Record<string, number> = {};
      for (const row of progress.gtg_events || []) {
        if (row.type !== 'planks') continue;
        grouped[row.date] = Math.max(grouped[row.date] || 0, Number(row.completed) || 0);
      }
      return Object.entries(grouped)
        .map(([date, value]) => ({ date: date.slice(5), value }))
        .sort((a, b) => a.date.localeCompare(b.date));
    }

    const pullupNames = ['pull-ups', 'pull ups', 'pullups', 'pull up'];
    const grouped: Record<string, number> = {};
    for (const row of progress.set_entries || []) {
      const normalized = String(row.exercise_name || '').toLowerCase();
      if (!pullupNames.some((n) => normalized.includes(n))) continue;
      const date = sessionDateMap[row.session_id];
      if (!date) continue;
      grouped[date] = Math.max(grouped[date] || 0, Number(row.reps) || 0);
    }
    return Object.entries(grouped)
      .map(([date, value]) => ({ date: date.slice(5), value }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [progress, selectedMetric, sessionDateMap]);

  const activeMeta = METRICS.find((m) => m.key === selectedMetric)!;

  const yAxisDomain = useMemo<[number, number] | undefined>(() => {
    if (selectedMetric !== 'bodyweight' || chartData.length === 0) return undefined;
    const values = chartData.map((point: { value: number }) => point.value);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    return [minValue - 5, maxValue + 5];
  }, [chartData, selectedMetric]);

  const hasBodyweight = Number(todaySession?.bodyweight) > 0;
  const hasWaist = Number(todaySession?.waist_circumference) > 0;
  const hasCalories = Number((todaySession?.calories_protein || 0) + (todaySession?.calories_carbs || 0) + (todaySession?.calories_fats || 0)) > 0;

  const saveMetric = async (key: 'bodyweight' | 'waist' | 'calories') => {
    const existing = todaySession || {
      date: todayStr,
      weekday: getDay(new Date()),
      bodyweight: null,
      waist_circumference: null,
      calories_protein: null,
      calories_carbs: null,
      calories_fats: null,
    };

    const payload = {
      date: existing.date,
      weekday: existing.weekday,
      bodyweight: key === 'bodyweight' ? (parseFloat(bodyweight) || null) : (existing.bodyweight ?? null),
      waist_circumference: key === 'waist' ? (parseFloat(waist) || null) : (existing.waist_circumference ?? null),
      calories_protein: key === 'calories' ? null : (existing.calories_protein ?? null),
      calories_fats: key === 'calories' ? null : (existing.calories_fats ?? null),
      calories_carbs: key === 'calories' ? (parseInt(calories) || null) : (existing.calories_carbs ?? null),
    };

    setSavingKey(key);
    try {
      await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      sessionStorage.setItem(`homepage-metrics-${todayStr}`, JSON.stringify(payload));
      setTodaySession(payload);
      setProgress((prev: any) => {
        const nextSessions = [...(prev.sessions || [])];
        const idx = nextSessions.findIndex((s: any) => s.date === todayStr);
        const merged = { ...(idx >= 0 ? nextSessions[idx] : {}), ...payload };
        if (idx >= 0) nextSessions[idx] = merged;
        else nextSessions.push(merged);

        return { ...prev, sessions: nextSessions };
      });
      setEditMode((prev) => ({ ...prev, [key]: false }));
    } catch (err) {
      console.error(err);
    } finally {
      setSavingKey(null);
    }
  };

  const handleMetricAction = (key: 'bodyweight' | 'waist' | 'calories', hasValue: boolean) => {
    if (hasValue && !editMode[key]) {
      setEditMode((prev) => ({ ...prev, [key]: true }));
      return;
    }
    saveMetric(key);
  };

  if (loading) return <div className="p-6 text-center text-zinc-500">Loading dashboard...</div>;

  return (
    <div className="min-h-screen bg-zinc-50 p-4 space-y-4">
      <section className="bg-white rounded-2xl p-4 border border-zinc-100 shadow-sm">
        <h1 className="text-xl font-bold tracking-tight text-zinc-900">Dashboard</h1>
        <p className="text-xs text-zinc-500 mt-1">Track your key performance trends in one place.</p>
      </section>

      <section className="bg-white rounded-2xl p-4 border border-zinc-100 shadow-sm space-y-3">
        <h2 className="text-sm font-semibold text-zinc-800">Daily check-in</h2>

        <div className="grid grid-cols-[1fr_auto] gap-2 items-center">
          <input type="number" step="0.1" value={bodyweight} disabled={hasBodyweight && !editMode.bodyweight} onChange={(e) => setBodyweight(e.target.value)} onBlur={() => { if (!hasBodyweight || editMode.bodyweight) handleMetricAction('bodyweight', hasBodyweight); }} className={`w-full border rounded-lg px-3 py-2 text-sm ${hasBodyweight && !editMode.bodyweight ? 'bg-emerald-50 border-emerald-200 text-emerald-700 font-semibold' : 'bg-zinc-50 border-zinc-200'}`} placeholder="Bodyweight (lb)" />
          <button onClick={() => handleMetricAction('bodyweight', hasBodyweight)} disabled={savingKey === 'bodyweight'} className={`min-w-[92px] px-3 py-2 text-xs rounded-lg border ${hasBodyweight && !editMode.bodyweight ? 'bg-emerald-100 border-emerald-200 text-emerald-700' : 'bg-white border-zinc-200 text-zinc-700'}`}>
            {savingKey === 'bodyweight' ? 'Saving...' : hasBodyweight && !editMode.bodyweight ? <span className="inline-flex items-center gap-1"><Pencil className="w-3.5 h-3.5" /> Edit</span> : hasBodyweight ? 'Save edit' : 'Submit'}
          </button>
        </div>

        <div className="grid grid-cols-[1fr_auto] gap-2 items-center">
          <input type="number" step="0.1" value={waist} disabled={hasWaist && !editMode.waist} onChange={(e) => setWaist(e.target.value)} onBlur={() => { if (!hasWaist || editMode.waist) handleMetricAction('waist', hasWaist); }} className={`w-full border rounded-lg px-3 py-2 text-sm ${hasWaist && !editMode.waist ? 'bg-emerald-50 border-emerald-200 text-emerald-700 font-semibold' : 'bg-zinc-50 border-zinc-200'}`} placeholder="Waist (in)" />
          <button onClick={() => handleMetricAction('waist', hasWaist)} disabled={savingKey === 'waist'} className={`min-w-[92px] px-3 py-2 text-xs rounded-lg border ${hasWaist && !editMode.waist ? 'bg-emerald-100 border-emerald-200 text-emerald-700' : 'bg-white border-zinc-200 text-zinc-700'}`}>
            {savingKey === 'waist' ? 'Saving...' : hasWaist && !editMode.waist ? <span className="inline-flex items-center gap-1"><Pencil className="w-3.5 h-3.5" /> Edit</span> : hasWaist ? 'Save edit' : 'Submit'}
          </button>
        </div>

        <div className="grid grid-cols-[1fr_auto] gap-2 items-center">
          <input type="number" value={calories} disabled={hasCalories && !editMode.calories} onChange={(e) => setCalories(e.target.value)} onBlur={() => { if (!hasCalories || editMode.calories) handleMetricAction('calories', hasCalories); }} className={`w-full border rounded-lg px-3 py-2 text-sm ${hasCalories && !editMode.calories ? 'bg-emerald-50 border-emerald-200 text-emerald-700 font-semibold' : 'bg-zinc-50 border-zinc-200'}`} placeholder="Calories" />
          <button onClick={() => handleMetricAction('calories', hasCalories)} disabled={savingKey === 'calories'} className={`min-w-[92px] px-3 py-2 text-xs rounded-lg border ${hasCalories && !editMode.calories ? 'bg-emerald-100 border-emerald-200 text-emerald-700' : 'bg-white border-zinc-200 text-zinc-700'}`}>
            {savingKey === 'calories' ? 'Saving...' : hasCalories && !editMode.calories ? <span className="inline-flex items-center gap-1"><Pencil className="w-3.5 h-3.5" /> Edit</span> : hasCalories ? 'Save edit' : 'Submit'}
          </button>
        </div>
      </section>

      <section className="bg-white rounded-2xl p-4 border border-zinc-100 shadow-sm space-y-3">
        <select
          value={selectedMetric}
          onChange={(e) => setSelectedMetric(e.target.value as MetricKey)}
          className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm"
        >
          {METRICS.map((metric) => (
            <option key={metric.key} value={metric.key}>{metric.label}</option>
          ))}
        </select>

        <h2 className="text-sm font-semibold text-zinc-800">{activeMeta.label}</h2>
        <div className="h-64 bg-zinc-50 rounded-xl border border-zinc-200 p-2">
          {chartData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-zinc-500">No data yet for this chart.</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 12, right: 8, left: -14, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                <XAxis dataKey="date" fontSize={11} stroke="#71717a" />
                <YAxis fontSize={11} stroke="#71717a" domain={yAxisDomain} />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke={activeMeta.accent} strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>
    </div>
  );
}
