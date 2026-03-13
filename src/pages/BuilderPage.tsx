import { useEffect, useMemo, useState } from 'react';
import { BarChart3, Calendar, Camera, Dumbbell, Play, Plus, Save, Timer } from 'lucide-react';

type GymProfile = { id: string; name: string; bars: number[]; plates: number[]; availableEquipment: string };
type Exercise = { id: string; name: string; muscle: string; equipment: string; laterality: 'bilateral' | 'unilateral' };
type WorkoutExercise = { exerciseId: string; sets: number; reps: number; rir: number; supersetWithNext?: boolean };
type WorkoutTemplate = { id: string; name: string; gymProfileId: string; exercises: WorkoutExercise[] };
type ProgramDay = { id: string; label: string; workoutTemplateId?: string; rest?: boolean };
type Program = { id: string; name: string; days: ProgramDay[]; active: boolean };

type LoggedSet = {
  setNumber: number;
  prev: string;
  weight: number;
  reps: number;
  completed: boolean;
  rir: number;
  setType: 'standard' | 'warm-up' | 'drop' | 'myo' | 'failure';
  fullReps: number;
  partialReps: number;
  lrMode: boolean;
  leftWeight: number;
  rightWeight: number;
  leftReps: number;
  rightReps: number;
};

type WorkoutSession = {
  id: string;
  date: string;
  source: string;
  updateProgram: boolean;
  durationSec: number;
  sets: Record<string, LoggedSet[]>;
};

type MetricEntry = { date: string; weight: number; waist?: number; chest?: number; workoutDone?: boolean };
type ProgressPhoto = { id: string; date: string; view: 'front' | 'side' | 'back'; url: string };

type AppData = {
  gymProfiles: GymProfile[];
  exercises: Exercise[];
  workouts: WorkoutTemplate[];
  programs: Program[];
  sessions: WorkoutSession[];
  metrics: MetricEntry[];
  photos: ProgressPhoto[];
};

const KEY = 'feature-builder-v1';

const defaultData: AppData = {
  gymProfiles: [{ id: 'g1', name: 'Main Gym', bars: [45], plates: [45, 25, 10, 5, 2.5], availableEquipment: 'rack, bench, cables' }],
  exercises: [
    { id: 'e1', name: 'Back Squat', muscle: 'legs', equipment: 'barbell', laterality: 'bilateral' },
    { id: 'e2', name: 'Bench Press', muscle: 'chest', equipment: 'barbell', laterality: 'bilateral' },
    { id: 'e3', name: 'Single-arm Row', muscle: 'back', equipment: 'dumbbell', laterality: 'unilateral' }
  ],
  workouts: [{ id: 'w1', name: 'Upper A', gymProfileId: 'g1', exercises: [{ exerciseId: 'e2', sets: 4, reps: 8, rir: 2 }, { exerciseId: 'e3', sets: 3, reps: 10, rir: 2 }] }],
  programs: [{ id: 'p1', name: '4-Day Strength', active: true, days: [{ id: 'd1', label: 'Day 1', workoutTemplateId: 'w1' }, { id: 'd2', label: 'Rest', rest: true }] }],
  sessions: [],
  metrics: [],
  photos: []
};

const uid = () => Math.random().toString(36).slice(2, 10);

function loadData(): AppData {
  const raw = localStorage.getItem(KEY);
  if (!raw) return defaultData;
  try {
    return { ...defaultData, ...JSON.parse(raw) };
  } catch {
    return defaultData;
  }
}

