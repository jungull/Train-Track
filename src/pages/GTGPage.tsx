import { useState, useEffect, useRef, useCallback } from 'react';
import { format, parseISO, differenceInWeeks, startOfMonth, endOfMonth, eachDayOfInterval, getDay, subMonths, addMonths } from 'date-fns';
import { Zap, Clock, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

// ============ Types ============
interface Settings {
    program_start_date: string;
    pushup_start_reps: number;
    pushup_weekly_add: number;
    plank_start_sec: number;
    plank_weekly_add: number;
    gtg_daily_target_sets: number;
    gtg_cooldown_minutes: number;
    gtg_pushup_enabled: number;
    gtg_plank_enabled: number;
}

interface GTGEvent {
    id: number;
    type: string;
    date: string;
    timestamp: string;
    target: number;
    completed: number;
    source: string;
}

// ============ Helpers ============
function calcTarget(start: number, weeklyAdd: number, programStart: string): number {
    const weekIndex = Math.max(0, differenceInWeeks(new Date(), parseISO(programStart)));
    return start + weeklyAdd * weekIndex;
}

function beep(freq: number, ms: number) {
    try {
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.connect(g); g.connect(ctx.destination);
        osc.frequency.value = freq; g.gain.value = 0.3;
        osc.start(); osc.stop(ctx.currentTime + ms / 1000);
    } catch { }
}

// ============ Dot Strip ============
function DotStrip({ completed, target }: { completed: number; target: number }) {
    const count = Math.max(completed, target);
    return (
        <div className="flex gap-2 flex-wrap">
            {Array.from({ length: count }, (_, i) => (
                <div
                    key={i}
                    className={`w-4 h-4 rounded-full transition-all duration-300 ${i < completed
                            ? 'bg-green-500 shadow-sm shadow-green-200 scale-110'
                            : 'bg-zinc-200'
                        }`}
                />
            ))}
        </div>
    );
}

// ============ Push-up Exercise Card ============
function PushupCard({
    settings,
    events,
    onLog,
}: {
    settings: Settings;
    events: GTGEvent[];
    onLog: (type: string, target: number, actual: number) => void;
}) {
    const scheduledTarget = calcTarget(settings.pushup_start_reps, settings.pushup_weekly_add, settings.program_start_date);
    const completedSets = events.filter(e => e.type === 'pushups' && e.source === 'app' && e.completed > 0);

    // Day-override: if any set was below target, use that as the new target for remaining sets
    const [overrideTarget, setOverrideTarget] = useState<number | null>(null);
    const todayTarget = overrideTarget ?? scheduledTarget;

    // Cooldown
    const lastSet = completedSets.sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0];
    const cooldownEnd = lastSet ? new Date(lastSet.timestamp).getTime() + settings.gtg_cooldown_minutes * 60000 : 0;
    const [now, setNow] = useState(Date.now());
    const cooldownRemaining = Math.max(0, cooldownEnd - now);
    const onCooldown = cooldownRemaining > 0;

    // Flow state
    const [showPrompt, setShowPrompt] = useState(false);
    const [showInput, setShowInput] = useState(false);
    const [actualReps, setActualReps] = useState('');

    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(id);
    }, []);

    const handleStartSet = () => {
        setShowPrompt(true);
    };

    const handleYes = () => {
        onLog('pushups', todayTarget, todayTarget);
        setShowPrompt(false);
        beep(660, 200);
    };

    const handleNo = () => {
        setShowPrompt(false);
        setShowInput(true);
        setActualReps('');
    };

    const handleSubmitActual = () => {
        const actual = parseInt(actualReps) || 0;
        if (actual > 0) {
            onLog('pushups', todayTarget, actual);
            if (actual < todayTarget) setOverrideTarget(actual);
        }
        setShowInput(false);
        beep(440, 200);
    };

    const formatCooldown = (ms: number) => {
        const m = Math.floor(ms / 60000);
        const s = Math.floor((ms % 60000) / 1000);
        return `${m}:${String(s).padStart(2, '0')}`;
    };

    return (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-zinc-100 space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="font-bold text-zinc-900 flex items-center gap-2">
                        <Zap className="w-4 h-4 text-amber-500" /> Push-ups
                    </h2>
                    <p className="text-xs text-zinc-500 mt-0.5">
                        Target: {todayTarget} reps/set
                        {overrideTarget !== null && <span className="text-amber-600 ml-1">(adjusted)</span>}
                    </p>
                </div>
                <span className="text-xs font-semibold bg-zinc-100 text-zinc-600 px-2 py-1 rounded">
                    {completedSets.length}/{settings.gtg_daily_target_sets} sets
                </span>
            </div>

            <DotStrip completed={completedSets.length} target={settings.gtg_daily_target_sets} />

            {/* Volume summary */}
            <p className="text-xs text-zinc-400">
                Today: {completedSets.reduce((sum, e) => sum + e.completed, 0)} total reps
            </p>

            {/* Flow */}
            {showPrompt && (
                <div className="bg-zinc-50 rounded-xl p-4 space-y-3 border border-zinc-200">
                    <p className="text-sm font-medium text-zinc-800">Did you complete {todayTarget} reps?</p>
                    <div className="flex gap-2">
                        <button onClick={handleYes} className="flex-1 py-2.5 bg-green-500 text-white font-semibold rounded-lg active:scale-95 transition-transform">Yes</button>
                        <button onClick={handleNo} className="flex-1 py-2.5 bg-zinc-200 text-zinc-700 font-semibold rounded-lg active:scale-95 transition-transform">No</button>
                    </div>
                </div>
            )}

            {showInput && (
                <div className="bg-zinc-50 rounded-xl p-4 space-y-3 border border-zinc-200">
                    <p className="text-sm font-medium text-zinc-800">How many reps did you complete?</p>
                    <div className="flex gap-2">
                        <input
                            type="number"
                            value={actualReps}
                            onChange={(e) => setActualReps(e.target.value)}
                            className="flex-1 bg-white border border-zinc-300 rounded-lg px-3 py-2 font-mono text-lg text-center focus:outline-none focus:ring-2 focus:ring-zinc-900"
                            autoFocus
                        />
                        <button onClick={handleSubmitActual} className="px-4 py-2 bg-zinc-900 text-white font-semibold rounded-lg active:scale-95 transition-transform">Log</button>
                    </div>
                </div>
            )}

            {!showPrompt && !showInput && (
                <button
                    onClick={handleStartSet}
                    disabled={onCooldown}
                    className={`w-full py-3.5 rounded-xl font-semibold text-sm transition-all active:scale-[0.98] ${onCooldown
                            ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
                            : 'bg-zinc-950 text-white shadow-lg shadow-zinc-900/20'
                        }`}
                >
                    {onCooldown ? (
                        <span className="flex items-center justify-center gap-2">
                            <Clock className="w-4 h-4" /> Cooldown {formatCooldown(cooldownRemaining)}
                        </span>
                    ) : 'Start Set'}
                </button>
            )}
        </div>
    );
}

