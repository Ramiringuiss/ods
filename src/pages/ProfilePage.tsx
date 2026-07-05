import { useEffect, useState } from 'react'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { useAuth } from '../context/AuthContext'
import { useRouter } from '../context/RouterContext'
import { db } from '../lib/firebase'
import { loadUserData } from '../storage/userStore'
import { CertificateGenerator } from '../components/CertificateGenerator'

interface FirestoreProfile {
    maxLevel: number
    wpmRecord: number
    updatedAt: string
}

export function ProfilePage() {
    const { user } = useAuth()
    const { navigate } = useRouter()
    const localData = loadUserData()
    const [remote, setRemote] = useState<FirestoreProfile | null>(null)
    const [loadingRemote, setLoadingRemote] = useState(!!user)

    useEffect(() => {
        if (!user) return
        const ref = doc(db, 'users', user.uid)
        getDoc(ref)
            .then((snap) => {
                if (snap.exists()) {
                    setRemote(snap.data() as FirestoreProfile)
                } else {
                    // Initialize Firestore doc for new users
                    const init: FirestoreProfile = {
                        maxLevel: 0,
                        wpmRecord: localData.progress.bestWpm['30'] ?? 0,
                        updatedAt: new Date().toISOString(),
                    }
                    void setDoc(ref, init)
                    setRemote(init)
                }
            })
            .catch(console.error)
            .finally(() => setLoadingRemote(false))
    }, [user, localData.progress.bestWpm])

    const bestWpmOverall = Math.max(...Object.values(localData.progress.bestWpm))
    const displayName = user?.displayName ?? localData.profile.displayName
    const photoURL = user?.photoURL

    const stats = [
        {
            label: 'Mejor WPM',
            value: bestWpmOverall,
            sub: 'local',
            highlight: true,
        },
        {
            label: 'Récord Nube',
            value: loadingRemote ? '…' : (remote?.wpmRecord ?? '—'),
            sub: 'firestore',
        },
        {
            label: 'Nivel máx.',
            value: loadingRemote ? '…' : (remote?.maxLevel ?? 0),
            sub: 'firestore',
        },
        { label: 'Sesiones', value: localData.progress.sessionsCompleted, sub: 'local' },
        { label: 'Logros', value: `${localData.unlockedBadges.length}/12`, sub: 'local' },
        {
            label: 'WPM medio',
            value:
                localData.history.length > 0
                    ? Math.round(
                        localData.history.reduce((s, e) => s + e.wpm, 0) /
                        localData.history.length,
                    )
                    : 0,
            sub: 'local',
        },
    ]

    return (
        <div className="flex min-h-dvh flex-col bg-bg dark:bg-bg-dark">
            {/* Header */}
            <header className="flex items-center gap-3 px-6 py-5">
                <button
                    type="button"
                    onClick={() => navigate('menu')}
                    aria-label="Volver al menú"
                    className="rounded-lg p-1.5 text-muted transition-colors hover:bg-black/5 hover:text-text dark:hover:bg-white/10 dark:hover:text-text-dark"
                >
                    <svg
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
                <h2 className="text-lg font-semibold text-text dark:text-text-dark">
                    Mi Perfil
                </h2>
            </header>

            <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-6 pb-10">
                {/* Avatar + name */}
                <div className="flex flex-col items-center gap-3 pt-4">
                    {photoURL ? (
                        <img
                            src={photoURL}
                            alt={displayName}
                            className="h-20 w-20 rounded-full ring-4 ring-accent/30 dark:ring-accent-dark/30"
                        />
                    ) : (
                        <div
                            className="flex h-20 w-20 items-center justify-center rounded-full text-3xl font-bold text-white"
                            style={{
                                backgroundColor: `hsl(${localData.profile.avatarHue}, 45%, 42%)`,
                            }}
                        >
                            {displayName.charAt(0).toUpperCase()}
                        </div>
                    )}
                    <div className="text-center">
                        <p className="text-lg font-semibold text-text dark:text-text-dark">
                            {displayName}
                        </p>
                        {user?.email && (
                            <p className="text-xs text-muted">{user.email}</p>
                        )}
                    </div>
                </div>

                {/* Stats grid */}
                <div className="rounded-2xl border border-black/8 bg-surface p-5 dark:border-white/8 dark:bg-surface-dark">
                    <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted">
                        Estadísticas
                    </h3>
                    <dl className="grid grid-cols-3 gap-4">
                        {stats.map((s) => (
                            <div key={s.label} className="text-center">
                                <dd
                                    className={`font-mono text-2xl font-semibold ${s.highlight ? 'text-accent dark:text-accent-dark' : 'text-text dark:text-text-dark'}`}
                                >
                                    {s.value}
                                </dd>
                                <dt className="mt-1 text-[10px] uppercase tracking-wide text-muted">
                                    {s.label}
                                </dt>
                                <span className="text-[9px] text-muted/60">{s.sub}</span>
                            </div>
                        ))}
                    </dl>
                </div>

                {/* Badges */}
                {localData.unlockedBadges.length > 0 && (
                    <div className="rounded-2xl border border-black/8 bg-surface p-5 dark:border-white/8 dark:bg-surface-dark">
                        <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted">
                            Logros desbloqueados
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            {localData.unlockedBadges.map((id) => (
                                <span
                                    key={id}
                                    className="rounded-lg bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent dark:bg-accent-dark/15 dark:text-accent-dark"
                                >
                                    {id}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {!user && (
                    <p className="rounded-xl bg-amber-500/10 px-4 py-3 text-center text-xs text-amber-700 dark:text-amber-300">
                        Inicia sesión con Google para sincronizar tu nivel y récord en la nube.
                    </p>
                )}

                {/* Certificate section */}
                <div className="rounded-2xl border border-black/8 bg-surface p-5 dark:border-white/8 dark:bg-surface-dark">
                    <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted">
                        Diploma Oficial
                    </h3>
                    <p className="mb-4 text-xs text-muted">
                        Genera un certificado verificable con código QR que demuestra tu nivel de mecanografía.
                        El diploma se descarga como imagen PNG.
                    </p>
                    <CertificateGenerator
                        certData={{
                            uid: user?.uid ?? 'guest',
                            displayName,
                            wpm: remote?.wpmRecord ?? bestWpmOverall,
                            level: remote?.maxLevel ?? 0,
                        }}
                        canSave={!!user}
                    />
                </div>
            </main>
        </div>
    )
}