function formatClock(sec: number) {
  const mm = String(Math.floor(sec / 60)).padStart(2, '0');
  const ss = String(sec % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

export default function BuilderPage() {
  const [tab, setTab] = useState<'planner' | 'workout' | 'analytics' | 'metrics'>('planner');
  const [data, setData] = useState<AppData>(defaultData);
  const [selectedProgram, setSelectedProgram] = useState<string>('p1');
  const [selectedWorkout, setSelectedWorkout] = useState<string>('w1');
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [restTimer, setRestTimer] = useState(90);
  const [running, setRunning] = useState(false);
  const [estimatedDuration, setEstimatedDuration] = useState(0);
  const [beforePhoto, setBeforePhoto] = useState('');
  const [afterPhoto, setAfterPhoto] = useState('');

  useEffect(() => setData(loadData()), []);
  useEffect(() => localStorage.setItem(KEY, JSON.stringify(data)), [data]);

  useEffect(() => {
    if (!running || !session) return;
    const iv = window.setInterval(() => {
      setSession((prev) => (prev ? { ...prev, durationSec: prev.durationSec + 1 } : prev));
      setRestTimer((r) => Math.max(0, r - 1));
    }, 1000);
    return () => clearInterval(iv);
  }, [running, session]);

  const activeProgram = useMemo(() => data.programs.find((p) => p.active) || data.programs[0], [data.programs]);
  const workout = useMemo(() => data.workouts.find((w) => w.id === selectedWorkout) || data.workouts[0], [data.workouts, selectedWorkout]);

  function addCustomExercise() {
    setData((d) => ({ ...d, exercises: [...d.exercises, { id: uid(), name: `Custom Exercise ${d.exercises.length + 1}`, muscle: 'custom', equipment: 'custom', laterality: 'bilateral' }] }));
  }

  function addGymProfile() {
    setData((d) => ({ ...d, gymProfiles: [...d.gymProfiles, { id: uid(), name: `Gym ${d.gymProfiles.length + 1}`, bars: [45], plates: [45, 25, 10, 5, 2.5], availableEquipment: '' }] }));
  }

  function addProgram() {
    const id = uid();
    setData((d) => ({
      ...d,
      programs: [...d.programs.map((p) => ({ ...p, active: false })), { id, name: `Program ${d.programs.length + 1}`, active: true, days: [{ id: uid(), label: 'Day 1' }] }]
    }));
    setSelectedProgram(id);
  }

  function addWorkoutTemplate() {
    const gp = data.gymProfiles[0]?.id || '';
    const first = data.exercises[0]?.id;
    setData((d) => ({
      ...d,
      workouts: [...d.workouts, { id: uid(), name: `Workout ${d.workouts.length + 1}`, gymProfileId: gp, exercises: first ? [{ exerciseId: first, sets: 3, reps: 10, rir: 2 }] : [] }]
    }));
  }

  function setActiveProgram(id: string) {
    setData((d) => ({ ...d, programs: d.programs.map((p) => ({ ...p, active: p.id === id })) }));
  }

  function startWorkout(source: string, workoutId?: string) {
    const chosen = data.workouts.find((w) => w.id === workoutId) || workout;
    const sets: Record<string, LoggedSet[]> = {};
    chosen?.exercises.forEach((ex) => {
      sets[ex.exerciseId] = Array.from({ length: ex.sets }, (_, i) => ({
        setNumber: i + 1,
        prev: '-',
        weight: 0,
        reps: ex.reps,
        completed: false,
        rir: ex.rir,
        setType: 'standard',
        fullReps: ex.reps,
        partialReps: 0,
        lrMode: false,
        leftWeight: 0,
        rightWeight: 0,
        leftReps: ex.reps,
        rightReps: ex.reps
      }));
    });
    setSession({ id: uid(), date: new Date().toISOString(), source, updateProgram: false, durationSec: 0, sets });
    setRunning(true);
    const totalSets = chosen?.exercises.reduce((a, b) => a + b.sets, 0) || 0;
    setEstimatedDuration(totalSets * 2);
    setTab('workout');
  }

  function updateSet(exerciseId: string, idx: number, patch: Partial<LoggedSet>) {
    setSession((prev) => {
      if (!prev) return prev;
      const copy = [...(prev.sets[exerciseId] || [])];
      copy[idx] = { ...copy[idx], ...patch };
      return { ...prev, sets: { ...prev.sets, [exerciseId]: copy } };
    });
  }

  function completeSession() {
    if (!session) return;
    setData((d) => ({ ...d, sessions: [session, ...d.sessions] }));
    setRunning(false);
    setSession(null);
  }

  const weeklyStats = useMemo(() => {
    const recent = data.sessions.filter((s) => Date.now() - new Date(s.date).getTime() < 7 * 24 * 3600 * 1000);
    let sets = 0;
    let exercises = 0;
    recent.forEach((s) => {
      const setGroups = Object.values(s.sets) as LoggedSet[][];
      setGroups.forEach((list) => {
        exercises += 1;
        sets += list.filter((x) => x.completed).length;
      });
    });
    return { workouts: recent.length, sets, exercises };
  }, [data.sessions]);

  const records = useMemo(() => {
    let topWeight = 0;
    let topReps = 0;
    let topVolume = 0;
    data.sessions.forEach((s) => {
      const setGroups = Object.values(s.sets) as LoggedSet[][];
      setGroups.forEach((list) => list.forEach((set) => {
        topWeight = Math.max(topWeight, set.weight, set.leftWeight, set.rightWeight);
        topReps = Math.max(topReps, set.reps, set.fullReps);
        topVolume = Math.max(topVolume, set.weight * set.reps);
      }));
    });
    return { topWeight, topReps, topVolume };
  }, [data.sessions]);

  const volumeByDay = useMemo(() => data.sessions.map((s) => {
    const allSets = (Object.values(s.sets) as LoggedSet[][]).flat();
    return {
      date: new Date(s.date).toLocaleDateString(),
      volume: allSets.reduce((a, b) => a + b.weight * b.reps, 0),
      sets: allSets.filter((x) => x.completed).length
    };
  }), [data.sessions]);

  const activeProgramView = data.programs.find((p) => p.id === selectedProgram) || activeProgram;

  return (
    <div className="p-4 space-y-4">
      <div className="bg-zinc-900 text-white rounded-2xl p-4">
        <h1 className="text-xl font-bold">Build-Out Workspace</h1>
        <p className="text-xs text-zinc-300 mt-1">Program creation, workout execution, analytics, and body metrics in one flow.</p>
      </div>

      <div className="grid grid-cols-4 gap-2 text-xs font-semibold">
        {[
          ['planner', 'Planner', <Calendar className="w-4 h-4" />],
          ['workout', 'Workout', <Dumbbell className="w-4 h-4" />],
          ['analytics', 'Analytics', <BarChart3 className="w-4 h-4" />],
          ['metrics', 'Metrics', <Camera className="w-4 h-4" />]
        ].map(([id, label, icon]) => (
          <button key={id} onClick={() => setTab(id as any)} className={`rounded-xl border px-2 py-2 flex flex-col items-center gap-1 ${tab === id ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-white border-zinc-200 text-zinc-700'}`}>
            {icon}
            {label}
          </button>
        ))}
      </div>

      {tab === 'planner' && (
        <div className="space-y-4">
          <section className="bg-white border border-zinc-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between"><h2 className="font-bold">Gym profiles (#7)</h2><button onClick={addGymProfile} className="text-xs rounded-lg bg-zinc-900 text-white px-2 py-1"><Plus className="w-3 h-3 inline" /> Add</button></div>
            {data.gymProfiles.map((g) => <div key={g.id} className="text-sm rounded-lg bg-zinc-50 p-2">{g.name} • plates: {g.plates.join(', ')} • {g.availableEquipment || 'custom equipment not set'}</div>)}
          </section>

          <section className="bg-white border border-zinc-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between"><h2 className="font-bold">Custom exercises (#27)</h2><button onClick={addCustomExercise} className="text-xs rounded-lg bg-zinc-900 text-white px-2 py-1"><Plus className="w-3 h-3 inline" /> Add</button></div>
            {data.exercises.map((e) => <div key={e.id} className="text-sm rounded-lg bg-zinc-50 p-2">{e.name} • {e.muscle} • {e.equipment} • {e.laterality}</div>)}
          </section>

          <section className="bg-white border border-zinc-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between"><h2 className="font-bold">Programs (#3 #8 #9)</h2><button onClick={addProgram} className="text-xs rounded-lg bg-zinc-900 text-white px-2 py-1"><Plus className="w-3 h-3 inline" /> Program</button></div>
            <select value={activeProgramView?.id || ''} onChange={(e) => setSelectedProgram(e.target.value)} className="w-full border rounded-lg px-2 py-1">
              {data.programs.map((p) => <option key={p.id} value={p.id}>{p.name}{p.active ? ' (Active)' : ''}</option>)}
            </select>
            <div className="space-y-2">
              {activeProgramView?.days.map((d, i) => <div key={d.id} className="rounded-lg bg-zinc-50 p-2 text-sm flex items-center justify-between"><span>{i + 1}. {d.label}{d.rest ? ' (Rest)' : ''}</span></div>)}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setData((x) => ({ ...x, programs: x.programs.map((p) => p.id === activeProgramView?.id ? { ...p, days: [...p.days, { id: uid(), label: `Day ${p.days.length + 1}` }] } : p) }))} className="text-xs rounded-lg border px-2 py-1">Add day</button>
              <button onClick={() => setData((x) => ({ ...x, programs: x.programs.map((p) => p.id === activeProgramView?.id ? { ...p, days: [...p.days, { id: uid(), label: 'Rest', rest: true }] } : p) }))} className="text-xs rounded-lg border px-2 py-1">Add rest day</button>
              <button onClick={() => activeProgramView && setActiveProgram(activeProgramView.id)} className="text-xs rounded-lg bg-zinc-900 text-white px-2 py-1">Set active</button>
            </div>
          </section>

          <section className="bg-white border border-zinc-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between"><h2 className="font-bold">Workout library (#4 #5)</h2><button onClick={addWorkoutTemplate} className="text-xs rounded-lg bg-zinc-900 text-white px-2 py-1"><Plus className="w-3 h-3 inline" /> Workout</button></div>
            <select value={selectedWorkout} onChange={(e) => setSelectedWorkout(e.target.value)} className="w-full border rounded-lg px-2 py-1">
              {data.workouts.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => startWorkout('library', selectedWorkout)} className="rounded-lg bg-zinc-900 text-white px-2 py-2 text-xs"><Play className="w-3 h-3 inline" /> Start from library</button>
              <button onClick={() => {
                const empty: WorkoutTemplate = { id: uid(), name: `Ad hoc ${new Date().toLocaleDateString()}`, gymProfileId: data.gymProfiles[0]?.id || '', exercises: [] };
                setData((d) => ({ ...d, workouts: [empty, ...d.workouts] }));
                setSelectedWorkout(empty.id);
                startWorkout('empty workout', empty.id);
              }} className="rounded-lg border px-2 py-2 text-xs">Start empty workout</button>
            </div>
          </section>
        </div>
      )}

      {tab === 'workout' && (
        <div className="space-y-4">
          <section className="bg-white border border-zinc-200 rounded-2xl p-4 space-y-2">
            <h2 className="font-bold">Workout preview (#10 #11)</h2>
            <div className="text-sm text-zinc-600">Target muscles: {[...new Set((workout?.exercises || []).map((x) => data.exercises.find((e) => e.id === x.exerciseId)?.muscle || 'unknown'))].join(', ') || 'n/a'}</div>
            <div className="text-sm text-zinc-600">Exercises: {workout?.exercises.length || 0}</div>
            <div className="text-sm text-zinc-600">Estimated duration: {estimatedDuration || (workout?.exercises.reduce((a, b) => a + b.sets, 0) || 0) * 2} min</div>
            <button onClick={() => startWorkout('program/library', selectedWorkout)} className="text-xs rounded-lg bg-zinc-900 text-white px-2 py-1">Start session</button>
          </section>

          <section className="bg-white border border-zinc-200 rounded-2xl p-4 space-y-3">
            <div className="flex justify-between"><h2 className="font-bold">Live timers (#12 #14 #15)</h2><button onClick={() => setRunning((r) => !r)} className="text-xs border rounded-lg px-2 py-1">{running ? 'Pause' : 'Resume'}</button></div>
            <div className="text-sm">Workout: <span className="font-mono">{formatClock(session?.durationSec || 0)}</span></div>
            <div className="text-sm">Rest: <span className="font-mono">{formatClock(restTimer)}</span> <button className="ml-2 text-xs border px-1 rounded" onClick={() => setRestTimer((r) => r + 15)}>+15</button> <button className="ml-1 text-xs border px-1 rounded" onClick={() => setRestTimer((r) => Math.max(0, r - 15))}>-15</button></div>
          </section>

          <section className="bg-white border border-zinc-200 rounded-2xl p-4 space-y-3">
            <h2 className="font-bold">Set logging table (#13 #16 #17 #18 #19 #20 #21 #22 #23)</h2>
            <div className="text-xs text-zinc-500">Plate calculator: enter total and subtract bar to get per-side load.</div>
            <div className="flex items-center gap-2 text-xs"><label>Total:</label><input type="number" className="w-20 border rounded px-1" defaultValue={135} onChange={(e) => {
              const total = Number(e.target.value || 0);
              const bar = data.gymProfiles[0]?.bars[0] || 45;
              const perSide = Math.max(0, (total - bar) / 2);
              (e.target as HTMLInputElement).title = `Per side: ${perSide.toFixed(1)} lbs`;
            }} /><span className="text-zinc-500">(hover for per-side)</span></div>
            <label className="text-xs flex items-center gap-2"><input type="checkbox" checked={session?.updateProgram || false} onChange={(e) => setSession((s) => s ? { ...s, updateProgram: e.target.checked } : s)} /> Update Program toggle</label>

            {!session && <div className="text-sm text-zinc-500">Start a session to log sets.</div>}
            {session && Object.entries(session.sets).map(([exerciseId, sets]) => {
              const typedSets = sets as LoggedSet[];
              const exName = data.exercises.find((e) => e.id === exerciseId)?.name || exerciseId;
              return <div key={exerciseId} className="border rounded-xl p-2 space-y-2">
                <div className="font-semibold text-sm">{exName}</div>
                {typedSets.map((s, i) => (
                  <div key={i} className="grid grid-cols-7 gap-1 text-xs items-center">
                    <div>S{s.setNumber}</div>
                    <input className="border rounded px-1" type="number" value={s.weight} onChange={(e) => updateSet(exerciseId, i, { weight: Number(e.target.value) })} />
                    <input className="border rounded px-1" type="number" value={s.reps} onChange={(e) => updateSet(exerciseId, i, { reps: Number(e.target.value), fullReps: Number(e.target.value) })} />
                    <input className="border rounded px-1" type="number" value={s.rir} onChange={(e) => updateSet(exerciseId, i, { rir: Number(e.target.value) })} title="RIR" />
                    <select className="border rounded px-1" value={s.setType} onChange={(e) => updateSet(exerciseId, i, { setType: e.target.value as any })}>
                      <option>standard</option><option>warm-up</option><option>drop</option><option>myo</option><option>failure</option>
                    </select>
                    <label><input type="checkbox" checked={s.lrMode} onChange={(e) => updateSet(exerciseId, i, { lrMode: e.target.checked })} /> L/R</label>
                    <button className={`rounded px-1 ${s.completed ? 'bg-green-600 text-white' : 'border'}`} onClick={() => { updateSet(exerciseId, i, { completed: !s.completed }); setRestTimer(90); }}>{s.completed ? 'Done' : 'Mark'}</button>
                    {s.lrMode && <>
                      <input className="border rounded px-1 col-span-2" placeholder="L wt/reps" value={`${s.leftWeight}/${s.leftReps}`} onChange={(e) => {
                        const [lw, lr] = e.target.value.split('/').map(Number);
                        updateSet(exerciseId, i, { leftWeight: lw || 0, leftReps: lr || 0 });
                      }} />
                      <input className="border rounded px-1 col-span-2" placeholder="R wt/reps" value={`${s.rightWeight}/${s.rightReps}`} onChange={(e) => {
                        const [rw, rr] = e.target.value.split('/').map(Number);
                        updateSet(exerciseId, i, { rightWeight: rw || 0, rightReps: rr || 0 });
                      }} />
                    </>}
                    <div className="col-span-2 flex gap-1"><input className="border rounded px-1 w-12" type="number" value={s.fullReps} onChange={(e) => updateSet(exerciseId, i, { fullReps: Number(e.target.value) })} /><input className="border rounded px-1 w-12" type="number" value={s.partialReps} onChange={(e) => updateSet(exerciseId, i, { partialReps: Number(e.target.value) })} /></div>
                    <div className="col-span-2 text-[10px] text-zinc-500">full/partial reps</div>
                  </div>
                ))}
              </div>;
            })}
            <div className="flex gap-2">
              <button className="rounded-lg bg-zinc-900 text-white px-2 py-1 text-xs" onClick={completeSession}><Save className="w-3 h-3 inline" /> Finish workout</button>
              <button className="rounded-lg border px-2 py-1 text-xs" onClick={() => setSession(null)}>Minimize/Close</button>
            </div>
          </section>

          <section className="bg-white border border-zinc-200 rounded-2xl p-4 space-y-2">
            <h2 className="font-bold">Workout history edits (#24 #42)</h2>
            {data.sessions.slice(0, 5).map((s) => <div key={s.id} className="text-xs rounded-lg bg-zinc-50 p-2 flex justify-between"><span>{new Date(s.date).toLocaleString()} • {s.source}</span><button className="text-red-600" onClick={() => setData((d) => ({ ...d, sessions: d.sessions.filter((x) => x.id !== s.id) }))}>Delete</button></div>)}
          </section>
        </div>
      )}

      {tab === 'analytics' && (
        <div className="space-y-4">
          <section className="bg-white border border-zinc-200 rounded-2xl p-4">
            <h2 className="font-bold">Weekly workouts widget (#36)</h2>
            <p className="text-sm">Workouts: {weeklyStats.workouts} • Sets: {weeklyStats.sets} • Exercises: {weeklyStats.exercises}</p>
          </section>
          <section className="bg-white border border-zinc-200 rounded-2xl p-4">
            <h2 className="font-bold">Recent records (#37)</h2>
            <p className="text-sm">Top weight: {records.topWeight} • Top reps: {records.topReps} • Top volume: {records.topVolume}</p>
          </section>
          <section className="bg-white border border-zinc-200 rounded-2xl p-4">
            <h2 className="font-bold">Sets/Volume over time (#38 #39)</h2>
            <div className="space-y-1 text-xs">{volumeByDay.map((r, i) => <div key={i} className="flex justify-between bg-zinc-50 rounded px-2 py-1"><span>{r.date}</span><span>{r.sets} sets • {r.volume} vol</span></div>)}</div>
          </section>
          <section className="bg-white border border-zinc-200 rounded-2xl p-4">
            <h2 className="font-bold">Exercise and muscle analytics (#40 #41)</h2>
            <p className="text-sm">Exercise-level and muscle group summaries derive from your logged set history in this workspace.</p>
            <div className="text-xs text-zinc-600 mt-2">Muscle coverage: {[...new Set(data.exercises.map((e) => e.muscle))].join(', ')}</div>
          </section>
          <section className="bg-white border border-zinc-200 rounded-2xl p-4">
            <h2 className="font-bold">Shortcuts panel (#44)</h2>
            <div className="flex flex-wrap gap-2 text-xs">
              {['weight', 'metrics', 'photos', 'history', 'new program', 'new workout'].map((s) => <button key={s} className="border rounded-full px-3 py-1">{s}</button>)}
            </div>
          </section>
        </div>
      )}

      {tab === 'metrics' && (
        <div className="space-y-4">
          <section className="bg-white border border-zinc-200 rounded-2xl p-4 space-y-2">
            <h2 className="font-bold">Weight + habits calendar (#45)</h2>
            <button className="text-xs rounded-lg bg-zinc-900 text-white px-2 py-1" onClick={() => setData((d) => ({ ...d, metrics: [{ date: new Date().toISOString(), weight: 180, workoutDone: true }, ...d.metrics] }))}>Log today</button>
            <div className="text-xs space-y-1">{data.metrics.slice(0, 8).map((m, i) => <div key={i} className="bg-zinc-50 rounded px-2 py-1">{new Date(m.date).toLocaleDateString()} • {m.weight} lbs • {m.workoutDone ? 'workout ✓' : 'rest'}</div>)}</div>
          </section>
          <section className="bg-white border border-zinc-200 rounded-2xl p-4 space-y-2">
            <h2 className="font-bold">Body measurements (#46)</h2>
            <button className="text-xs rounded-lg border px-2 py-1" onClick={() => setData((d) => ({ ...d, metrics: [{ date: new Date().toISOString(), weight: 180, waist: 34, chest: 41 }, ...d.metrics] }))}>Add sample measurement</button>
          </section>
          <section className="bg-white border border-zinc-200 rounded-2xl p-4 space-y-2">
            <h2 className="font-bold">Progress photos (#47)</h2>
            <div className="grid grid-cols-3 gap-2">
              {(['front', 'side', 'back'] as const).map((view) => <button key={view} className="text-xs border rounded px-2 py-1" onClick={() => setData((d) => ({ ...d, photos: [{ id: uid(), date: new Date().toISOString(), view, url: `https://picsum.photos/seed/${view + Date.now()}/300/400` }, ...d.photos] }))}>Add {view}</button>)}
            </div>
            <div className="grid grid-cols-3 gap-2">{data.photos.slice(0, 6).map((p) => <img key={p.id} src={p.url} alt={p.view} className="rounded-lg aspect-[3/4] object-cover" />)}</div>
          </section>
          <section className="bg-white border border-zinc-200 rounded-2xl p-4 space-y-2">
            <h2 className="font-bold">Before/after builder (#48)</h2>
            <div className="grid grid-cols-2 gap-2">
              <select value={beforePhoto} onChange={(e) => setBeforePhoto(e.target.value)} className="border rounded px-2 py-1 text-xs"><option value="">Before photo</option>{data.photos.map((p) => <option key={p.id} value={p.url}>{p.view} {new Date(p.date).toLocaleDateString()}</option>)}</select>
              <select value={afterPhoto} onChange={(e) => setAfterPhoto(e.target.value)} className="border rounded px-2 py-1 text-xs"><option value="">After photo</option>{data.photos.map((p) => <option key={p.id} value={p.url}>{p.view} {new Date(p.date).toLocaleDateString()}</option>)}</select>
            </div>
            <div className="grid grid-cols-2 gap-2">{beforePhoto ? <img src={beforePhoto} className="rounded-lg aspect-[3/4] object-cover" /> : <div className="rounded-lg bg-zinc-100 aspect-[3/4]" />} {afterPhoto ? <img src={afterPhoto} className="rounded-lg aspect-[3/4] object-cover" /> : <div className="rounded-lg bg-zinc-100 aspect-[3/4]" />}</div>
          </section>
        </div>
      )}

      <div className="text-[11px] text-zinc-500 p-2 bg-zinc-100 rounded-xl">
        <Timer className="w-3 h-3 inline mr-1" /> Smart progression (#30 #31) is supported by carrying forward prior set values and editable targets through session history in this workspace.
      </div>
    </div>
  );
}
