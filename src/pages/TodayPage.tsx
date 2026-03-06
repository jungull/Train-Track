import { useState, useEffect } from 'react';
import { format, subDays, getDay, parseISO } from 'date-fns';
import { ChevronLeft, ListTodo, Plus, Check, Info } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

const DAY_TEMPLATES: Record<number, any> = {
  1: { // Monday — PULL + Legs
    blocks: [
      { type: 'strength', title: 'PULL + Legs', exercises: ['Squats', 'Pull-ups', 'Rows', 'Curls', 'Rear Delt Flys', 'Shrugs'] },
      { type: 'cardio_easy', title: 'Light Jog', duration: 30 }
    ]
  },
  2: { // Tuesday — PUSH + Sprints
    blocks: [
      { type: 'run_interval', title: '250m Sprints' },
      { type: 'strength', title: 'PUSH + Sprints', exercises: ['Bench Press', 'Flys', 'Overhead Press', 'Lateral Raises', 'Tricep Extensions', 'Hanging Leg Raises'] }
    ]
  },
  3: { // Wednesday — PULL / CORE
    blocks: [
      { type: 'strength', title: 'PULL / CORE', exercises: ['Cable Crunch', 'Reverse Incline Crunches', 'Planks', 'Pull-ups', 'Rear Delt Flys'] }
    ]
  },
  4: { // Thursday — PUSH + Sprints
    blocks: [
      { type: 'run_interval', title: '250m Sprints' },
      { type: 'strength', title: 'PUSH + Sprints', exercises: ['Incline Dumbbell Press', 'Flys', 'Overhead Press', 'Lateral Raises', 'Tricep Extensions', 'Hanging Leg Raises'] }
    ]
  },
  5: { // Friday — PULL + Posterior Chain
    blocks: [
      { type: 'strength', title: 'PULL + Posterior Chain', exercises: ['Deadlifts', 'Row', 'Pull-ups', 'Curls', 'Rear Delt Flys', 'Shrugs'] },
      { type: 'cardio_easy', title: 'Light Jog', duration: 30 }
    ]
  },
  6: { // Saturday — Circuit + Volume
    blocks: [
      { type: 'run_interval', title: 'HIIT Circuit' },
      { type: 'strength', title: 'Circuit + Volume', exercises: ['Pushups', 'Curls', 'Side Raises', 'Tricep Extensions', 'Rear Delt Flys', 'Planks'] }
    ]
  },
  0: { // Sunday
    blocks: [
      { type: 'custom', title: 'Rest / Active Recovery' }
    ]
  }
};

