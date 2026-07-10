import { useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useRouter } from '../context/RouterContext'

export function LoginPage() {
    const { user, loading, signInWithGoogle } = useAuth()
    const { navigate } = useRouter()

    useEffect(() => {
        if (!loading && user) {
            navigate('menu')
        }
    }, [user, loading, navigate])

    if (loading) {
        return (
            <div className="flex min-h-dvh items-center justify-center bg-bg dark:bg-bg-dark">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent dark:border-accent-dark" />
            </div>
        )
    }

    return (
        <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-bg dark:bg-bg-dark">
            {/* Background decoration */}
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 overflow-hidden"
            >
                <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-accent/10 blur-3xl dark:bg-accent-dark/10" />
                <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-caret/10 blur-3xl" />
            </div>

            <div className="relative z-10 flex w-full max-w-sm flex-col items-center gap-8 px-6 py-12">
                {/* Logo */}
                <div className="text-center">
                    <h1 className="text-4xl font-bold tracking-tight text-text dark:text-text-dark">
                        ODS{' '}
                        <span className="bg-gradient-to-r from-accent to-caret bg-clip-text text-transparent dark:from-accent-dark dark:to-caret">
                            Typing
                        </span>
                    </h1>
                    <p className="mt-2 text-sm text-muted">
                        Practica mecanografía con los{' '}
                        <span className="font-medium text-accent dark:text-accent-dark">
                            17 ODS de la ONU
                        </span>
                    </p>
                </div>

                {/* Feature pills */}
                <div className="flex flex-wrap justify-center gap-2">
                    {['🏆 Modo Niveles', '∞ Modo Infinito con IA', '📊 Estadísticas'].map(
                        (label) => (
                            <span
                                key={label}
                                className="rounded-full border border-black/10 px-3 py-1 text-xs text-muted dark:border-white/10"
                            >
                                {label}
                            </span>
                        ),
                    )}
                </div>

                {/* Sign in card */}
                <div className="w-full rounded-2xl border border-black/8 bg-surface p-6 shadow-lg dark:border-white/8 dark:bg-surface-dark">
                    <p className="mb-5 text-center text-sm text-muted">
                        Inicia sesión para guardar tu progreso
                    </p>
                    <button
                        type="button"
                        onClick={() => void signInWithGoogle()}
                        className="flex w-full items-center justify-center gap-3 rounded-xl bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-black/10 transition-all duration-200 hover:shadow-md hover:ring-black/20 active:scale-[0.98] dark:bg-white/90 dark:text-gray-800"
                    >
                        {/* Google icon */}
                        <svg className="h-5 w-5" viewBox="0 0 24 24">
                            <path
                                fill="#4285F4"
                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            />
                            <path
                                fill="#34A853"
                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            />
                            <path
                                fill="#FBBC05"
                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                            />
                            <path
                                fill="#EA4335"
                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                            />
                        </svg>
                        Continuar con Google
                    </button>

                    <div className="mt-4 flex items-center gap-3">
                        <div className="h-px flex-1 bg-black/8 dark:bg-white/8" />
                        <span className="text-xs text-muted">o</span>
                        <div className="h-px flex-1 bg-black/8 dark:bg-white/8" />
                    </div>

                    <button
                        type="button"
                        onClick={() => navigate('menu')}
                        className="mt-4 w-full rounded-xl border border-black/10 px-4 py-2.5 text-sm text-muted transition-colors duration-200 hover:border-black/20 hover:text-text active:scale-[0.98] dark:border-white/10 dark:hover:border-white/20 dark:hover:text-text-dark"
                    >
                        Continuar como invitado
                    </button>
                </div>

                <a
                    href="https://drive.google.com/file/d/1kFfggA-CEJn4dcv3G3B9ymVz_WsVanE3/view?usp=sharing"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-muted transition-colors duration-200 hover:text-text dark:hover:text-text-dark"
                >
                    📄 Informe del Proyecto
                </a>

                <p className="text-center text-[10px] text-muted">
                    Tus datos de sesión se guardan de forma segura con Firebase
                </p>
            </div>
        </div>
    )
}
