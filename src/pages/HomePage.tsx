import { useEffect, useMemo, useState } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

type MetricKey = 'bodyweight' | 'calories' | 'run' | 'pushups' | 'plank' | 'pullups';

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

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/progress');
        const data = await res.json();
        setProgress(data || { sessions: [], set_entries: [], run_entries: [], gtg_events: [] });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

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

  if (loading) return <div className="p-6 text-center text-zinc-500">Loading dashboard...</div>;

  return (
    <div className="min-h-screen bg-zinc-50 p-4 space-y-4">
      <section className="bg-white rounded-2xl p-4 border border-zinc-100 shadow-sm">
        <h1 className="text-xl font-bold tracking-tight text-zinc-900">Dashboard</h1>
        <p className="text-xs text-zinc-500 mt-1">Track your key performance trends in one place.</p>
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
                <YAxis fontSize={11} stroke="#71717a" />
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
