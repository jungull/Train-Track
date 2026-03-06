import { useState, useRef, useCallback, useEffect } from 'react';
import { Timer, Clock, Play, Pause, RotateCcw, Flag, ChevronDown, ChevronUp } from 'lucide-react';

// ===== Interval Timer =====
function IntervalTimer() {
    const [workSec, setWorkSec] = useState(60);
    const [restSec, setRestSec] = useState(180);
    const [rounds, setRounds] = useState(4);

    const [running, setRunning] = useState(false);
    const [currentRound, setCurrentRound] = useState(1);
    const [phase, setPhase] = useState<'work' | 'rest'>('work');
    const [timeLeft, setTimeLeft] = useState(workSec);
    const [finished, setFinished] = useState(false);

    const intervalRef = useRef<number | null>(null);
    const audioCtxRef = useRef<AudioContext | null>(null);

    const getAudioCtx = useCallback(() => {
        if (!audioCtxRef.current) {
            audioCtxRef.current = new AudioContext();
        }
        return audioCtxRef.current;
    }, []);

    const beep = useCallback((freq: number, duration: number) => {
        try {
            const ctx = getAudioCtx();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = freq;
            gain.gain.value = 0.3;
            osc.start();
            osc.stop(ctx.currentTime + duration / 1000);
        } catch { }
    }, [getAudioCtx]);

    const reset = useCallback(() => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setRunning(false);
        setCurrentRound(1);
        setPhase('work');
        setTimeLeft(workSec);
        setFinished(false);
    }, [workSec]);

    const toggle = useCallback(() => {
        if (finished) {
            reset();
            return;
        }
        setRunning((r) => !r);
    }, [finished, reset]);

    useEffect(() => {
        if (!running) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            return;
        }

        intervalRef.current = window.setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    // Phase transition
                    if (phase === 'work') {
                        if (currentRound >= rounds) {
                            // Done!
                            beep(880, 500);
                            setRunning(false);
                            setFinished(true);
                            return 0;
                        }
                        beep(440, 200);
                        setPhase('rest');
                        return restSec;
                    } else {
                        beep(660, 200);
                        setPhase('work');
                        setCurrentRound((r) => r + 1);
                        return workSec;
                    }
                }
                // Countdown beeps at 3, 2, 1
                if (prev <= 4) beep(330, 100);
                return prev - 1;
            });
        }, 1000);

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [running, phase, currentRound, rounds, workSec, restSec, beep]);

    // Reset timeLeft when config changes while not running
    useEffect(() => {
        if (!running && !finished) {
            setTimeLeft(workSec);
            setCurrentRound(1);
            setPhase('work');
        }
    }, [workSec, restSec, rounds, running, finished]);

    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;
    const progress = phase === 'work'
        ? 1 - timeLeft / workSec
        : 1 - timeLeft / restSec;

    return (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-zinc-100 space-y-5">
            <div className="flex items-center gap-2">
                <Timer className="w-5 h-5 text-zinc-400" />
                <h2 className="font-bold text-zinc-900">Interval Timer</h2>
            </div>

            {/* Config */}
            {!running && !finished && (
                <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-zinc-500 uppercase">Work (sec)</label>
                        <input
                            type="number"
                            value={workSec}
                            onChange={(e) => setWorkSec(Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-center font-mono text-lg focus:outline-none focus:ring-2 focus:ring-zinc-900"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-zinc-500 uppercase">Rest (sec)</label>
                        <input
                            type="number"
                            value={restSec}
                            onChange={(e) => setRestSec(Math.max(0, parseInt(e.target.value) || 0))}
                            className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-center font-mono text-lg focus:outline-none focus:ring-2 focus:ring-zinc-900"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-zinc-500 uppercase">Rounds</label>
                        <input
                            type="number"
                            value={rounds}
                            onChange={(e) => setRounds(Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-center font-mono text-lg focus:outline-none focus:ring-2 focus:ring-zinc-900"
                        />
                    </div>
                </div>
            )}

            {/* Timer display */}
            <div className="text-center space-y-2">
                <div className="relative mx-auto w-48 h-48">
                    {/* Background ring */}
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="45" fill="none" stroke="#f4f4f5" strokeWidth="6" />
                        <circle
                            cx="50" cy="50" r="45" fill="none"
                            stroke={finished ? '#22c55e' : phase === 'work' ? '#18181b' : '#3b82f6'}
                            strokeWidth="6"
                            strokeLinecap="round"
                            strokeDasharray={`${2 * Math.PI * 45}`}
                            strokeDashoffset={`${2 * Math.PI * 45 * (1 - progress)}`}
                            className="transition-all duration-1000 ease-linear"
                        />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="font-mono text-4xl font-bold text-zinc-900">
                            {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
                        </span>
                        <span className={`text-xs font-bold uppercase tracking-wider mt-1 ${finished ? 'text-green-500' : phase === 'work' ? 'text-zinc-500' : 'text-blue-500'
                            }`}>
                            {finished ? 'Done!' : phase === 'work' ? `Round ${currentRound}/${rounds}` : 'Rest'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-4">
                <button
                    onClick={reset}
                    className="p-3 rounded-full bg-zinc-100 text-zinc-600 hover:bg-zinc-200 transition-colors"
                >
                    <RotateCcw className="w-5 h-5" />
                </button>
                <button
                    onClick={toggle}
                    className={`p-4 rounded-full text-white shadow-lg transition-all active:scale-95 ${finished ? 'bg-green-500 hover:bg-green-600' : running ? 'bg-red-500 hover:bg-red-600' : 'bg-zinc-900 hover:bg-zinc-800'
                        }`}
                >
                    {running ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
                </button>
            </div>
        </div>
    );
}

// ===== Stopwatch =====
function Stopwatch() {
    const [elapsed, setElapsed] = useState(0); // ms
    const [running, setRunning] = useState(false);
    const [laps, setLaps] = useState<number[]>([]);
    const startRef = useRef<number>(0);
    const intervalRef = useRef<number | null>(null);
    const prevElapsedRef = useRef<number>(0);

    const start = useCallback(() => {
        startRef.current = Date.now();
        prevElapsedRef.current = elapsed;
        setRunning(true);
    }, [elapsed]);

    const stop = useCallback(() => {
        setRunning(false);
    }, []);

    const reset = useCallback(() => {
        setRunning(false);
        setElapsed(0);
        setLaps([]);
        prevElapsedRef.current = 0;
    }, []);

    const lap = useCallback(() => {
        setLaps((prev) => [...prev, elapsed]);
    }, [elapsed]);

    useEffect(() => {
        if (!running) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            return;
        }
        intervalRef.current = window.setInterval(() => {
            setElapsed(prevElapsedRef.current + (Date.now() - startRef.current));
        }, 50);
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [running]);

    const formatTime = (ms: number) => {
        const totalSecs = Math.floor(ms / 1000);
        const mins = Math.floor(totalSecs / 60);
        const secs = totalSecs % 60;
        const centis = Math.floor((ms % 1000) / 10);
        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(centis).padStart(2, '0')}`;
    };

    return (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-zinc-100 space-y-5">
            <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-zinc-400" />
                <h2 className="font-bold text-zinc-900">Stopwatch</h2>
            </div>

            {/* Display */}
            <div className="text-center py-4">
                <span className="font-mono text-5xl font-bold text-zinc-900 tabular-nums">
                    {formatTime(elapsed)}
                </span>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-4">
                <button
                    onClick={reset}
                    className="p-3 rounded-full bg-zinc-100 text-zinc-600 hover:bg-zinc-200 transition-colors"
                >
                    <RotateCcw className="w-5 h-5" />
                </button>
                <button
                    onClick={running ? stop : start}
                    className={`p-4 rounded-full text-white shadow-lg transition-all active:scale-95 ${running ? 'bg-red-500 hover:bg-red-600' : 'bg-zinc-900 hover:bg-zinc-800'
                        }`}
                >
                    {running ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
                </button>
                <button
                    onClick={lap}
                    disabled={!running}
                    className="p-3 rounded-full bg-zinc-100 text-zinc-600 hover:bg-zinc-200 transition-colors disabled:opacity-30"
                >
                    <Flag className="w-5 h-5" />
                </button>
            </div>

            {/* Laps */}
            {laps.length > 0 && (
                <div className="space-y-1 pt-2 border-t border-zinc-100">
                    <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Laps</h3>
                    {laps.map((lapTime, i) => {
                        const delta = i === 0 ? lapTime : lapTime - laps[i - 1];
                        return (
                            <div key={i} className="flex items-center justify-between text-sm font-mono">
                                <span className="text-zinc-400">Lap {i + 1}</span>
                                <span className="text-zinc-600">{formatTime(delta)}</span>
                                <span className="text-zinc-400">{formatTime(lapTime)}</span>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// ===== Tools Page =====
export default function ToolsPage() {
    const [showTimer, setShowTimer] = useState(true);
    const [showStopwatch, setShowStopwatch] = useState(true);

    return (
        <div className="flex flex-col min-h-screen bg-zinc-50 pb-24">
            <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-zinc-200 px-4 py-3">
                <h1 className="text-lg font-semibold tracking-tight flex items-center gap-2">
                    <Timer className="w-5 h-5 text-zinc-400" />
                    Tools
                </h1>
            </header>

            <div className="flex-1 p-4 space-y-4">
                {/* Interval Timer Section */}
                <button
                    onClick={() => setShowTimer((s) => !s)}
                    className="w-full flex items-center justify-between text-sm font-semibold text-zinc-700 bg-zinc-100 px-4 py-2.5 rounded-xl"
                >
                    <span className="flex items-center gap-2"><Timer className="w-4 h-4" /> Interval Timer</span>
                    {showTimer ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {showTimer && <IntervalTimer />}

                {/* Stopwatch Section */}
                <button
                    onClick={() => setShowStopwatch((s) => !s)}
                    className="w-full flex items-center justify-between text-sm font-semibold text-zinc-700 bg-zinc-100 px-4 py-2.5 rounded-xl"
                >
                    <span className="flex items-center gap-2"><Clock className="w-4 h-4" /> Stopwatch</span>
                    {showStopwatch ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {showStopwatch && <Stopwatch />}
            </div>
        </div>
    );
}
