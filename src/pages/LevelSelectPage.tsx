import { useEffect, useState } from 'react'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { useAuth } from '../context/AuthContext'
import { useRouter } from '../context/RouterContext'
import { db } from '../lib/firebase'
import { ODS_SNIPPETS } from '../data/odsTexts'

// Official ODS colors (UN palette)
const ODS_COLORS: Record<number, string> = {
    1: '#e5243b',
    2: '#dda63a',
    3: '#4c9f38',
    4: '#c5192d',
    5: '#ff3a21',
    6: '#26bde2',
    7: '#fcc30b',
    8: '#a21942',
    9: '#fd6925',
    10: '#dd1367',
    11: '#fd9d24',
    12: '#bf8b2e',
    13: '#3f7e44',
    14: '#0a97d9',
    15: '#56c02b',
    16: '#00689d',
    17: '#19486a',
}

export function LevelSelectPage() {
    const { user } = useAuth()
    const { navigate, setSelectedLevel } = useRouter()
    const [maxLevelUnlocked, setMaxLevelUnlocked] = useState<number>(1)
    const [loading, setLoading] = useState(true)

    // Load maxLevelUnlocked from Firestore
    useEffect(() => {
        if (!user) {
            setLoading(false)
            return
        }
        const ref = doc(db, 'users', user.uid)
        getDoc(ref)
            .then((snap) => {
                if (snap.exists()) {
                    const data = snap.data() as { maxLevelUnlocked?: number }
                    setMaxLevelUnlocked(data.maxLevelUnlocked ?? 1)
                } else {
                    // Bootstrap document with default
                    void setDoc(ref, { maxLevelUnlocked: 1 }, { merge: true })
                    setMaxLevelUnlocked(1)
                }
            })
            .catch(console.error)
            .finally(() => setLoading(false))
    }, [user])

    const handleSelectLevel = (levelIndex: number) => {
        setSelectedLevel(levelIndex)   // 0-based
        navigate('game-levels')
    }

    const completedCount = Math.max(0, maxLevelUnlocked - 1)

    return (
        <div className="flex min-h-dvh flex-col bg-bg dark:bg-bg-dark">
            {/* Header */}
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
                        Selección de Nivel
                    </h1>
                    <p className="mt-0.5 text-base font-bold text-text dark:text-text-dark">
                        ¿Qué ODS quieres practicar?
                    </p>
                </div>
            </header>

            <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 pb-10">
                {/* Progress bar */}
                <div className="rounded-2xl border border-black/8 bg-surface p-4 dark:border-white/8 dark:bg-surface-dark">
                    <div className="mb-2 flex items-center justify-between text-xs text-muted">
                        <span className="font-semibold uppercase tracking-wider">Tu progreso</span>
                        <span className="font-mono font-semibold text-text dark:text-text-dark">
                            {completedCount}/17 ODS completados
                        </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
                        <div
                            className="h-full rounded-full bg-accent transition-all duration-500 dark:bg-accent-dark"
                            style={{ width: `${(completedCount / 17) * 100}%` }}
                        />
                    </div>
                    {completedCount === 17 && (
                        <p className="mt-2 text-center text-xs font-semibold text-accent dark:text-accent-dark">
                            🏆 ¡Has completado todos los ODS!
                        </p>
                    )}
                </div>

                {/* Grid */}
                {loading ? (
                    <div className="flex flex-1 items-center justify-center">
                        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent dark:border-accent-dark" />
                    </div>
                ) : (
                    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                        {ODS_SNIPPETS.map((ods, index) => {
                            const levelNum = ods.goal        // 1–17
                            const isUnlocked = levelNum <= maxLevelUnlocked
                            const isCompleted = levelNum < maxLevelUnlocked
                            const color = ODS_COLORS[levelNum]!

                            return (
                                <button
                                    key={levelNum}
                                    type="button"
                                    disabled={!isUnlocked}
                                    onClick={() => handleSelectLevel(index)}
                                    title={isUnlocked ? ods.title : `Bloqueado — completa el ODS ${levelNum - 1} primero`}
                                    className={`
                                        group relative flex flex-col items-center justify-center rounded-2xl
                                        p-3 text-center shadow-sm transition-all duration-200
                                        ${isUnlocked
                                            ? 'cursor-pointer hover:scale-105 hover:shadow-md active:scale-[0.97]'
                                            : 'cursor-not-allowed opacity-35 grayscale'
                                        }
                                    `}
                                    style={
                                        isUnlocked
                                            ? { backgroundColor: color }
                                            : { backgroundColor: '#9ca3af' }
                                    }
                                >
                                    {/* ODS number */}
                                    <span className="font-mono text-xs font-bold text-white/80">
                                        ODS {levelNum}
                                    </span>

                                    {/* Title */}
                                    <span
                                        className="mt-1 text-[10px] font-semibold leading-tight text-white"
                                        style={{ textShadow: '0 1px 2px rgba(0,0,0,0.4)' }}
                                    >
                                        {ods.title}
                                    </span>

                                    {/* Completed check */}
                                    {isCompleted && (
                                        <span className="absolute right-1.5 top-1.5 text-xs">✅</span>
                                    )}

                                    {/* Locked icon */}
                                    {!isUnlocked && (
                                        <span className="absolute right-1.5 top-1.5 text-sm">🔒</span>
                                    )}
                                </button>
                            )
                        })}
                    </div>
                )}

                {/* Hint */}
                {!loading && maxLevelUnlocked < 17 && (
                    <p className="text-center text-xs text-muted">
                        Completa el ODS {maxLevelUnlocked} para desbloquear el siguiente nivel
                    </p>
                )}
            </main>
        </div>
    )
}
