import { useMemo, useState, useEffect, useRef } from 'react';
import { format, subDays, getDay, parseISO } from 'date-fns';
import { ChevronLeft, ListTodo, Plus, Check, Info, ChevronDown, ChevronUp, Trash2, GripVertical } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

const DAY_TEMPLATES: Record<number, any> = {
  1: {
    blocks: [
      { type: 'strength', title: 'PULL + Legs', exercises: ['Squats', 'Pull-ups', 'Rows', 'Curls', 'Rear Delt Flys', 'Shrugs'] },
      { type: 'cardio_easy', title: 'Light Jog', duration: 30 }
    ]
  },
  2: {
    blocks: [
      { type: 'run_interval', title: '250m Sprints' },
      { type: 'strength', title: 'PUSH + Sprints', exercises: ['Bench Press', 'Flys', 'Overhead Press', 'Lateral Raises', 'Tricep Extensions', 'Hanging Leg Raises'] }
    ]
  },
  3: {
    blocks: [
      { type: 'strength', title: 'PULL / CORE', exercises: ['Cable Crunch', 'Reverse Incline Crunches', 'Planks', 'Pull-ups', 'Rear Delt Flys'] }
    ]
  },
  4: {
    blocks: [
      { type: 'run_interval', title: '250m Sprints' },
      { type: 'strength', title: 'PUSH + Sprints', exercises: ['Incline Dumbbell Press', 'Flys', 'Overhead Press', 'Lateral Raises', 'Tricep Extensions', 'Hanging Leg Raises'] }
    ]
  },
  5: {
    blocks: [
      { type: 'strength', title: 'PULL + Posterior Chain', exercises: ['Deadlifts', 'Row', 'Pull-ups', 'Curls', 'Rear Delt Flys', 'Shrugs'] },
      { type: 'cardio_easy', title: 'Light Jog', duration: 30 }
    ]
  },
  6: {
    blocks: [
      { type: 'run_interval', title: 'HIIT Circuit' },
      { type: 'strength', title: 'Circuit + Volume', exercises: ['Pushups', 'Curls', 'Side Raises', 'Tricep Extensions', 'Rear Delt Flys', 'Planks'] }
    ]
  },
  0: {
    blocks: [{ type: 'custom', title: 'Rest / Active Recovery' }]
  }
};

