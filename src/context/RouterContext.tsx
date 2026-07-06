import {
    createContext,
    useContext,
    useState,
    useCallback,
    type ReactNode,
} from 'react'

export type AppRoute =
    | 'login'
    | 'menu'
    | 'profile'
    | 'level-select'
    | 'game-levels'
    | 'game-infinite'

interface RouterContextValue {
    route: AppRoute
    navigate: (to: AppRoute) => void
    /** 0-based index of the ODS level chosen in LevelSelectPage */
    selectedLevel: number
    setSelectedLevel: (index: number) => void
}

const RouterContext = createContext<RouterContextValue | null>(null)

export function RouterProvider({ children }: { children: ReactNode }) {
    const [route, setRoute] = useState<AppRoute>('login')
    const [selectedLevel, setSelectedLevel] = useState(0)

    const navigate = useCallback((to: AppRoute) => {
        setRoute(to)
    }, [])

    return (
        <RouterContext.Provider value={{ route, navigate, selectedLevel, setSelectedLevel }}>
            {children}
        </RouterContext.Provider>
    )
}

export function useRouter(): RouterContextValue {
    const ctx = useContext(RouterContext)
    if (!ctx) throw new Error('useRouter must be used within RouterProvider')
    return ctx
}
