import { useEffect } from 'react'
import { useAuth } from './context/AuthContext'
import { useRouter } from './context/RouterContext'
import { LoginPage } from './pages/LoginPage'
import { MainMenuPage } from './pages/MainMenuPage'
import { ProfilePage } from './pages/ProfilePage'

import { LevelModePage } from './pages/LevelModePage'
import { InfiniteModePage } from './pages/InfiniteModePage'

function AppRoutes() {
  const { user, loading } = useAuth()
  const { route, navigate } = useRouter()

  // If auth resolves and user is already logged in on the login screen → go to menu
  useEffect(() => {
    if (!loading && user && route === 'login') {
      navigate('menu')
    }
  }, [user, loading, route, navigate])

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-bg dark:bg-bg-dark">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent dark:border-accent-dark" />
      </div>
    )
  }

  switch (route) {
    case 'login':
      return <LoginPage />
    case 'menu':
      return <MainMenuPage />
    case 'profile':
      return <ProfilePage />
    case 'game-levels':
      return <LevelModePage />
    case 'game-infinite':
      return <InfiniteModePage />
    default:
      return <MainMenuPage />
  }
}

export default function App() {
  return <AppRoutes />
}