// ============ Plank Exercise Card ============
function PlankCard({
    settings,
    events,
    onLog,
}: {
    settings: Settings;
    events: GTGEvent[];
    onLog: (type: string, target: number, actual: number) => void;
}) {
    const scheduledTarget = calcTarget(settings.plank_start_sec, settings.plank_weekly_add, settings.program_start_date);
    const completedSets = events.filter(e => e.type === 'planks' && e.source === 'app' && e.completed > 0);

    const [overrideTarget, setOverrideTarget] = useState<number | null>(null);
    const todayTarget = overrideTarget ?? scheduledTarget;

    // Cooldown
    const lastSet = completedSets.sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0];
    const cooldownEnd = lastSet ? new Date(lastSet.timestamp).getTime() + settings.gtg_cooldown_minutes * 60000 : 0;
    const [now, setNow] = useState(Date.now());
    const cooldownRemaining = Math.max(0, cooldownEnd - now);
    const onCooldown = cooldownRemaining > 0;

    // Timer state
    const [timerRunning, setTimerRunning] = useState(false);
    const [timerElapsed, setTimerElapsed] = useState(0);
    const [showResult, setShowResult] = useState(false);
    const [actualSeconds, setActualSeconds] = useState('');
    const intervalRef = useRef<number | null>(null);

    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(id);
    }, []);

    useEffect(() => {
        if (!timerRunning) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            return;
        }
        intervalRef.current = window.setInterval(() => {
            setTimerElapsed(prev => {
                const next = prev + 1;
                if (next >= todayTarget) {
                    // Timer complete
                    setTimerRunning(false);
                    beep(880, 500);
                    setActualSeconds(String(todayTarget));
                    setShowResult(true);
                    return todayTarget;
                }
                // Countdown beeps at last 3 seconds
                if (todayTarget - next <= 3) beep(330, 100);
                return next;
            });
        }, 1000);
        return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }, [timerRunning, todayTarget]);

    const handleBegin = () => {
        setTimerElapsed(0);
        setTimerRunning(true);
    };

    const handleStop = () => {
        setTimerRunning(false);
        setActualSeconds(String(timerElapsed));
        setShowResult(true);
        beep(440, 200);
    };

    const handleSubmitResult = () => {
        const actual = parseInt(actualSeconds) || 0;
        if (actual > 0) {
            onLog('planks', todayTarget, actual);
            if (actual < todayTarget) setOverrideTarget(actual);
        }
        setShowResult(false);
        setTimerElapsed(0);
    };

    const formatCooldown = (ms: number) => {
        const m = Math.floor(ms / 60000);
        const s = Math.floor((ms % 60000) / 1000);
        return `${m}:${String(s).padStart(2, '0')}`;
    };

    const formatTimer = (sec: number) => {
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };

    const remaining = Math.max(0, todayTarget - timerElapsed);
    const progress = todayTarget > 0 ? timerElapsed / todayTarget : 0;

    return (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-zinc-100 space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="font-bold text-zinc-900 flex items-center gap-2">
                        <Zap className="w-4 h-4 text-blue-500" /> Planks
                    </h2>
                    <p className="text-xs text-zinc-500 mt-0.5">
                        Target: {todayTarget}s/set
                        {overrideTarget !== null && <span className="text-amber-600 ml-1">(adjusted)</span>}
                    </p>
                </div>
                <span className="text-xs font-semibold bg-zinc-100 text-zinc-600 px-2 py-1 rounded">
                    {completedSets.length}/{settings.gtg_daily_target_sets} sets
                </span>
            </div>

            <DotStrip completed={completedSets.length} target={settings.gtg_daily_target_sets} />

            <p className="text-xs text-zinc-400">
                Today: {completedSets.reduce((sum, e) => sum + e.completed, 0)}s total
            </p>

            {/* Timer UI */}
            {timerRunning && (
                <div className="space-y-3">
                    <div className="relative mx-auto w-40 h-40">
                        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                            <circle cx="50" cy="50" r="45" fill="none" stroke="#f4f4f5" strokeWidth="6" />
                            <circle cx="50" cy="50" r="45" fill="none" stroke="#3b82f6" strokeWidth="6" strokeLinecap="round"
                                strokeDasharray={`${2 * Math.PI * 45}`}
                                strokeDashoffset={`${2 * Math.PI * 45 * (1 - progress)}`}
                                className="transition-all duration-1000 ease-linear" />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="font-mono text-3xl font-bold">{formatTimer(remaining)}</span>
                            <span className="text-xs text-zinc-500">remaining</span>
                        </div>
                    </div>
                    <button onClick={handleStop} className="w-full py-3 bg-red-500 text-white font-semibold rounded-xl active:scale-[0.98] transition-transform">
                        Stop Early
                    </button>
                </div>
            )}

            {/* Result prompt */}
            {showResult && (
                <div className="bg-zinc-50 rounded-xl p-4 space-y-3 border border-zinc-200">
                    <p className="text-sm font-medium text-zinc-800">How long did you hold? (seconds)</p>
                    <div className="flex gap-2">
                        <input
                            type="number"
                            value={actualSeconds}
                            onChange={(e) => setActualSeconds(e.target.value)}
                            className="flex-1 bg-white border border-zinc-300 rounded-lg px-3 py-2 font-mono text-lg text-center focus:outline-none focus:ring-2 focus:ring-zinc-900"
                            autoFocus
                        />
                        <button onClick={handleSubmitResult} className="px-4 py-2 bg-zinc-900 text-white font-semibold rounded-lg active:scale-95 transition-transform">Log</button>
                    </div>
                </div>
            )}

            {!timerRunning && !showResult && (
                <button
                    onClick={handleBegin}
                    disabled={onCooldown}
                    className={`w-full py-3.5 rounded-xl font-semibold text-sm transition-all active:scale-[0.98] ${onCooldown
                            ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
                            : 'bg-zinc-950 text-white shadow-lg shadow-zinc-900/20'
                        }`}
                >
                    {onCooldown ? (
                        <span className="flex items-center justify-center gap-2">
                            <Clock className="w-4 h-4" /> Cooldown {formatCooldown(cooldownRemaining)}
                        </span>
                    ) : 'Begin'}
                </button>
            )}
        </div>
    );
}