export default function TodayPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const dateParam = searchParams.get('date');

  const [date] = useState(dateParam ? parseISO(dateParam) : new Date());
  const [session, setSession] = useState<any>(null);
  const [program, setProgram] = useState<any>(null);
  const [recentExercises, setRecentExercises] = useState<any[]>([]);
  const [expandedExercises, setExpandedExercises] = useState<Record<string, boolean>>({});
  const [exerciseOrder, setExerciseOrder] = useState<string[]>([]);
  const [completedExercises, setCompletedExercises] = useState<string[]>([]);
  const [isEditingExercises, setIsEditingExercises] = useState(false);
  const [draggedExercise, setDraggedExercise] = useState<string | null>(null);
  const [savingInline, setSavingInline] = useState(false);
  const [loading, setLoading] = useState(true);
  const sessionRef = useRef<any>(null);
  const inFlightSaveRef = useRef<Promise<void> | null>(null);
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());

  const dateStr = format(date, 'yyyy-MM-dd');
  const weekday = getDay(date);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [todayRes, programRes, progressRes] = await Promise.all([
          fetch(`/api/sessions?date=${dateStr}`),
          fetch('/api/program'),
          fetch('/api/progress')
        ]);

        const todayData = await todayRes.json();
        const programData = await programRes.json();
        const progressData = await progressRes.json();

        const sessions = progressData.sessions || [];
        const setEntries = progressData.set_entries || [];

        const best1rmData: Record<string, number> = {};
        for (const row of setEntries) {
          if (row.weight > 0 && row.reps > 0) {
            const e1rm = row.weight * (1 + row.reps / 30);
            if (!best1rmData[row.exercise_name] || e1rm > best1rmData[row.exercise_name]) {
              best1rmData[row.exercise_name] = Math.round(e1rm * 10) / 10;
            }
          }
        }

        const sessionMap = Object.fromEntries(sessions.map((s: any) => [s.id, s.date]));
        const sortedEntries = [...setEntries].sort((a, b) => b.id - a.id);
        const seen = new Set<string>();
        const recentData: any[] = [];
        for (const row of sortedEntries) {
          if (!seen.has(row.exercise_name)) {
            seen.add(row.exercise_name);
            recentData.push({
              exercise_name: row.exercise_name,
              weight: row.weight,
              reps: row.reps,
              date: sessionMap[row.session_id] || 'Unknown'
            });
          }
        }

        const todayProgram = programData.find((p: any) => p.weekday === weekday);
        if (todayProgram && todayProgram.exercises) {
          todayProgram.exercises = JSON.parse(todayProgram.exercises);
        }
        setProgram(todayProgram);
        setRecentExercises(recentData);

        if (todayData) {
          setSession(todayData);
        } else {
          const initialSets: any[] = [];
          for (const item of (todayProgram?.exercises || [])) {
            if (item.type === 'circuit') {
              for (const ex of item.exercises) {
                let prefillWeight: number | null = null;
                const best1rm = best1rmData[ex.name];
                if (best1rm && best1rm > 0 && ex.reps > 0) {
                  const rawWeight = best1rm / (1 + ex.reps / 30);
                  prefillWeight = Math.round(rawWeight / 5) * 5;
                  if (prefillWeight <= 0) prefillWeight = null;
                }
                for (let i = 0; i < (item.rounds || 1); i++) {
                  initialSets.push({
                    block_title: `Circuit × ${item.rounds}`,
                    exercise_name: ex.name,
                    set_index: i + 1,
                    weight: prefillWeight,
                    reps: ex.reps || null,
                    rpe: null,
                    category: ex.category || 'strength',
                    distance: ex.distance || null,
                    duration_seconds: ex.duration ? (ex.category === 'run' ? ex.duration * 60 : ex.duration) : null,
                  });
                }
              }
            } else {
              let prefillWeight: number | null = null;
              const best1rm = best1rmData[item.name];
              if (best1rm && best1rm > 0 && item.reps > 0) {
                const rawWeight = best1rm / (1 + item.reps / 30);
                prefillWeight = Math.round(rawWeight / 5) * 5;
                if (prefillWeight <= 0) prefillWeight = null;
              }
              for (let i = 0; i < (item.sets || 1); i++) {
                initialSets.push({
                  block_title: todayProgram.title,
                  exercise_name: item.name,
                  set_index: i + 1,
                  weight: prefillWeight,
                  reps: item.reps || null,
                  rpe: null,
                  category: item.category || 'strength',
                  distance: item.distance || null,
                  duration_seconds: item.duration ? (item.category === 'run' ? item.duration * 60 : item.duration) : null,
                });
              }
            }
          }

          setSession({
            date: dateStr,
            weekday,
            bodyweight: null,
            waist_circumference: null,
            calories_protein: null,
            calories_carbs: null,
            calories_fats: null,
            set_entries: initialSets,
            run_entries: [],
            emom_entries: []
          });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [dateStr, weekday]);


  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const saveSessionToApi = async (nextSession: any) => {
    const response = await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(nextSession),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Session save failed (${response.status}): ${errorText}`);
    }
  };

  useEffect(() => {
    const names: string[] = Array.from(new Set((session?.set_entries || []).map((e: any) => String(e.exercise_name))));
    setExerciseOrder(prev => {
      const kept = prev.filter(name => names.includes(name));
      const added = names.filter(name => !kept.includes(name));
      return [...kept, ...added];
    });
    setExpandedExercises(prev => {
      const next: Record<string, boolean> = {};
      for (const name of names) next[name] = prev[name] ?? false;
      return next;
    });
    setCompletedExercises(prev => prev.filter(name => names.includes(name)));
  }, [session?.set_entries]);

  const normalizeSetIndices = (entries: any[]) => {
    const counts: Record<string, number> = {};
    return entries.map((entry) => {
      counts[entry.exercise_name] = (counts[entry.exercise_name] || 0) + 1;
      return { ...entry, set_index: counts[entry.exercise_name] };
    });
  };

  const persistSession = async (nextSession: any) => {
    setSession(nextSession);
    sessionRef.current = nextSession;
    setSavingInline(true);

    const savePromise = saveQueueRef.current
      .catch(() => undefined)
      .then(() => saveSessionToApi(nextSession));

    saveQueueRef.current = savePromise;
    inFlightSaveRef.current = savePromise;

    try {
      await savePromise;
    } catch (err) {
      console.error(err);
    } finally {
      if (inFlightSaveRef.current === savePromise) {
        inFlightSaveRef.current = null;
      }
      if (saveQueueRef.current === savePromise) {
        setSavingInline(false);
      }
    }
  };

  const moveExercise = (fromName: string, toName: string) => {
    if (fromName === toName) return;
    setExerciseOrder(prev => {
      const next = [...prev];
      const from = next.indexOf(fromName);
      const to = next.indexOf(toName);
      if (from < 0 || to < 0) return prev;
      next.splice(from, 1);
      next.splice(to, 0, fromName);
      return next;
    });
  };


  const knownExerciseNames = useMemo(() => {
    const names = new Set<string>();
    for (const name of exerciseOrder) {
      if (name) names.add(String(name));
    }
    for (const row of recentExercises) {
      if (row?.exercise_name) names.add(String(row.exercise_name));
    }
    for (const entry of session?.set_entries || []) {
      if (entry?.exercise_name) names.add(String(entry.exercise_name));
    }
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [exerciseOrder, recentExercises, session?.set_entries]);

  const renameExercise = (currentName: string, nextNameRaw: string) => {
    const nextName = nextNameRaw.trim();
    if (!nextName || nextName === currentName) return;

    const nextEntries = (session.set_entries || []).map((entry: any) =>
      entry.exercise_name === currentName ? { ...entry, exercise_name: nextName } : entry,
    );

    const nextOrder: string[] = [];
    for (const name of exerciseOrder) {
      const mapped = name === currentName ? nextName : name;
      if (!nextOrder.includes(mapped)) nextOrder.push(mapped);
    }

    setSession({ ...session, set_entries: normalizeSetIndices(nextEntries) });
    setExerciseOrder(nextOrder);
    setCompletedExercises((prev) => {
      const mapped = prev.map((name) => (name === currentName ? nextName : name));
      return mapped.filter((name, index) => mapped.indexOf(name) === index);
    });
  };

  const getRecommendation = (exerciseName: string) => {
    const recent = recentExercises.find(e => e.exercise_name === exerciseName);
    if (!recent) return null;

    const recWeight = recent.weight > 0 ? recent.weight + 5 : 0;
    return {
      last: `${recent.weight > 0 ? `${recent.weight}lb × ` : ''}${recent.reps} reps`,
      rec: `${recWeight > 0 ? `${recWeight}lb × ` : ''}${recent.reps} reps`,
      date: recent.date.substring(5)
    };
  };

  if (loading) return <div className="p-6 text-center text-zinc-500">Loading...</div>;

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 pb-24">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-zinc-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-zinc-500 hover:text-zinc-900 transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Today</h1>
            <p className="text-xs text-zinc-500 font-medium">{format(date, 'EEEE, MMM d')}</p>
          </div>
        </div>
        <Link to="/program" className="p-2 -mr-2 text-zinc-500 hover:text-zinc-900 transition-colors">
          <ListTodo className="w-5 h-5" />
        </Link>
      </header>

      <div className="flex-1 p-4 space-y-6">
        <section className="bg-white rounded-2xl p-5 shadow-sm border border-zinc-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-bold text-zinc-900">{program?.title || 'Custom Workout'}</h3>
            <button
              onClick={() => setIsEditingExercises(prev => !prev)}
              className={`text-xs px-3 py-1.5 rounded-md border ${isEditingExercises ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-white text-zinc-600 border-zinc-200'}`}
            >
              {isEditingExercises ? 'Done editing' : 'Edit'}
            </button>
          </div>

          <div className="space-y-4">
            {[...exerciseOrder]
              .sort((a, b) => {
                const aDone = completedExercises.includes(a);
                const bDone = completedExercises.includes(b);
                return aDone === bDone ? 0 : aDone ? 1 : -1;
              })
              .map((ex: any) => {
                const rec = getRecommendation(ex);
                const sets = session.set_entries.filter((e: any) => e.exercise_name === ex);
                const isDone = completedExercises.includes(ex);
                const isExpanded = expandedExercises[ex] || false;

                return (
                  <div
                    key={ex}
                    draggable={isEditingExercises}
                    onDragStart={() => setDraggedExercise(ex)}
                    onDragOver={(e) => {
                      if (isEditingExercises) e.preventDefault();
                    }}
                    onDrop={() => {
                      if (!isEditingExercises || !draggedExercise) return;
                      moveExercise(draggedExercise, ex);
                      setDraggedExercise(null);
                    }}
                    className={`space-y-3 rounded-xl border p-3 ${isDone ? 'bg-emerald-50/70 border-emerald-200' : 'bg-zinc-50 border-zinc-200'} ${isEditingExercises ? 'cursor-move' : ''}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <button onClick={() => setExpandedExercises(prev => ({ ...prev, [ex]: !isExpanded }))} className="flex items-center gap-2 min-w-0 text-left">
                        <h4 className="text-xs font-semibold text-zinc-800 uppercase tracking-wider truncate">{ex}</h4>
                        {isExpanded ? <ChevronUp className="w-3 h-3 text-zinc-500" /> : <ChevronDown className="w-3 h-3 text-zinc-500" />}
                      </button>
                      {isEditingExercises && <GripVertical className="w-4 h-4 text-zinc-400" />}
                    </div>

                    {rec && (
                      <div className="flex items-start gap-2 bg-blue-50/50 border border-blue-100/50 rounded-lg p-3 text-xs">
                        <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <p className="text-blue-900/80"><span className="font-semibold">Last ({rec.date}):</span> {rec.last}</p>
                          <p className="text-blue-900/80"><span className="font-semibold">Target:</span> {rec.rec}</p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] text-zinc-500">{sets.length} set{sets.length === 1 ? '' : 's'}</p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            const isMarkingDone = !isDone;
                            setCompletedExercises(prev => isMarkingDone ? [...prev, ex] : prev.filter(name => name !== ex));
                          }}
                          className={`text-[11px] px-2 py-1 rounded-md border ${isDone ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-white text-zinc-600 border-zinc-200'}`}
                        >
                          {isDone ? 'Done' : 'Mark done'}
                        </button>
                        {isEditingExercises && (
                          <>
                            <div className="flex items-center gap-1">
                              <input
                                list="exercise-name-options"
                                defaultValue={ex}
                                onKeyDown={(e) => {
                                  if (e.key !== 'Enter') return;
                                  renameExercise(ex, (e.currentTarget as HTMLInputElement).value);
                                }}
                                className="w-32 bg-white border border-zinc-200 rounded-md px-2 py-1 text-[11px] text-zinc-700"
                                aria-label={`Rename ${ex}`}
                              />
                              <button
                                onClick={(e) => {
                                  const input = (e.currentTarget.previousElementSibling as HTMLInputElement | null);
                                  renameExercise(ex, input?.value || ex);
                                }}
                                className="text-[11px] px-2 py-1 rounded-md border bg-white text-zinc-600 border-zinc-200"
                              >
                                Save
                              </button>
                            </div>
                            <button
                              onClick={() => {
                                const nextEntries = (session.set_entries || []).filter((entry: any) => entry.exercise_name !== ex);
                                setSession({ ...session, set_entries: normalizeSetIndices(nextEntries) });
                                setExerciseOrder(prev => prev.filter(name => name !== ex));
                                setCompletedExercises(prev => prev.filter(name => name !== ex));
                              }}
                              className="text-[11px] px-2 py-1 rounded-md border bg-white text-rose-600 border-rose-200"
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {isExpanded && <div className="space-y-2">
                      {sets.map((set: any, idx: number) => {
                        const globalIdx = session.set_entries.findIndex((s: any) => s === set);
                        const cat = set.category || 'strength';

                        return (
                          <div key={idx} className="flex items-center gap-2 min-w-0 flex-wrap">
                            <span className="text-xs font-mono text-zinc-400 w-4 shrink-0">{idx + 1}</span>

                            {cat === 'strength' && (
                              <>
                                <input type="number" placeholder="lbs" value={set.weight || ''} onChange={(e) => {
                                  const newSets = [...session.set_entries];
                                  newSets[globalIdx].weight = parseFloat(e.target.value);
                                  setSession({ ...session, set_entries: newSets });
                                }} className="w-24 min-w-[5.5rem] shrink-0 bg-zinc-50 border border-zinc-200 rounded-md px-2 py-1.5 text-sm font-mono focus:ring-1 focus:ring-zinc-900" />
                                <span className="text-zinc-400 text-xs shrink-0">×</span>
                              </>
                            )}

                            {(cat === 'strength' || cat === 'bodyweight') && (
                              <input type="number" placeholder="reps" value={set.reps || ''} onChange={(e) => {
                                const newSets = [...session.set_entries];
                                newSets[globalIdx].reps = parseInt(e.target.value);
                                setSession({ ...session, set_entries: newSets });
                              }} className="w-20 shrink-0 bg-zinc-50 border border-zinc-200 rounded-md px-2 py-1.5 text-sm font-mono focus:ring-1 focus:ring-zinc-900" />
                            )}

                            {cat === 'run' && (
                              <>
                                <input type="number" placeholder="mi" value={set.distance || ''} onChange={(e) => {
                                  const newSets = [...session.set_entries];
                                  newSets[globalIdx].distance = parseFloat(e.target.value);
                                  setSession({ ...session, set_entries: newSets });
                                }} className="w-16 shrink-0 bg-zinc-50 border border-zinc-200 rounded-md px-2 py-1.5 text-sm font-mono focus:ring-1 focus:ring-zinc-900" />
                                <span className="text-zinc-400 text-xs text-center shrink-0">mi</span>
                                <input type="number" placeholder="min" value={set.duration_seconds ? Math.round(set.duration_seconds / 60) : ''} onChange={(e) => {
                                  const newSets = [...session.set_entries];
                                  newSets[globalIdx].duration_seconds = parseInt(e.target.value) * 60;
                                  setSession({ ...session, set_entries: newSets });
                                }} className="w-16 shrink-0 bg-zinc-50 border border-zinc-200 rounded-md px-2 py-1.5 text-sm font-mono focus:ring-1 focus:ring-zinc-900" />
                                <span className="text-zinc-400 text-xs text-center shrink-0">min</span>
                              </>
                            )}

                            {(cat === 'interval' || cat === 'sprint') && (
                              <>
                                <input type="number" placeholder="dist" value={set.distance || ''} onChange={(e) => {
                                  const newSets = [...session.set_entries];
                                  newSets[globalIdx].distance = parseFloat(e.target.value);
                                  setSession({ ...session, set_entries: newSets });
                                }} className="w-20 shrink-0 bg-zinc-50 border border-zinc-200 rounded-md px-2 py-1.5 text-sm font-mono focus:ring-1 focus:ring-zinc-900" />
                                <span className="text-zinc-400 text-xs shrink-0">dist</span>
                                <input type="number" placeholder="sec" value={set.duration_seconds || ''} onChange={(e) => {
                                  const newSets = [...session.set_entries];
                                  newSets[globalIdx].duration_seconds = parseInt(e.target.value);
                                  setSession({ ...session, set_entries: newSets });
                                }} className="w-20 shrink-0 bg-zinc-50 border border-zinc-200 rounded-md px-2 py-1.5 text-sm font-mono focus:ring-1 focus:ring-zinc-900" />
                                <span className="text-zinc-400 text-xs shrink-0">sec</span>
                              </>
                            )}

                            {cat === 'timed' && (
                              <>
                                <input type="number" placeholder="sec" value={set.duration_seconds || ''} onChange={(e) => {
                                  const newSets = [...session.set_entries];
                                  newSets[globalIdx].duration_seconds = parseInt(e.target.value);
                                  setSession({ ...session, set_entries: newSets });
                                }} className="w-20 shrink-0 bg-zinc-50 border border-zinc-200 rounded-md px-2 py-1.5 text-sm font-mono focus:ring-1 focus:ring-zinc-900" />
                                <span className="text-zinc-400 text-xs shrink-0">sec</span>
                              </>
                            )}

                            <input type="number" placeholder="RPE" value={set.rpe || ''} onChange={(e) => {
                              const newSets = [...session.set_entries];
                              newSets[globalIdx].rpe = parseFloat(e.target.value);
                              setSession({ ...session, set_entries: newSets });
                            }} className="w-14 shrink-0 bg-zinc-50 border border-zinc-200 rounded-md px-1 py-1.5 text-sm font-mono focus:ring-1 focus:ring-zinc-900" />
                            <button
                              onClick={async () => {
                                const nextEntries = session.set_entries.filter((_: any, entryIndex: number) => entryIndex !== globalIdx);
                                const next = { ...session, set_entries: normalizeSetIndices(nextEntries) };
                                await persistSession(next);
                              }}
                              className="p-1 text-rose-500 hover:text-rose-700"
                              title="Remove set"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={async () => {
                                const nextEntries = [...session.set_entries];
                                const currentlyLogged = Boolean(nextEntries[globalIdx]?.logged);
                                nextEntries[globalIdx] = {
                                  ...nextEntries[globalIdx],
                                  logged: !currentlyLogged,
                                  logged_at: !currentlyLogged ? new Date().toISOString() : null,
                                };
                                await persistSession({ ...session, set_entries: nextEntries });
                              }}
                              className={`text-[10px] px-2 py-1 rounded-md border ${set.logged ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-white text-zinc-500 border-zinc-200'}`}
                            >
                              {set.logged ? 'Logged' : 'Log'}
                            </button>
                          </div>
                        );
                      })}
                      <button
                        onClick={async () => {
                          const lastSet = sets[sets.length - 1];
                          const next = {
                            ...session,
                            set_entries: [...(session.set_entries || []), { block_title: program?.title || 'Custom', exercise_name: ex, set_index: sets.length + 1, weight: lastSet?.weight || null, reps: lastSet?.reps || null, rpe: null, category: lastSet?.category || 'strength', distance: lastSet?.distance || null, duration_seconds: lastSet?.duration_seconds || null }]
                          };
                          await persistSession(next);
                        }}
                        className="flex items-center gap-1 text-xs font-medium text-zinc-500 hover:text-zinc-900 transition-colors py-1"
                      >
                        <Plus className="w-3 h-3" /> Add Set
                      </button>
                    </div>}
                  </div>
                );
              })}

            <datalist id="exercise-name-options">
              {knownExerciseNames.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>

            <div className="pt-4 border-t border-zinc-100">
              <button
                onClick={async () => {
                  const name = window.prompt('Exercise name:');
                  if (name) {
                    const next = {
                      ...session,
                      set_entries: [...(session.set_entries || []), { block_title: program?.title || 'Custom', exercise_name: name, set_index: 1, weight: null, reps: null, rpe: null, category: 'strength', logged: 0, logged_at: null }]
                    };
                    await persistSession(next);
                    setExpandedExercises(prev => ({ ...prev, [name]: true }));
                  }
                }}
                className="w-full py-3 border-2 border-dashed border-zinc-200 rounded-xl text-sm font-medium text-zinc-500 hover:text-zinc-900 hover:border-zinc-300 hover:bg-zinc-50 transition-all flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" /> Add New Exercise
              </button>
            </div>
          </div>
        </section>

        <p className="text-xs text-center text-zinc-500">{savingInline ? 'Saving changes…' : 'Sets save when you tap Log.'}</p>
      </div>
    </div>
  );
}