export default function TodayPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const dateParam = searchParams.get('date');

  const [date, setDate] = useState(dateParam ? parseISO(dateParam) : new Date());
  const [session, setSession] = useState<any>(null);
  const [program, setProgram] = useState<any>(null);
  const [recentExercises, setRecentExercises] = useState<any[]>([]);
  const [bodyweight, setBodyweight] = useState('');
  const [loading, setLoading] = useState(true);

  const dateStr = format(date, 'yyyy-MM-dd');
  const weekday = getDay(date);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [todayRes, programRes, recentRes, e1rmRes] = await Promise.all([
          fetch(`/api/sessions?date=${dateStr}`),
          fetch('/api/program'),
          fetch('/api/exercises?type=recent'),
          fetch('/api/exercises?type=best1rm')
        ]);

        const todayData = await todayRes.json();
        const programData = await programRes.json();
        const recentData = await recentRes.json();
        const best1rmData: Record<string, number> = await e1rmRes.json();

        const todayProgram = programData.find((p: any) => p.weekday === weekday);
        if (todayProgram && todayProgram.exercises) {
          todayProgram.exercises = JSON.parse(todayProgram.exercises);
        }
        setProgram(todayProgram);
        setRecentExercises(recentData);

        if (todayData) {
          setSession(todayData);
          if (todayData.bodyweight) setBodyweight(todayData.bodyweight.toString());
        } else {
          // Initialize empty session with program exercises + smart weight pre-fill
          const initialSets: any[] = [];
          for (const item of (todayProgram?.exercises || [])) {
            if (item.type === 'circuit') {
              // Circuit: each exercise gets `rounds` sets
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
              // Regular exercise
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

          setSession({ date: dateStr, weekday, set_entries: initialSets, run_entries: [], emom_entries: [] });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [dateStr, weekday]);

  const handleSave = async () => {
    try {
      await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...session,
          bodyweight: parseFloat(bodyweight) || null,
        }),
      });
      navigate('/progress');
    } catch (err) {
      console.error(err);
    }
  };

  const getRecommendation = (exerciseName: string) => {
    const recent = recentExercises.find(e => e.exercise_name === exerciseName);
    if (!recent) return null;

    // Simple progressive overload logic: if they did it before, suggest +5 lbs or same weight + more reps
    const recWeight = recent.weight > 0 ? recent.weight + 5 : 0;
    return {
      last: `${recent.weight > 0 ? recent.weight + 'lb × ' : ''}${recent.reps} reps`,
      rec: `${recWeight > 0 ? recWeight + 'lb × ' : ''}${recent.reps} reps`,
      date: recent.date.substring(5)
    };
  };

  if (loading) return <div className="p-6 text-center text-zinc-500">Loading...</div>;

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 pb-24">
      {/* Header */}
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
        {/* Bodyweight */}
        <section className="bg-white rounded-2xl p-5 shadow-sm border border-zinc-100 flex items-center justify-between">
          <label className="text-sm font-semibold text-zinc-800">Bodyweight (lb)</label>
          <input
            type="number"
            step="0.1"
            value={bodyweight}
            onChange={(e) => setBodyweight(e.target.value)}
            className="w-24 text-right font-mono text-lg bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all"
            placeholder="0.0"
          />
        </section>

        {/* Program Block */}
        <section className="bg-white rounded-2xl p-5 shadow-sm border border-zinc-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-bold text-zinc-900">{program?.title || 'Custom Workout'}</h3>
            <span className="text-xs font-medium bg-zinc-100 text-zinc-500 px-2 py-1 rounded">
              {program?.exercises?.length || 0} exercises
            </span>
          </div>

          <div className="space-y-8">
            {/* Group existing sets by exercise name to render them together */}
            {Array.from(new Set(session?.set_entries?.map((e: any) => e.exercise_name))).map((ex: any) => {
              const rec = getRecommendation(ex);
              const sets = session.set_entries.filter((e: any) => e.exercise_name === ex);

              return (
                <div key={ex} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold text-zinc-800 uppercase tracking-wider">{ex}</h4>
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

                  <div className="space-y-2">
                    {sets.map((set: any, idx: number) => {
                      // Find the actual index in the full array to update correctly
                      const globalIdx = session.set_entries.findIndex((s: any) => s === set);

                      const cat = set.category || 'strength';

                      return (
                        <div key={idx} className="flex items-center gap-2">
                          <span className="text-xs font-mono text-zinc-400 w-4">{idx + 1}</span>

                          {cat === 'strength' && (
                            <>
                              <input type="number" placeholder="lbs" value={set.weight || ''} onChange={(e) => {
                                const newSets = [...session.set_entries];
                                newSets[globalIdx].weight = parseFloat(e.target.value);
                                setSession({ ...session, set_entries: newSets });
                              }} className="flex-1 bg-zinc-50 border border-zinc-200 rounded-md px-2 py-1.5 text-sm font-mono focus:ring-1 focus:ring-zinc-900" />
                              <span className="text-zinc-400 text-xs">×</span>
                            </>
                          )}

                          {(cat === 'strength' || cat === 'bodyweight') && (
                            <input type="number" placeholder="reps" value={set.reps || ''} onChange={(e) => {
                              const newSets = [...session.set_entries];
                              newSets[globalIdx].reps = parseInt(e.target.value);
                              setSession({ ...session, set_entries: newSets });
                            }} className="flex-1 bg-zinc-50 border border-zinc-200 rounded-md px-2 py-1.5 text-sm font-mono focus:ring-1 focus:ring-zinc-900" />
                          )}

                          {cat === 'run' && (
                            <>
                              <input type="number" placeholder="mi" value={set.distance || ''} onChange={(e) => {
                                const newSets = [...session.set_entries];
                                newSets[globalIdx].distance = parseFloat(e.target.value);
                                setSession({ ...session, set_entries: newSets });
                              }} className="flex-1 w-16 bg-zinc-50 border border-zinc-200 rounded-md px-2 py-1.5 text-sm font-mono focus:ring-1 focus:ring-zinc-900" />
                              <span className="text-zinc-400 text-xs text-center">mi</span>
                              <input type="number" placeholder="min" value={set.duration_seconds ? Math.round(set.duration_seconds / 60) : ''} onChange={(e) => {
                                const newSets = [...session.set_entries];
                                newSets[globalIdx].duration_seconds = parseInt(e.target.value) * 60;
                                setSession({ ...session, set_entries: newSets });
                              }} className="flex-1 w-16 bg-zinc-50 border border-zinc-200 rounded-md px-2 py-1.5 text-sm font-mono focus:ring-1 focus:ring-zinc-900" />
                              <span className="text-zinc-400 text-xs text-center">min</span>
                            </>
                          )}

                          {(cat === 'interval' || cat === 'sprint') && (
                            <>
                              <input type="number" placeholder="dist" value={set.distance || ''} onChange={(e) => {
                                const newSets = [...session.set_entries];
                                newSets[globalIdx].distance = parseFloat(e.target.value);
                                setSession({ ...session, set_entries: newSets });
                              }} className="flex-1 bg-zinc-50 border border-zinc-200 rounded-md px-2 py-1.5 text-sm font-mono focus:ring-1 focus:ring-zinc-900" />
                              <span className="text-zinc-400 text-xs">dist</span>
                              <input type="number" placeholder="sec" value={set.duration_seconds || ''} onChange={(e) => {
                                const newSets = [...session.set_entries];
                                newSets[globalIdx].duration_seconds = parseInt(e.target.value);
                                setSession({ ...session, set_entries: newSets });
                              }} className="flex-1 bg-zinc-50 border border-zinc-200 rounded-md px-2 py-1.5 text-sm font-mono focus:ring-1 focus:ring-zinc-900" />
                              <span className="text-zinc-400 text-xs">sec</span>
                            </>
                          )}

                          {cat === 'timed' && (
                            <>
                              <input type="number" placeholder="sec" value={set.duration_seconds || ''} onChange={(e) => {
                                const newSets = [...session.set_entries];
                                newSets[globalIdx].duration_seconds = parseInt(e.target.value);
                                setSession({ ...session, set_entries: newSets });
                              }} className="flex-1 bg-zinc-50 border border-zinc-200 rounded-md px-2 py-1.5 text-sm font-mono focus:ring-1 focus:ring-zinc-900" />
                              <span className="text-zinc-400 text-xs">sec</span>
                            </>
                          )}

                          <input type="number" placeholder="RPE" value={set.rpe || ''} onChange={(e) => {
                            const newSets = [...session.set_entries];
                            newSets[globalIdx].rpe = parseFloat(e.target.value);
                            setSession({ ...session, set_entries: newSets });
                          }} className="w-12 bg-zinc-50 border border-zinc-200 rounded-md px-1 py-1.5 text-sm font-mono focus:ring-1 focus:ring-zinc-900" />
                        </div>
                      );
                    })}
                    <button
                      onClick={() => {
                        const lastSet = sets[sets.length - 1];
                        setSession({
                          ...session,
                          set_entries: [...(session.set_entries || []), { block_title: program?.title || 'Custom', exercise_name: ex, set_index: sets.length + 1, weight: lastSet?.weight || null, reps: lastSet?.reps || null, rpe: null, category: lastSet?.category || 'strength', distance: lastSet?.distance || null, duration_seconds: lastSet?.duration_seconds || null }]
                        });
                      }}
                      className="flex items-center gap-1 text-xs font-medium text-zinc-500 hover:text-zinc-900 transition-colors py-1"
                    >
                      <Plus className="w-3 h-3" /> Add Set
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Add new exercise button */}
            <div className="pt-4 border-t border-zinc-100">
              <button
                onClick={() => {
                  const name = window.prompt("Exercise name:");
                  if (name) {
                    setSession({
                      ...session,
                      set_entries: [...(session.set_entries || []), { block_title: program?.title || 'Custom', exercise_name: name, set_index: 1, weight: null, reps: null, rpe: null }]
                    });
                  }
                }}
                className="w-full py-3 border-2 border-dashed border-zinc-200 rounded-xl text-sm font-medium text-zinc-500 hover:text-zinc-900 hover:border-zinc-300 hover:bg-zinc-50 transition-all flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" /> Add New Exercise
              </button>
            </div>
          </div>
        </section>

        {/* Finish Button */}
        <button
          onClick={handleSave}
          className="w-full bg-zinc-950 text-white font-semibold rounded-xl py-4 mt-8 shadow-lg shadow-zinc-900/20 active:scale-[0.98] transition-all"
        >
          Complete Workout
        </button>
      </div>
    </div>
  );
}
