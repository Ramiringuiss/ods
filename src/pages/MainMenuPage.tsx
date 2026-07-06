import { useAuth } from '../context/AuthContext'
import { useRouter } from '../context/RouterContext'
import { useTheme } from '../hooks/useTheme'
import { ThemeToggle } from '../components/ThemeToggle'

export function MainMenuPage() {
    const { user, signOut } = useAuth()
    const { navigate } = useRouter()
    const { theme, toggleTheme } = useTheme()

    const displayName = user?.displayName ?? 'Invitado'
    const photoURL = user?.photoURL

    const menuItems = [
        {
            id: 'level-select' as const,
            emoji: '🏆',
            title: 'Modo Niveles',
            description: 'Supera niveles con dificultad progresiva',
            color:
                'from-amber-500/20 to-orange-500/10 border-amber-500/30 hover:border-amber-500/60',
            badge: '17 niveles',
        },
        {
            id: 'game-infinite' as const,
            emoji: '∞',
            title: 'Modo Infinito',
            description: 'Textos generados por IA sin límite de tiempo',
            color:
                'from-accent/20 to-caret/10 border-accent/30 hover:border-accent/60 dark:from-accent-dark/20 dark:border-accent-dark/30',
            badge: 'IA',
        },
        {
            id: 'profile' as const,
            emoji: '👤',
            title: 'Mi Perfil',
            description: 'Ver estadísticas y logros',
            color:
                'from-violet-500/20 to-purple-500/10 border-violet-500/30 hover:border-violet-500/60',
            badge: null,
        },
    ]

    return (
        <div className="flex min-h-dvh flex-col bg-bg dark:bg-bg-dark">
            {/* Header */}
            <header className="flex items-center justify-between px-6 py-5 sm:px-8">
                <div>
                    <h1 className="text-xl font-bold tracking-tight text-text dark:text-text-dark sm:text-2xl">
                        ODS{' '}
                        <span className="text-accent dark:text-accent-dark">Typing</span>
                    </h1>
                </div>
                <div className="flex items-center gap-2">
                    <ThemeToggle theme={theme} onToggle={toggleTheme} />
                    {user && (
                        <button
                            type="button"
                            onClick={() => void signOut()}
                            title="Cerrar sesión"
                            className="rounded-lg px-3 py-1.5 text-xs text-muted transition-colors hover:bg-black/5 hover:text-text dark:hover:bg-white/10 dark:hover:text-text-dark"
                        >
                            Salir
                        </button>
                    )}
                </div>
            </header>

            {/* Main */}
            <main className="flex flex-1 flex-col items-center justify-center gap-10 px-6 py-8">
                {/* Welcome */}
                <div className="text-center">
                    <div className="mb-4 flex justify-center">
                        {photoURL ? (
                            <img
                                src={photoURL}
                                alt={displayName}
                                className="h-16 w-16 rounded-full ring-2 ring-accent/40 dark:ring-accent-dark/40"
                            />
                        ) : (
                            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent/20 text-2xl font-bold text-accent dark:bg-accent-dark/20 dark:text-accent-dark">
                                {displayName.charAt(0).toUpperCase()}
                            </div>
                        )}
                    </div>
                    <h2 className="text-2xl font-semibold text-text dark:text-text-dark">
                        ¡Hola, {displayName.split(' ')[0]}!
                    </h2>
                    <p className="mt-1 text-sm text-muted">¿Qué quieres hacer hoy?</p>
                </div>

                {/* Menu cards */}
                <div className="grid w-full max-w-md gap-4">
                    {menuItems.map((item) => (
                        <button
                            key={item.id}
                            type="button"
                            onClick={() => navigate(item.id)}
                            className={`group relative flex items-center gap-4 rounded-2xl border bg-gradient-to-br px-5 py-4 text-left shadow-sm transition-all duration-200 hover:shadow-md active:scale-[0.98] ${item.color}`}
                        >
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/50 text-2xl shadow-sm dark:bg-black/20">
                                {item.emoji}
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                    <span className="font-semibold text-text dark:text-text-dark">
                                        {item.title}
                                    </span>
                                    {item.badge && (
                                        <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent dark:bg-accent-dark/20 dark:text-accent-dark">
                                            {item.badge}
                                        </span>
                                    )}
                                </div>
                                <p className="mt-0.5 text-xs text-muted">{item.description}</p>
                            </div>
                            <svg
                                className="h-4 w-4 shrink-0 text-muted transition-transform duration-200 group-hover:translate-x-0.5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2}
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M9 5l7 7-7 7"
                                />
                            </svg>
                        </button>
                    ))}
                </div>
            </main>

            <footer className="pb-6 text-center text-[10px] text-muted">
                Contenido educativo sobre los 17 ODS de la ONU · {new Date().getFullYear()}
            </footer>
        </div>
    )
}
