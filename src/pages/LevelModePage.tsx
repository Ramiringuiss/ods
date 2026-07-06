import { useCallback } from 'react'
import { useRouter } from '../context/RouterContext'
import { useAuth } from '../context/AuthContext'
import { useLevelMode, type LevelResult } from '../hooks/useLevelMode'
import { TypingArea } from '../components/TypingArea'
import { KeyHeatmap } from '../components/KeyHeatmap'
import { TOTAL_LEVELS } from '../data/levels'
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { resumeAudioContext } from '../utils/sounds'
import { formatTime } from '../utils/typingMetrics'

// ─── Timer bar ────────────────────────────────────────────────────────────────

function TimerBar({ timeLeft, total }: { timeLeft: number; total: number }) {
    const pct = Math.max(0, (timeLeft / total) * 100)
    const isUrgent = pct < 30

    return (
        <div className="relative h-2 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
            <div
                className={`h-full rounded-full transition-all duration-100 ${isUrgent ? 'bg-red-500' : 'bg-accent dark:bg-accent-dark'}`}
                style={{ width: `${pct}%` }}
            />
        </div>
    )
}

// ─── Detailed Level Results Panel ─────────────────────────────────────────────
// Mirrors the ResultsPanel design with heatmap + history + Phase-7 nav buttons

interface LevelResultsPanelProps {
    result: LevelResult
    sessionKeyErrors: Record<string, number>
    historyStats: { averageWpm: number; totalSessions: number }
    /** true → game is fully complete (all 17 levels), false → just one level passed */
    isGameComplete: boolean
    onNext: () => void           // "Siguiente nivel" or "Jugar de nuevo"
    onRetry: () => void
    onLevelSelect: () => void
    onMenu: () => void
}

