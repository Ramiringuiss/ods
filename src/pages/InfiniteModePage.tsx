import { useCallback } from 'react'
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'
import { useRouter } from '../context/RouterContext'
import { useAuth } from '../context/AuthContext'
import { useInfiniteMode } from '../hooks/useInfiniteMode'
import { TypingArea } from '../components/TypingArea'
import { db } from '../lib/firebase'
import { resumeAudioContext } from '../utils/sounds'
import type { SessionEntry } from '../hooks/useInfiniteMode'

// ─── Source badge ─────────────────────────────────────────────────────────────

function SourceBadge({ source }: { source: 'local' | 'ai-gpt' | 'ai-gemini' }) {
    const labels: Record<typeof source, string> = {
        local: 'ODS',
        'ai-gpt': 'GPT',
        'ai-gemini': 'Gemini',
    }
    const colors: Record<typeof source, string> = {
        local: 'bg-black/8 text-muted dark:bg-white/8',
        'ai-gpt': 'bg-green-500/15 text-green-700 dark:text-green-400',
        'ai-gemini': 'bg-blue-500/15 text-blue-700 dark:text-blue-400',
    }
    return (
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${colors[source]}`}>
            {labels[source]}
        </span>
    )
}

// ─── Buffer indicator ─────────────────────────────────────────────────────────

function BufferDots({ count }: { count: number }) {
    return (
        <div className="flex items-center gap-1" title={`${count} textos en cola`}>
            {Array.from({ length: 5 }, (_, i) => (
                <div
                    key={i}
                    className={`h-1.5 w-1.5 rounded-full transition-colors duration-300 ${i < count ? 'bg-accent dark:bg-accent-dark' : 'bg-black/8 dark:bg-white/8'
                        }`}
                />
            ))}
        </div>
    )
}

// ─── Finish summary ───────────────────────────────────────────────────────────

function InfiniteSummary({
    history,
    avgWpm,
    bestWpm,
    textsCompleted,
    onMenu,
}: {
    history: SessionEntry[]
    avgWpm: number
    bestWpm: number
    textsCompleted: number
    onMenu: () => void
}) {
    return (
        <div className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl bg-surface p-6 shadow-2xl dark:bg-surface-dark">
                <div className="text-center">
                    <div className="text-5xl">∞</div>
                    <h2 className="mt-2 text-2xl font-bold text-text dark:text-text-dark">
                        Sesión finalizada
                    </h2>
                    <p className="mt-1 text-sm text-muted">
                        {textsCompleted === 0
                            ? 'No completaste ningún texto'
                            : `Completaste ${textsCompleted} texto${textsCompleted > 1 ? 's' : ''}`}
                    </p>
                </div>

                <dl className="mt-5 grid grid-cols-3 gap-3">
                    {[
                        { label: 'Textos', value: textsCompleted },
                        { label: 'WPM medio', value: avgWpm },
                        { label: 'Mejor WPM', value: bestWpm },
                    ].map((s) => (
                        <div key={s.label} className="rounded-xl bg-bg p-3 text-center dark:bg-bg-dark">
                            <dd className="font-mono text-2xl font-semibold text-text dark:text-text-dark">
                                {s.value}
                            </dd>
                            <dt className="mt-1 text-[10px] uppercase tracking-wider text-muted">
                                {s.label}
                            </dt>
                        </div>
                    ))}
                </dl>

                {history.length > 0 && (
                    <div className="mt-4 max-h-40 overflow-y-auto rounded-xl bg-bg p-3 dark:bg-bg-dark">
                        <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted">
                            Historial de sesión <span className="normal-case text-muted/60">(solo esta sesión)</span>
                        </h3>
                        <ul className="space-y-1">
                            {history.map((e, i) => (
                                <li key={i} className="flex items-center justify-between text-xs text-text dark:text-text-dark">
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-muted">#{i + 1}</span>
                                        <SourceBadge source={e.source} />
                                    </div>
                                    <span className="font-mono">{e.wpm} WPM · {e.accuracy}%</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                <p className="mt-3 text-center text-[10px] text-muted">
                    Este historial se borrará al salir — solo se guarda tu récord en la nube
                </p>

                <button
                    type="button"
                    onClick={onMenu}
                    className="mt-4 w-full rounded-xl bg-accent py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98] dark:bg-accent-dark dark:text-bg-dark"
                >
                    Volver al menú
                </button>
            </div>
        </div>
    )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function InfiniteModePage() {
    const { navigate } = useRouter()
    const { user } = useAuth()

    const {
        gameState,
        currentItem,
        chars,
        cursorIndex,
        errors,
        liveWpm,
        liveAccuracy,
        sessionHistory,
        textsCompleted,
        sessionAvgWpm,
        sessionBestWpm,
        bufferSize,
        inputRef,
        handleKeyDown,
        focusInput,
        finishGame,
    } = useInfiniteMode()

    // ── Save Firestore record on finish (Phase 5: only if new record) ──────────
    const handleMenuWithSave = useCallback(async () => {
        if (user && sessionBestWpm > 0) {
            try {
                const ref = doc(db, 'users', user.uid)
                const snap = await getDoc(ref)
                if (snap.exists()) {
                    const data = snap.data() as { wpmRecord?: number }
                    const currentRecord = data.wpmRecord ?? 0
                    if (sessionBestWpm > currentRecord) {
                        await updateDoc(ref, {
                            wpmRecord: sessionBestWpm,
                            updatedAt: new Date().toISOString(),
                        })
                    }
                } else {
                    await setDoc(ref, {
                        maxLevel: 0,
                        wpmRecord: sessionBestWpm,
                        updatedAt: new Date().toISOString(),
                    })
                }
            } catch (err) {
                console.warn('Firestore update failed:', err)
            }
        }
        navigate('menu')
    }, [user, sessionBestWpm, navigate])

    const handleKeyDownWithAudio = (e: React.KeyboardEvent<HTMLInputElement>) => {
        resumeAudioContext()
        handleKeyDown(e)
    }

    return (
        <div className="mx-auto flex min-h-dvh max-w-3xl flex-col">
            {/* ── Header ──────────────────────────────────────────────────── */}
            <header className="flex items-center gap-3 px-6 py-5">
                <button
                    type="button"
                    onClick={() => {
                        finishGame()
                    }}
                    aria-label="Terminar y volver al menú"
                    className="shrink-0 rounded-lg p-1.5 text-muted transition-colors hover:bg-black/5 hover:text-text dark:hover:bg-white/10 dark:hover:text-text-dark"
                >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
                <div className="flex-1">
                    <h1 className="text-sm font-semibold uppercase tracking-widest text-muted">
                        Modo Infinito
                    </h1>
                </div>
                {/* Buffer indicator + text count */}
                <div className="flex items-center gap-3">
                    <BufferDots count={bufferSize} />
                    <span className="font-mono text-xs text-muted">
                        {textsCompleted} texto{textsCompleted !== 1 ? 's' : ''}
                    </span>
                </div>
            </header>

            {/* ── Main ────────────────────────────────────────────────────── */}
            <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 pb-12">
                {/* Current text label */}
                <div className="flex w-full max-w-2xl items-center justify-between">
                    <div className="flex items-center gap-2">
                        <SourceBadge source={currentItem.source} />
                        <span className="text-xs text-muted">
                            {currentItem.source === 'local' && currentItem.topic
                                ? currentItem.topic
                                : currentItem.source === 'ai-gpt'
                                    ? 'Generado por ChatGPT'
                                    : currentItem.source === 'ai-gemini'
                                        ? 'Generado por Gemini'
                                        : ''}
                        </span>
                    </div>
                    {gameState === 'active' && (
                        <button
                            type="button"
                            onClick={finishGame}
                            className="text-xs text-muted underline-offset-2 transition-opacity hover:underline"
                        >
                            Terminar (Esc)
                        </button>
                    )}
                </div>

                {/* Live session stats */}
                <div className="flex gap-8 text-center">
                    {[
                        { label: 'WPM', value: gameState === 'active' ? liveWpm : 0, highlight: true },
                        { label: 'Precisión', value: `${gameState === 'active' ? liveAccuracy : 100}%` },
                        { label: 'Errores', value: errors },
                        { label: 'Sesión avg', value: sessionAvgWpm },
                    ].map((s) => (
                        <div key={s.label}>
                            <p className={`font-mono text-xl font-semibold ${s.highlight ? 'text-accent dark:text-accent-dark' : 'text-text dark:text-text-dark'}`}>
                                {s.value}
                            </p>
                            <p className="text-[10px] uppercase tracking-wider text-muted">{s.label}</p>
                        </div>
                    ))}
                </div>

                {/* Typing area */}
                <TypingArea
                    chars={chars}
                    cursorIndex={cursorIndex}
                    testState={gameState === 'idle' ? 'idle' : gameState === 'active' ? 'active' : 'finished'}
                    snippet={null}
                    inputRef={inputRef}
                    onKeyDown={handleKeyDownWithAudio}
                    onFocusRequest={focusInput}
                />

                {gameState === 'idle' && (
                    <p className="text-xs text-muted">
                        Empieza a escribir — la IA preparará más textos en segundo plano
                    </p>
                )}

                {/* Session history strip (live, volatile) */}
                {sessionHistory.length > 0 && gameState === 'active' && (
                    <div className="flex w-full max-w-2xl flex-wrap gap-1.5">
                        {sessionHistory.map((e, i) => (
                            <div
                                key={i}
                                className="flex items-center gap-1 rounded-full bg-black/5 px-2.5 py-1 text-[10px] dark:bg-white/5"
                            >
                                <SourceBadge source={e.source} />
                                <span className="font-mono text-text dark:text-text-dark">{e.wpm}</span>
                                <span className="text-muted">WPM</span>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {/* ── Summary overlay ──────────────────────────────────────────── */}
            {gameState === 'finished' && (
                <InfiniteSummary
                    history={sessionHistory}
                    avgWpm={sessionAvgWpm}
                    bestWpm={sessionBestWpm}
                    textsCompleted={textsCompleted}
                    onMenu={() => void handleMenuWithSave()}
                />
            )}
        </div>
    )
}