// ============ Habit Calendar ============
function HabitCalendar() {
    const [month, setMonth] = useState(new Date());
    const [history, setHistory] = useState<any[]>([]);

    useEffect(() => {
        fetch('/api/gtg-history').then(r => r.json()).then(setHistory).catch(console.error);
    }, []);

    const start = startOfMonth(month);
    const end = endOfMonth(month);
    const days = eachDayOfInterval({ start, end });
    const startPad = getDay(start); // 0=Sun

    const getDayData = (dateStr: string) => {
        const pushups = history.find((h: any) => h.date === dateStr && h.type === 'pushups');
        const planks = history.find((h: any) => h.date === dateStr && h.type === 'planks');
        return { pushups, planks };
    };

    return (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-zinc-100 space-y-4">
            <div className="flex items-center justify-between">
                <button onClick={() => setMonth(subMonths(month, 1))} className="p-1 text-zinc-500 hover:text-zinc-900">
                    <ChevronLeft className="w-5 h-5" />
                </button>
                <h2 className="font-bold text-zinc-900">{format(month, 'MMMM yyyy')}</h2>
                <button onClick={() => setMonth(addMonths(month, 1))} className="p-1 text-zinc-500 hover:text-zinc-900">
                    <ChevronRight className="w-5 h-5" />
                </button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 text-center text-[10px] font-semibold text-zinc-400 uppercase">
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => <div key={d}>{d}</div>)}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: startPad }, (_, i) => <div key={`pad-${i}`} />)}
                {days.map(day => {
                    const dateStr = format(day, 'yyyy-MM-dd');
                    const { pushups, planks } = getDayData(dateStr);
                    const hasData = pushups || planks;
                    const isToday = dateStr === format(new Date(), 'yyyy-MM-dd');

                    return (
                        <div
                            key={dateStr}
                            className={`aspect-square flex flex-col items-center justify-center rounded-lg text-xs transition-colors ${isToday ? 'ring-2 ring-zinc-900' : ''
                                } ${hasData ? 'bg-green-50' : 'bg-zinc-50'}`}
                        >
                            <span className={`font-medium ${hasData ? 'text-green-700' : 'text-zinc-400'}`}>
                                {format(day, 'd')}
                            </span>
                            {pushups && (
                                <span className="text-[8px] text-amber-600 font-bold">{pushups.total_volume}r</span>
                            )}
                            {planks && (
                                <span className="text-[8px] text-blue-600 font-bold">{planks.total_volume}s</span>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="flex items-center gap-4 text-[10px] text-zinc-400 pt-1">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> Push-up reps</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" /> Plank seconds</span>
            </div>
        </div>
    );
}

// ============ Main GTG Page ============
export default function GTGPage() {
    const [settings, setSettings] = useState<Settings | null>(null);
    const [events, setEvents] = useState<GTGEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<'today' | 'history'>('today');

    const todayStr = format(new Date(), 'yyyy-MM-dd');

    const fetchData = useCallback(async () => {
        try {
            const [sRes, eRes] = await Promise.all([
                fetch('/api/settings'),
                fetch(`/api/gtg/${todayStr}`),
            ]);
            setSettings(await sRes.json());
            setEvents(await eRes.json());
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [todayStr]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const logSet = async (type: string, target: number, actual: number) => {
        await fetch('/api/gtg', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type,
                date: todayStr,
                timestamp: new Date().toISOString(),
                target,
                completed: actual,
                source: 'app',
            }),
        });
        // Refresh events
        const res = await fetch(`/api/gtg/${todayStr}`);
        setEvents(await res.json());
    };

    if (loading || !settings) return <div className="p-6 text-center text-zinc-500">Loading...</div>;

    return (
        <div className="flex flex-col min-h-screen bg-zinc-50 pb-24">
            <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-zinc-200 px-4 py-3">
                <div className="flex items-center justify-between">
                    <h1 className="text-lg font-semibold tracking-tight flex items-center gap-2">
                        <Zap className="w-5 h-5 text-amber-500" />
                        Grease the Groove
                    </h1>
                    <div className="flex bg-zinc-100 rounded-lg p-0.5">
                        <button
                            onClick={() => setTab('today')}
                            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${tab === 'today' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500'
                                }`}
                        >
                            Today
                        </button>
                        <button
                            onClick={() => setTab('history')}
                            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${tab === 'history' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500'
                                }`}
                        >
                            <Calendar className="w-3 h-3 inline mr-1" />History
                        </button>
                    </div>
                </div>
            </header>

            <div className="flex-1 p-4 space-y-4">
                {tab === 'today' ? (
                    <>
                        {settings.gtg_pushup_enabled ? (
                            <PushupCard settings={settings} events={events} onLog={logSet} />
                        ) : null}
                        {settings.gtg_plank_enabled ? (
                            <PlankCard settings={settings} events={events} onLog={logSet} />
                        ) : null}
                        {!settings.gtg_pushup_enabled && !settings.gtg_plank_enabled && (
                            <div className="text-center text-zinc-400 py-12">
                                <p className="text-sm">No GTG exercises enabled.</p>
                                <p className="text-xs mt-1">Go to Settings to enable push-ups or planks.</p>
                            </div>
                        )}
                    </>
                ) : (
                    <HabitCalendar />
                )}
            </div>
        </div>
    );
}