function LevelResultsPanel({
    result,
    sessionKeyErrors,
    historyStats,
    isGameComplete,
    onNext,
    onRetry,
    onLevelSelect,
    onMenu,
}: LevelResultsPanelProps) {
    return (
        <div
            className="animate-fade-in fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-0 backdrop-blur-sm sm:items-center sm:p-4 dark:bg-black/50"
            role="dialog"
            aria-modal="true"
            aria-labelledby="level-results-title"
        >
            <div className="animate-slide-up max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-surface p-6 shadow-xl sm:rounded-2xl dark:bg-surface-dark sm:p-8">
                {/* Title */}
                <h2
                    id="level-results-title"
                    className="text-center text-lg font-semibold text-text dark:text-text-dark"
                >
                    {isGameComplete ? '🏆 ¡Todos los ODS completados!' : `✅ Nivel ${result.level} superado`}
                </h2>

                {/* Main stats */}
                <dl className="mt-6 grid grid-cols-2 gap-4">
                    {[
                        { label: 'WPM', value: result.wpm, highlight: true },
                        { label: 'Precisión', value: `${result.accuracy}%` },
                        { label: 'Tiempo', value: formatTime(result.timeUsed), },
                        { label: 'Errores', value: result.errors ?? 0, error: true },
                    ].map((item) => (
                        <div key={item.label} className="text-center">
                            <dt className="text-xs uppercase tracking-widest text-muted">
                                {item.label}
                            </dt>
                            <dd
                                className={`font-mono text-3xl font-medium transition-all duration-500 ${item.error
                                        ? 'text-error'
                                        : item.highlight
                                            ? 'text-text dark:text-caret'
                                            : 'text-text dark:text-text-dark'
                                    }`}
                            >
                                {item.value}
                            </dd>
                        </div>
                    ))}
                </dl>

                {/* Keyboard heatmap */}
                <div className="mt-6">
                    <KeyHeatmap
                        keyErrors={sessionKeyErrors}
                        title="Heatmap de esta sesión"
                        compact
                    />
                </div>

                {/* Progress history */}
                <div className="mt-6 rounded-lg bg-bg p-4 dark:bg-bg-dark">
                    <h3 className="text-xs font-medium uppercase tracking-widest text-muted">
                        Progreso
                    </h3>
                    <ul className="mt-3 space-y-2 text-sm text-text dark:text-text-dark">
                        <li className="flex justify-between">
                            <span>WPM medio (historial)</span>
                            <span className="font-mono font-medium">{historyStats.averageWpm}</span>
                        </li>
                        <li className="flex justify-between">
                            <span>Sesiones totales</span>
                            <span className="font-mono font-medium">{historyStats.totalSessions}</span>
                        </li>
                    </ul>
                </div>

                {/* Navigation buttons */}
                <div className="mt-6 flex flex-col gap-2">
                    {/* Primary: next level or restart */}
                    <button
                        type="button"
                        onClick={onNext}
                        className="w-full rounded-xl bg-accent py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98] dark:bg-accent-dark dark:text-bg-dark"
                    >
                        {isGameComplete ? '🔄 Jugar de nuevo' : 'Siguiente nivel →'}
                    </button>

                    {/* Secondary row */}
                    <div className="flex gap-2">
                        {!isGameComplete && (
                            <button
                                type="button"
                                onClick={onRetry}
                                className="flex-1 rounded-xl border border-accent/40 py-2.5 text-sm font-medium text-accent transition-all hover:bg-accent/5 active:scale-[0.98] dark:border-accent-dark/40 dark:text-accent-dark"
                            >
                                Repetir nivel
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={onLevelSelect}
                            className="flex-1 rounded-xl border border-black/10 py-2.5 text-sm font-medium text-muted transition-all hover:bg-black/5 active:scale-[0.98] dark:border-white/10 dark:hover:bg-white/5"
                        >
                            Selección de Niveles
                        </button>
                        <button
                            type="button"
                            onClick={onMenu}
                            className="flex-1 rounded-xl border border-black/10 py-2.5 text-sm font-medium text-muted transition-all hover:bg-black/5 active:scale-[0.98] dark:border-white/10 dark:hover:bg-white/5"
                        >
                            Menú
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

// ─── Level Failed Panel ────────────────────────────────────────────────────────

function LevelFailedPanel({
    result,
    sessionKeyErrors,
    historyStats,
    onRetry,
    onLevelSelect,
    onMenu,
}: {
    result: LevelResult | null
    sessionKeyErrors: Record<string, number>
    historyStats: { averageWpm: number; totalSessions: number }
    onRetry: () => void
    onLevelSelect: () => void
    onMenu: () => void
}) {
    return (
        <div
            className="animate-fade-in fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-0 backdrop-blur-sm sm:items-center sm:p-4 dark:bg-black/50"
            role="dialog"
            aria-modal="true"
            aria-labelledby="level-failed-title"
        >
            <div className="animate-slide-up max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-surface p-6 shadow-xl sm:rounded-2xl dark:bg-surface-dark sm:p-8">
                <h2
                    id="level-failed-title"
                    className="text-center text-lg font-semibold text-text dark:text-text-dark"
                >
                    ⏱ Se acabó el tiempo
                </h2>

                {result && (
                    <dl className="mt-6 grid grid-cols-2 gap-4">
                        {[
                            { label: 'WPM', value: result.wpm, highlight: true },
                            { label: 'Precisión', value: `${result.accuracy}%` },
                            { label: 'Tiempo', value: formatTime(result.timeUsed) },
                            { label: 'Errores', value: result.errors ?? 0, error: true },
                        ].map((item) => (
                            <div key={item.label} className="text-center">
                                <dt className="text-xs uppercase tracking-widest text-muted">
                                    {item.label}
                                </dt>
                                <dd
                                    className={`font-mono text-3xl font-medium transition-all duration-500 ${item.error
                                            ? 'text-error'
                                            : item.highlight
                                                ? 'text-text dark:text-caret'
                                                : 'text-text dark:text-text-dark'
                                        }`}
                                >
                                    {item.value}
                                </dd>
                            </div>
                        ))}
                    </dl>
                )}

                <div className="mt-6">
                    <KeyHeatmap
                        keyErrors={sessionKeyErrors}
                        title="Heatmap de esta sesión"
                        compact
                    />
                </div>

                <div className="mt-6 rounded-lg bg-bg p-4 dark:bg-bg-dark">
                    <h3 className="text-xs font-medium uppercase tracking-widest text-muted">
                        Progreso
                    </h3>
                    <ul className="mt-3 space-y-2 text-sm text-text dark:text-text-dark">
                        <li className="flex justify-between">
                            <span>WPM medio (historial)</span>
                            <span className="font-mono font-medium">{historyStats.averageWpm}</span>
                        </li>
                        <li className="flex justify-between">
                            <span>Sesiones totales</span>
                            <span className="font-mono font-medium">{historyStats.totalSessions}</span>
                        </li>
                    </ul>
                </div>

                <div className="mt-6 flex flex-col gap-2">
                    <button
                        type="button"
                        onClick={onRetry}
                        className="w-full rounded-xl bg-accent py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98] dark:bg-accent-dark dark:text-bg-dark"
                    >
                        🔄 Reintentar nivel
                    </button>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={onLevelSelect}
                            className="flex-1 rounded-xl border border-black/10 py-2.5 text-sm font-medium text-muted transition-all hover:bg-black/5 active:scale-[0.98] dark:border-white/10 dark:hover:bg-white/5"
                        >
                            Selección de Niveles
                        </button>
                        <button
                            type="button"
                            onClick={onMenu}
                            className="flex-1 rounded-xl border border-black/10 py-2.5 text-sm font-medium text-muted transition-all hover:bg-black/5 active:scale-[0.98] dark:border-white/10 dark:hover:bg-white/5"
                        >
                            Menú
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function LevelModePage() {
    const { navigate, selectedLevel } = useRouter()
    const { user } = useAuth()

    // ── Per-level progress save ───────────────────────────────────────────────
    const handleLevelPass = useCallback(
        async (levelNumber: number) => {
            if (!user) return
            try {
                const ref = doc(db, 'users', user.uid)
                const snap = await getDoc(ref)
                if (snap.exists()) {
                    const data = snap.data() as { maxLevelUnlocked?: number }
                    const current = data.maxLevelUnlocked ?? 1
                    if (levelNumber >= current) {
                        await updateDoc(ref, {
                            maxLevelUnlocked: Math.min(current + 1, 17),
                            updatedAt: new Date().toISOString(),
                        })
                    }
                } else {
                    await setDoc(ref, {
                        maxLevelUnlocked: Math.min(levelNumber + 1, 17),
                        updatedAt: new Date().toISOString(),
                    })
                }
            } catch (err) {
                console.warn('Firestore per-level save failed:', err)
            }
        },
        [user],
    )

    // ── End-of-game save (wpmRecord + maxLevel) ───────────────────────────────
    const handleGameEnd = useCallback(
        async (results: LevelResult[]) => {
            if (!user) return
            const bestWpm = results.length > 0 ? Math.max(...results.map((r) => r.wpm)) : 0
            const levelsCleared = results.length
            try {
                const ref = doc(db, 'users', user.uid)
                const snap = await getDoc(ref)
                if (snap.exists()) {
                    const data = snap.data() as { maxLevel?: number; wpmRecord?: number }
                    await updateDoc(ref, {
                        maxLevel: Math.max(data.maxLevel ?? 0, levelsCleared),
                        wpmRecord: Math.max(data.wpmRecord ?? 0, bestWpm),
                        updatedAt: new Date().toISOString(),
                    })
                } else {
                    await setDoc(ref, {
                        maxLevel: levelsCleared,
                        wpmRecord: bestWpm,
                        updatedAt: new Date().toISOString(),
                    })
                }
            } catch (err) {
                console.warn('Firestore end-of-game save failed:', err)
            }
        },
        [user],
    )

    const {
        levelNumber,
        levelState,
        snippet,
        timeLeft,
        timerSeconds,
        minWpm,
        levelResults,
        chars,
        cursorIndex,
        errors,
        liveWpm,
        liveAccuracy,
        sessionKeyErrors,
        historyStats,
        inputRef,
        handleKeyDown,
        focusInput,
        nextLevel,
        retryLevel,
    } = useLevelMode(handleGameEnd, selectedLevel)

    const lastResult = levelResults[levelResults.length - 1]

    const handleKeyDownWithAudio = (e: React.KeyboardEvent<HTMLInputElement>) => {
        resumeAudioContext()
        handleKeyDown(e)
    }

    // Save progress then advance to next level
    const handleNext = () => {
        if (lastResult) void handleLevelPass(lastResult.level)
        if (levelState === 'complete') {
            navigate('level-select')
        } else {
            nextLevel()
        }
    }

    return (
        <div className="mx-auto flex min-h-dvh max-w-3xl flex-col">
            {/* ── Header ─────────────────────────────────────────────────── */}
            <header className="flex items-center gap-3 px-6 py-5">
                <button
                    type="button"
                    onClick={() => navigate('level-select')}
                    aria-label="Volver a selección de niveles"
                    className="shrink-0 rounded-lg p-1.5 text-muted transition-colors hover:bg-black/5 hover:text-text dark:hover:bg-white/10 dark:hover:text-text-dark"
                >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
                <div className="flex-1">
                    <h1 className="text-sm font-semibold uppercase tracking-widest text-muted">
                        Modo Niveles
                    </h1>
                </div>
                {/* Level progress pills */}
                <div className="flex items-center gap-1.5">
                    {Array.from({ length: TOTAL_LEVELS }, (_, i) => (
                        <div
                            key={i}
                            className={`h-1.5 w-1.5 rounded-full transition-colors ${i < levelResults.length
                                    ? 'bg-accent dark:bg-accent-dark'
                                    : i === levelNumber - 1
                                        ? 'bg-accent/50 dark:bg-accent-dark/50'
                                        : 'bg-black/10 dark:bg-white/10'
                                }`}
                        />
                    ))}
                </div>
            </header>

            {/* ── Main ───────────────────────────────────────────────────── */}
            <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 pb-12">
                {/* Level info */}
                <div className="w-full max-w-2xl">
                    <div className="mb-3 flex items-center justify-between">
                        <div>
                            <span className="text-xs font-semibold uppercase tracking-widest text-muted">
                                Nivel {levelNumber}/{TOTAL_LEVELS}
                            </span>
                            <h2 className="mt-0.5 text-base font-semibold text-text dark:text-text-dark">
                                ODS {levelNumber} — {snippet.title}
                            </h2>
                        </div>
                        <div className="text-right">
                            <p
                                className={`font-mono text-2xl font-bold tabular-nums ${timeLeft < timerSeconds * 0.3
                                        ? 'text-red-500'
                                        : 'text-text dark:text-text-dark'
                                    }`}
                            >
                                {Math.ceil(Math.max(0, timeLeft))}s
                            </p>
                            <p className="text-[10px] text-muted">objetivo ≥{minWpm} WPM</p>
                        </div>
                    </div>

                    <TimerBar timeLeft={timeLeft} total={timerSeconds} />
                </div>

                {/* Live stats */}
                <div className="flex gap-6 text-center">
                    {[
                        { label: 'WPM', value: levelState === 'active' ? liveWpm : 0 },
                        {
                            label: 'Precisión',
                            value: `${levelState === 'active' ? liveAccuracy : 100}%`,
                        },
                        { label: 'Errores', value: errors },
                    ].map((s) => (
                        <div key={s.label}>
                            <p className="font-mono text-xl font-semibold text-text dark:text-text-dark">
                                {s.value}
                            </p>
                            <p className="text-[10px] uppercase tracking-wider text-muted">
                                {s.label}
                            </p>
                        </div>
                    ))}
                </div>

                {/* Typing area */}
                <TypingArea
                    chars={chars}
                    cursorIndex={cursorIndex}
                    testState={
                        levelState === 'idle'
                            ? 'idle'
                            : levelState === 'active'
                                ? 'active'
                                : 'finished'
                    }
                    snippet={snippet}
                    inputRef={inputRef}
                    onKeyDown={handleKeyDownWithAudio}
                    onFocusRequest={focusInput}
                />

                {levelState === 'idle' && (
                    <p className="text-xs text-muted">
                        Empieza a escribir para iniciar el cronómetro
                    </p>
                )}
            </main>

            {/* ── Overlays ─────────────────────────────────────────────── */}

            {/* Level passed OR game complete → detailed results */}
            {(levelState === 'passed' || levelState === 'complete') && lastResult && (
                <LevelResultsPanel
                    result={lastResult}
                    sessionKeyErrors={sessionKeyErrors}
                    historyStats={historyStats}
                    isGameComplete={levelState === 'complete'}
                    onNext={handleNext}
                    onRetry={retryLevel}
                    onLevelSelect={() => navigate('level-select')}
                    onMenu={() => navigate('menu')}
                />
            )}

            {/* Level failed → detailed failure panel */}
            {levelState === 'failed' && (
                <LevelFailedPanel
                    result={lastResult ?? null}
                    sessionKeyErrors={sessionKeyErrors}
                    historyStats={historyStats}
                    onRetry={retryLevel}
                    onLevelSelect={() => navigate('level-select')}
                    onMenu={() => navigate('menu')}
                />
            )}
        </div>
    )
}
