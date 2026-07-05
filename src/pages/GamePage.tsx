import { useState } from 'react'
import { Header } from '../components/Header'
import { TimerSelector } from '../components/TimerSelector'
import { StatsBar } from '../components/StatsBar'
import { TypingArea } from '../components/TypingArea'
import { ResultsPanel } from '../components/ResultsPanel'
import { Modal } from '../components/Modal'

import { StatsHistoryPanel } from '../components/StatsHistoryPanel'
import { SettingsMenu } from '../components/SettingsMenu'
import { useTheme } from '../hooks/useTheme'
import { useUserData } from '../hooks/useUserData'
import { useTypingTest } from '../hooks/useTypingTest'
import { resumeAudioContext } from '../utils/sounds'
import { useRouter } from '../context/RouterContext'
import type { TimerMode } from '../types'

type PanelView = 'profile' | 'stats' | 'settings'

function TypingSession({
    timerMode,
    onTimerModeChange,
    soundsEnabled,
    onSessionSaved,
}: {
    timerMode: TimerMode
    onTimerModeChange: (mode: TimerMode) => void
    soundsEnabled: boolean
    onSessionSaved: () => void
}) {
    const {
        testState,
        chars,
        cursorIndex,
        countdown,
        snippet,
        liveStats,
        result,
        isNewRecord,
        bestWpm,
        newBadges,
        sessionKeyErrors,
        inputRef,
        resetTest,
        finishTest,
        handleKeyDown,
        focusInput,
    } = useTypingTest(timerMode, { soundsEnabled, onSessionSaved })

    const handleKeyDownWithAudio = (e: React.KeyboardEvent<HTMLInputElement>) => {
        resumeAudioContext()
        handleKeyDown(e)
    }

    return (
        <>
            <main className="flex flex-1 flex-col items-center justify-center gap-8 pb-12">
                <TimerSelector
                    selected={timerMode}
                    onSelect={onTimerModeChange}
                    testState={testState}
                    countdown={countdown}
                />

                <StatsBar stats={liveStats} />

                <TypingArea
                    chars={chars}
                    cursorIndex={cursorIndex}
                    testState={testState}
                    snippet={snippet}
                    inputRef={inputRef}
                    onKeyDown={handleKeyDownWithAudio}
                    onFocusRequest={focusInput}
                />

                {timerMode === 'infinite' && testState === 'active' && (
                    <button
                        type="button"
                        onClick={finishTest}
                        className="animate-fade-in text-xs text-muted underline-offset-2 transition-opacity hover:underline"
                    >
                        Terminar test
                    </button>
                )}
            </main>

            {testState === 'finished' && result && (
                <ResultsPanel
                    result={result}
                    timerMode={timerMode}
                    isNewRecord={isNewRecord}
                    bestWpm={bestWpm}
                    newBadges={newBadges}
                    sessionKeyErrors={sessionKeyErrors}
                    onRetry={resetTest}
                    onChangeTimer={resetTest}
                />
            )}
        </>
    )
}

/** Classic typing game — used by both game-levels and game-infinite stubs */
export function GamePage() {
    const { navigate } = useRouter()
    const { theme, toggleTheme } = useTheme()
    const { data, refresh, setSettings } = useUserData()
    const [timerMode, setTimerMode] = useState<TimerMode>('30')
    const [panel, setPanel] = useState<PanelView | null>(null)

    const soundsEnabled = data.settings.soundsEnabled

    // Extended panel handler: allow navigating to router profile
    const handleOpenPanel = (p: PanelView) => {
        if (p === 'profile') {
            navigate('profile')
        } else {
            setPanel(p)
        }
    }

    return (
        <div className="mx-auto flex min-h-dvh max-w-4xl flex-col">
            <Header
                theme={theme}
                onToggleTheme={toggleTheme}
                displayName={data.profile.displayName}
                onOpenPanel={handleOpenPanel}
                onBackToMenu={() => navigate('menu')}
            />

            <TypingSession
                key={timerMode}
                timerMode={timerMode}
                onTimerModeChange={setTimerMode}
                soundsEnabled={soundsEnabled}
                onSessionSaved={refresh}
            />

            <footer className="pb-6 text-center text-[10px] text-muted">
                Contenido educativo sobre los 17 ODS de la ONU ·{' '}
                {new Date().getFullYear()}
            </footer>

            {panel === 'stats' && (
                <Modal title="Estadísticas históricas" onClose={() => setPanel(null)} wide>
                    <StatsHistoryPanel data={data} />
                </Modal>
            )}

            {panel === 'settings' && (
                <Modal title="Ajustes" onClose={() => setPanel(null)}>
                    <SettingsMenu
                        soundsEnabled={soundsEnabled}
                        onToggleSounds={() =>
                            setSettings({ soundsEnabled: !soundsEnabled })
                        }
                    />
                </Modal>
            )}
        </div>
    )
}
