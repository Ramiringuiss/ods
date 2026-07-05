import { useCallback } from 'react'
import { useRouter } from '../context/RouterContext'
import { useAuth } from '../context/AuthContext'
import { useLevelMode, type LevelResult } from '../hooks/useLevelMode'
import { TypingArea } from '../components/TypingArea'
import { TOTAL_LEVELS } from '../data/levels'
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { resumeAudioContext } from '../utils/sounds'

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

// ─── Summary screen ───────────────────────────────────────────────────────────

function LevelSummary({
    results,
    didWin,
    onRestart,
    onRetryLevel,
    onMenu,
}: {
    results: LevelResult[]
    didWin: boolean
    onRestart: () => void
    onRetryLevel: () => void
    onMenu: () => void
}) {
    const avgWpm =
        results.length > 0
            ? Math.round(results.reduce((s, r) => s + r.wpm, 0) / results.length)
            : 0
    const bestWpm = results.length > 0 ? Math.max(...results.map((r) => r.wpm)) : 0

    return (
        <div className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl bg-surface p-6 shadow-2xl dark:bg-surface-dark">
                <div className="text-center">
                    <div className="text-5xl">{didWin ? '🏆' : '💀'}</div>
                    <h2 className="mt-3 text-2xl font-bold text-text dark:text-text-dark">
                        {didWin ? '¡Completaste todos los ODS!' : 'Se acabó el tiempo'}
                    </h2>
                    <p className="mt-1 text-sm text-muted">
                        {didWin
                            ? 'Has superado los 17 Objetivos de Desarrollo Sostenible'
                            : `Llegaste hasta el nivel ${results.length + 1} de ${TOTAL_LEVELS}`}
                    </p>
                </div>

                <dl className="mt-6 grid grid-cols-3 gap-3">
                    {[
                        { label: 'Niveles', value: results.length },
                        { label: 'WPM medio', value: avgWpm },
                        { label: 'Mejor WPM', value: bestWpm },
                    ].map((s) => (
                        <div
                            key={s.label}
                            className="rounded-xl bg-bg p-3 text-center dark:bg-bg-dark"
                        >
                            <dd className="font-mono text-2xl font-semibold text-text dark:text-text-dark">
                                {s.value}
                            </dd>
                            <dt className="mt-1 text-[10px] uppercase tracking-wider text-muted">
                                {s.label}
                            </dt>
                        </div>
                    ))}
                </dl>

                {results.length > 0 && (
                    <div className="mt-4 max-h-40 overflow-y-auto rounded-xl bg-bg p-3 dark:bg-bg-dark">
                        <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted">
                            Detalle por nivel
                        </h3>
                        <ul className="space-y-1">
                            {results.map((r) => (
                                <li
                                    key={r.level}
                                    className="flex justify-between text-xs text-text dark:text-text-dark"
                                >
                                    <span>Nivel {r.level}</span>
                                    <span className="font-mono">
                                        {r.wpm} WPM · {r.accuracy}%
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                <div className="mt-5 flex gap-3">
                    {!didWin && (
                        <button
                            type="button"
                            onClick={onRetryLevel}
                            className="flex-1 rounded-xl border border-accent/40 py-2.5 text-sm font-medium text-accent transition-all hover:bg-accent/5 active:scale-[0.98] dark:border-accent-dark/40 dark:text-accent-dark"
                        >
                            Reintentar nivel
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={onRestart}
                        className="flex-1 rounded-xl bg-accent py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98] dark:bg-accent-dark dark:text-bg-dark"
                    >
                        {didWin ? 'Jugar de nuevo' : 'Desde inicio'}
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
    )
}

// ─── Level passed overlay ──────────────────────────────────────────────────────

function LevelPassedBanner({
    wpm,
    accuracy,
    levelNumber,
    onNext,
}: {
    wpm: number
    accuracy: number
    levelNumber: number
    onNext: () => void
}) {
    return (
        <div className="animate-fade-in fixed inset-0 z-40 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-2xl bg-surface p-6 text-center shadow-xl dark:bg-surface-dark">
                <div className="text-4xl">✅</div>
                <h2 className="mt-2 text-xl font-bold text-text dark:text-text-dark">
                    ¡Nivel {levelNumber} superado!
                </h2>
                <div className="mt-3 flex justify-center gap-6">
                    <div>
                        <p className="font-mono text-2xl font-semibold text-accent dark:text-accent-dark">
                            {wpm}
                        </p>
                        <p className="text-[10px] uppercase tracking-wider text-muted">WPM</p>
                    </div>
                    <div>
                        <p className="font-mono text-2xl font-semibold text-text dark:text-text-dark">
                            {accuracy}%
                        </p>
                        <p className="text-[10px] uppercase tracking-wider text-muted">Precisión</p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={onNext}
                    className="mt-5 w-full rounded-xl bg-accent py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98] dark:bg-accent-dark dark:text-bg-dark"
                >
                    Siguiente nivel →
                </button>
            </div>
        </div>
    )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function LevelModePage() {
    const { navigate } = useRouter()
    const { user } = useAuth()

    // Save best level/wpm to Firestore when game ends
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
                console.warn('Firestore update failed:', err)
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
        inputRef,
        handleKeyDown,
        focusInput,
        nextLevel,
        retryLevel,
    } = useLevelMode(handleGameEnd)

    const lastResult = levelResults[levelResults.length - 1]

    const handleKeyDownWithAudio = (e: React.KeyboardEvent<HTMLInputElement>) => {
        resumeAudioContext()
        handleKeyDown(e)
    }

    const handleRestart = () => {
        navigate('game-levels')
    }

    return (
        <div className="mx-auto flex min-h-dvh max-w-3xl flex-col">
            {/* ── Header ─────────────────────────────────────────────────── */}
            <header className="flex items-center gap-3 px-6 py-5">
                <button
                    type="button"
                    onClick={() => navigate('menu')}
                    aria-label="Volver al menú"
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
                    {Array.from({ length: 17 }, (_, i) => (
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
                    testState={levelState === 'idle' ? 'idle' : levelState === 'active' ? 'active' : 'finished'}
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
            {levelState === 'passed' && lastResult && (
                <LevelPassedBanner
                    wpm={lastResult.wpm}
                    accuracy={lastResult.accuracy}
                    levelNumber={levelResults.length}
                    onNext={nextLevel}
                />
            )}

            {(levelState === 'failed' || levelState === 'complete') && (
                <LevelSummary
                    results={levelResults}
                    didWin={levelState === 'complete'}
                    onRestart={handleRestart}
                    onRetryLevel={retryLevel}
                    onMenu={() => navigate('menu')}
                />
            )}
        </div>
    )
}
