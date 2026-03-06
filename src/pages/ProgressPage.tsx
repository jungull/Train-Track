import { useState, useEffect } from 'react';
import { Activity, Edit2, Check, X } from 'lucide-react';
import { cn } from '../App';

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
  date: string;
};

type GroupedData = {
  [category: string]: {
    [exerciseName: string]: {
      [date: string]: ExerciseLogEntry[];
    };
  };
};

export default function ProgressPage() {
  const [data, setData] = useState<ExerciseLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('strength');
  const [editingExercise, setEditingExercise] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const fetchLog = async () => {
    try {
      const res = await fetch('/api/exercises?type=log');
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLog();
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

  if (loading) return <div className="p-6 text-center text-zinc-500">Loading...</div>;

  // Group data by category -> exercise -> date
  const grouped: GroupedData = {};
  const allDates = new Set<string>();

  data.forEach(entry => {
    const cat = entry.category || 'strength';
    if (!grouped[cat]) grouped[cat] = {};
    if (!grouped[cat][entry.exercise_name]) grouped[cat][entry.exercise_name] = {};
    if (!grouped[cat][entry.exercise_name][entry.date]) grouped[cat][entry.exercise_name][entry.date] = [];

    grouped[cat][entry.exercise_name][entry.date].push(entry);
    allDates.add(entry.date);
  });

  const sortedDates = Array.from(allDates).sort((a, b) => b.localeCompare(a)); // Newest first
  const categories = Object.keys(grouped).sort();

  // If active tab has no data, default to first available
  if (categories.length > 0 && !grouped[activeTab]) {
    setActiveTab(categories[0]);
  }

  const renderCellContent = (entries: ExerciseLogEntry[], category: string) => {
    if (!entries || entries.length === 0) return <span className="text-zinc-300">—</span>;

    // Summarize the sets for the day
    if (category === 'strength' || category === 'bodyweight') {
      const bestSet = entries.reduce((best, current) => {
        const bestVol = (best.weight || 0) * (best.reps || 0);
        const currVol = (current.weight || 0) * (current.reps || 0);
        return currVol > bestVol ? current : best;
      }, entries[0]);

      const parts = [];
      if (entries.length > 1) parts.push(`${entries.length}s`);
      if (bestSet.weight) parts.push(`${bestSet.weight}lb`);
      if (bestSet.reps) parts.push(`${bestSet.reps}r`);
      return <span className="text-zinc-700">{parts.join(' ')}</span>;
    }

    if (category === 'run') {
      const totalDist = entries.reduce((sum, e) => sum + (e.distance || 0), 0);
      const totalSecs = entries.reduce((sum, e) => sum + (e.duration_seconds || 0), 0);
      return <span className="text-zinc-700">{totalDist}mi / {Math.round(totalSecs / 60)}m</span>;
    }

    if (category === 'sprint' || category === 'interval') {
      const distance = entries[0].distance || 0;
      return <span className="text-zinc-700">{entries.length}×{distance}</span>;
    }

    if (category === 'timed') {
      const totalSecs = entries.reduce((sum, e) => sum + (e.duration_seconds || 0), 0);
      return <span className="text-zinc-700">{entries.length}s / {Math.round(totalSecs / 60)}m</span>;
    }

    return <span className="text-zinc-700">{entries.length} sets</span>;
  };

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 pb-24">
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-zinc-200 px-4 py-3">
        <h1 className="text-lg font-semibold tracking-tight flex items-center gap-2">
          <Activity className="w-5 h-5 text-zinc-400" />
          Workout Log
        </h1>
      </header>

      <div className="flex-1 p-4 space-y-4">
        {/* Tabs */}
        {categories.length > 0 && (
          <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide">
            {categories.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors capitalize",
                  activeTab === tab ? "bg-zinc-900 text-white" : "bg-zinc-200/50 text-zinc-600 hover:bg-zinc-200"
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
                    {sortedDates.map(date => (
                      <th key={date} className="p-3 font-medium text-zinc-500 text-center min-w-[100px]">
                        {date.substring(5).replace('-', '/')}
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
                      {sortedDates.map(date => (
                        <td key={date} className="p-3 text-center">
                          {renderCellContent(grouped[activeTab][exName][date], activeTab)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-zinc-500">
              No exercises logged yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
