import { useState, useEffect, useMemo } from 'react';
import { Activity, Edit2, Check, X, TrendingUp, History, ChevronDown } from 'lucide-react';
import { cn } from '../App';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

type ExerciseLogEntry = {
  id: number;
  session_id: number;
  block_title: string;
  exercise_name: string;
  set_index: number;
  weight: number | null;
  reps: number | null;
  rpe: number | null;
  category: string;
  distance: number | null;
  duration_seconds: number | null;
  minutes: number | null;
  date: string;
};

type SessionInfo = {
  id: number;
  date: string;
  bodyweight: number | null;
  waist_circumference: number | null;
  calories_protein: number | null;
  calories_carbs: number | null;
  calories_fats: number | null;
  notes: string | null;
};

type GroupedData = {
  [category: string]: {
    [exerciseName: string]: {
      [date: string]: ExerciseLogEntry[];
    };
  };
};

export default function ProgressPage() {
  const [entries, setEntries] = useState<ExerciseLogEntry[]>([]);
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('strength');
  const [viewMode, setViewMode] = useState<'log' | 'trends'>('log');

  // Edit State
  const [editingExercise, setEditingExercise] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  // Trends State
  const [selectedTrendExercise, setSelectedTrendExercise] = useState<string>('');

  const fetchLog = async () => {
    try {
      const res = await fetch('/api/progress');
      const json = await res.json();
      const { sessions: s, set_entries, run_entries, emom_entries } = json;

      setSessions(s);

      const sessionMap = Object.fromEntries(s.map((sess: any) => [sess.id, sess.date]));

      const unified: ExerciseLogEntry[] = [
        ...(set_entries || []).map((e: any) => ({ ...e, date: sessionMap[e.session_id] || 'Unknown' })),
        ...(run_entries || []).map((e: any) => ({
          ...e,
          exercise_name: e.run_type,
          category: 'run',
          date: sessionMap[e.session_id] || 'Unknown'
        })),
        ...(emom_entries || []).map((e: any) => ({
          ...e,
          exercise_name: e.block_title,
          category: 'emom',
          date: sessionMap[e.session_id] || 'Unknown'
        }))
      ];

      setEntries(unified);

      // Default trend exercise
      const strengthEx = Array.from(new Set(unified.filter(e => e.category === 'strength').map(e => e.exercise_name))).sort();
      if (strengthEx.length > 0 && !selectedTrendExercise) {
        setSelectedTrendExercise(strengthEx[strengthEx.length > 5 ? 0 : 0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLog();

    // Catch late-arriving writes from Today inline saves when users navigate quickly.
    const retry = window.setTimeout(() => {
      fetchLog();
    }, 1200);

    return () => window.clearTimeout(retry);
  }, []);

  const handleRename = async (oldName: string) => {
    if (!editName.trim() || editName === oldName) {
      setEditingExercise(null);
      return;
    }
    try {
      await fetch('/api/rename', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldName, newName: editName.trim() }),
      });
      await fetchLog();
      setEditingExercise(null);
    } catch (err) {
      console.error(err);
    }
  };

  // Grouped Data for Pivot Table
  const { grouped, sortedDates, categories } = useMemo(() => {
    const g: GroupedData = {};
    const dates = new Set<string>();

    entries.forEach(entry => {
      const cat = entry.category || 'strength';
      if (!g[cat]) g[cat] = {};
      if (!g[cat][entry.exercise_name]) g[cat][entry.exercise_name] = {};
      if (!g[cat][entry.exercise_name][entry.date]) g[cat][entry.exercise_name][entry.date] = [];

      g[cat][entry.exercise_name][entry.date].push(entry);
      dates.add(entry.date);
    });

    return {
      grouped: g,
      sortedDates: Array.from(dates).sort((a, b) => b.localeCompare(a)),
      categories: Object.keys(g).sort()
    };
  }, [entries]);

  // Trends Calculation
  const weightTrendData = useMemo(() => {
    return sessions
      .filter(s => s.bodyweight)
      .map(s => ({
        date: s.date.substring(5).replace('-', '/'),
        weight: s.bodyweight,
        fullDate: s.date
      }))
      .sort((a, b) => a.fullDate.localeCompare(b.fullDate));
  }, [sessions]);


  const waistTrendData = useMemo(() => {
    return sessions
      .filter(s => s.waist_circumference)
      .map(s => ({
        date: s.date.substring(5).replace('-', '/'),
        waist: s.waist_circumference,
        fullDate: s.date
      }))
      .sort((a, b) => a.fullDate.localeCompare(b.fullDate));
  }, [sessions]);

  const macroTrendData = useMemo(() => {
    return sessions
      .filter(s => s.calories_protein || s.calories_carbs || s.calories_fats)
      .map(s => ({
        date: s.date.substring(5).replace('-', '/'),
        protein: s.calories_protein || 0,
        carbs: s.calories_carbs || 0,
        fats: s.calories_fats || 0,
        total: (s.calories_protein || 0) + (s.calories_carbs || 0) + (s.calories_fats || 0),
        fullDate: s.date
      }))
      .sort((a, b) => a.fullDate.localeCompare(b.fullDate));
  }, [sessions]);

  const exerciseTrendData = useMemo(() => {
    if (!selectedTrendExercise) return [];

    const exEntries = entries.filter(e => e.exercise_name === selectedTrendExercise);
    const byDate: Record<string, number> = {};

    exEntries.forEach(e => {
      if (e.weight && e.reps) {
        const e1rm = e.weight * (1 + e.reps / 30);
        if (!byDate[e.date] || e1rm > byDate[e.date]) {
          byDate[e.date] = Math.round(e1rm * 10) / 10;
        }
      }
    });

    return Object.entries(byDate)
      .map(([date, oneRM]) => ({
        date: date.substring(5).replace('-', '/'),
        oneRM,
        fullDate: date
      }))
      .sort((a, b) => a.fullDate.localeCompare(b.fullDate));
  }, [entries, selectedTrendExercise]);

  const strengthExercises = useMemo(() => {
    return Array.from(new Set(entries.filter(e => e.category === 'strength').map(e => e.exercise_name))).sort();
  }, [entries]);

  if (loading) return <div className="p-6 text-center text-zinc-500">Loading...</div>;

  const renderCellContent = (cellEntries: ExerciseLogEntry[], category: string) => {
    if (!cellEntries || cellEntries.length === 0) return <span className="text-zinc-300">—</span>;

    if (category === 'strength' || category === 'bodyweight') {
      const bestSet = cellEntries.reduce((best, current) => {
        const bestVol = (best.weight || 1) * (best.reps || 1);
        const currVol = (current.weight || 1) * (current.reps || 1);
        return currVol > bestVol ? current : best;
      }, cellEntries[0]);

      const parts = [];
      if (cellEntries.length > 1) parts.push(`${cellEntries.length}s`);
      if (bestSet.weight) parts.push(`${bestSet.weight}lb`);
      if (bestSet.reps) parts.push(`${bestSet.reps}r`);
      if (!bestSet.weight && !bestSet.reps && cellEntries.length === 1) return <span className="text-zinc-700">Done</span>;
      return <span className="text-zinc-700">{parts.join(' ')}</span>;
    }

    if (category === 'run') {
      const totalDist = cellEntries.reduce((sum, e) => sum + (e.distance || 0), 0);
      const totalSecs = cellEntries.reduce((sum, e) => sum + (e.duration_seconds || 0), 0);
      return <span className="text-zinc-700">{totalDist}mi / {Math.round(totalSecs / 60)}m</span>;
    }

    if (category === 'emom') {
      const minutes = cellEntries[0].minutes || 0;
      return <span className="text-zinc-700">{minutes}m EMOM</span>;
    }

    return <span className="text-zinc-700">{cellEntries.length} sets</span>;
  };

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 pb-24">
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-zinc-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold tracking-tight flex items-center gap-2 text-zinc-900">
            {viewMode === 'log' ? <History className="w-5 h-5 text-zinc-400" /> : <TrendingUp className="w-5 h-5 text-amber-500" />}
            {viewMode === 'log' ? 'Workout Log' : 'Progress Trends'}
          </h1>

          <div className="flex bg-zinc-100 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('log')}
              className={cn(
                "px-3 py-1.5 text-xs font-semibold rounded-md transition-all",
                viewMode === 'log' ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
              )}
            >
              Log
            </button>
            <button
              onClick={() => setViewMode('trends')}
              className={cn(
                "px-3 py-1.5 text-xs font-semibold rounded-md transition-all",
                viewMode === 'trends' ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
              )}
            >
              Trends
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 p-4 space-y-4 max-w-md mx-auto w-full">
        {viewMode === 'log' ? (
          <>
            {/* Tabs */}
            {categories.length > 0 && (
              <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide">
                {categories.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors capitalize",
                      activeTab === tab ? "bg-zinc-900 text-white" : "bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50"
                    )}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            )}

            {/* Pivot Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 overflow-hidden">
              {grouped[activeTab] ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm whitespace-nowrap">
                    <thead>
                      <tr className="bg-zinc-50 border-b border-zinc-100">
                        <th className="sticky left-0 z-10 bg-zinc-50 p-3 font-semibold text-zinc-600 min-w-[140px] shadow-[1px_0_0_0_#f4f4f5]">
                          Exercise
                        </th>
                        {sortedDates.map(dt => (
                          <th key={dt} className="p-3 font-medium text-zinc-500 text-center min-w-[80px]">
                            {dt.substring(5).replace('-', '/')}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {Object.keys(grouped[activeTab]).sort().map(exName => (
                        <tr key={exName} className="hover:bg-zinc-50/50 transition-colors">
                          <td className="sticky left-0 z-10 bg-white p-3 font-medium text-zinc-900 shadow-[1px_0_0_0_#f4f4f5] group">
                            {editingExercise === exName ? (
                              <div className="flex items-center gap-1">
                                <input
                                  type="text"
                                  value={editName}
                                  onChange={e => setEditName(e.target.value)}
                                  className="w-24 px-1.5 py-1 text-sm border border-zinc-300 rounded outline-none focus:border-zinc-500"
                                  autoFocus
                                  onKeyDown={e => e.key === 'Enter' && handleRename(exName)}
                                />
                                <button onClick={() => handleRename(exName)} className="text-green-600 p-0.5 hover:bg-green-50 rounded">
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => setEditingExercise(null)} className="text-zinc-400 p-0.5 hover:bg-zinc-100 rounded">
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between">
                                <span>{exName}</span>
                                <button
                                  onClick={() => { setEditingExercise(exName); setEditName(exName); }}
                                  className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-zinc-600 p-1 transition-opacity"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </td>
                          {sortedDates.map(dt => (
                            <td key={dt} className="p-3 text-center">
                              {renderCellContent(grouped[activeTab][exName][dt], activeTab)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-12 text-center text-zinc-400">
                  <Activity className="w-8 h-8 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">No {activeTab} logs yet.</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="space-y-6">
            {/* Bodyweight Trend */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-zinc-100 space-y-4">
              <h2 className="font-bold text-zinc-900 flex items-center justify-between">
                Bodyweight Progress
                <span className="text-xs font-normal text-zinc-400">lbs</span>
              </h2>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={weightTrendData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#a1a1aa' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#a1a1aa' }} domain={['dataMin - 5', 'dataMax + 5']} />
                    <Tooltip
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      labelStyle={{ fontWeight: 'bold', marginBottom: '4px' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="weight"
                      stroke="#18181b"
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: '#18181b', strokeWidth: 2, stroke: '#fff' }}
                      activeDot={{ r: 6, fill: '#18181b', strokeWidth: 0 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Waist Trend */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-zinc-100 space-y-4">
              <h2 className="font-bold text-zinc-900 flex items-center justify-between">
                Waist Circumference
                <span className="text-xs font-normal text-zinc-400">inches</span>
              </h2>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={waistTrendData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#a1a1aa' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#a1a1aa' }} domain={['dataMin - 1', 'dataMax + 1']} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Line type="monotone" dataKey="waist" stroke="#0f766e" strokeWidth={2.5} dot={{ r: 4, fill: '#0f766e', strokeWidth: 2, stroke: '#fff' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Macro Calories */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-zinc-100 space-y-4">
              <h2 className="font-bold text-zinc-900">Calories by Macro Consumed</h2>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={macroTrendData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#a1a1aa' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#a1a1aa' }} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Legend />
                    <Line type="monotone" dataKey="protein" stroke="#2563eb" strokeWidth={2} dot={false} name="Protein cals" />
                    <Line type="monotone" dataKey="carbs" stroke="#f59e0b" strokeWidth={2} dot={false} name="Carb cals" />
                    <Line type="monotone" dataKey="fats" stroke="#dc2626" strokeWidth={2} dot={false} name="Fat cals" />
                    <Line type="monotone" dataKey="total" stroke="#18181b" strokeWidth={2.5} dot={{ r: 3, fill: '#18181b' }} name="Total cals" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Exercise 1RM Trend */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-zinc-100 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-zinc-900">Exercise 1RM Trend</h2>
                <div className="relative">
                  <select
                    value={selectedTrendExercise}
                    onChange={(e) => setSelectedTrendExercise(e.target.value)}
                    className="appearance-none bg-zinc-100 text-zinc-700 text-xs font-semibold px-3 py-1.5 pr-8 rounded-lg outline-none border-none cursor-pointer"
                  >
                    {strengthExercises.map(ex => (
                      <option key={ex} value={ex}>{ex}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-3 h-3 absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                </div>
              </div>

              <div className="h-64 w-full">
                {exerciseTrendData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={exerciseTrendData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#a1a1aa' }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#a1a1aa' }} domain={['dataMin - 10', 'dataMax + 10']} />
                      <Tooltip
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        labelStyle={{ fontWeight: 'bold', marginBottom: '4px' }}
                      />
                      <Line
                        type="monotone"
                        dataKey="oneRM"
                        name="Est. 1RM"
                        stroke="#f59e0b"
                        strokeWidth={2.5}
                        dot={{ r: 4, fill: '#f59e0b', strokeWidth: 2, stroke: '#fff' }}
                        activeDot={{ r: 6, fill: '#f59e0b', strokeWidth: 0 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-zinc-400">
                    <TrendingUp className="w-8 h-8 opacity-10 mb-2" />
                    <p className="text-sm">Not enough data to chart.</p>
                  </div>
                )}
              </div>
              <p className="text-[10px] text-zinc-400 text-center italic">
                *Estimated 1RM using Brzycki formula: weight × (1 + reps / 30)
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
