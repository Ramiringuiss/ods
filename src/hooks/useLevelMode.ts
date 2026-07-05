import {
    useCallback,
    useEffect,
    useReducer,
    useRef,
    useState,
} from 'react'
import type { CharState } from '../types'
import {
    applyBackspace,
    applyCharacter,
    countCorrectChars,
    type TypingEngineState,
} from '../engine/typingEngine'
import { initCharStates } from '../utils/textGenerator'
import { calculateAccuracy, calculateWpm } from '../utils/typingMetrics'
import { ODS_SNIPPETS } from '../data/odsTexts'
import { LEVELS, TOTAL_LEVELS } from '../data/levels'
import { playSound } from '../utils/sounds'

// ─── Types ────────────────────────────────────────────────────────────────────

export type LevelState = 'idle' | 'active' | 'passed' | 'failed' | 'complete'

export interface LevelResult {
    level: number
    wpm: number
    accuracy: number
    timeUsed: number
}

// ─── Engine reducer (same pattern as useTypingTest) ──────────────────────────

type EngineAction =
    | { type: 'SYNC'; state: TypingEngineState }
    | { type: 'RESET'; chars: CharState[] }

function engineReducer(s: TypingEngineState, a: EngineAction): TypingEngineState {
    if (a.type === 'SYNC') return a.state
    if (a.type === 'RESET') return { chars: a.chars, cursorIndex: 0, errors: 0 }
    return s
}

function buildCharsForLevel(levelIndex: number): CharState[] {
    const snippet = ODS_SNIPPETS[levelIndex]!
    return initCharStates(snippet.text)
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useLevelMode(onGameEnd: (results: LevelResult[]) => void) {
    const [levelIndex, setLevelIndex] = useState(0) // 0-based
    const [levelState, setLevelState] = useState<LevelState>('idle')
    const [timeLeft, setTimeLeft] = useState<number>(LEVELS[0]!.timerSeconds)
    const [levelResults, setLevelResults] = useState<LevelResult[]>([])

    const [engine, dispatchEngine] = useReducer(engineReducer, {
        chars: buildCharsForLevel(0),
        cursorIndex: 0,
        errors: 0,
    })

    const startTimeRef = useRef<number | null>(null)
    const levelStateRef = useRef<LevelState>('idle')
    const inputRef = useRef<HTMLInputElement>(null)

    const currentLevel = LEVELS[levelIndex]!
    const snippet = ODS_SNIPPETS[currentLevel.snippetIndex]!

    // ── Keep ref in sync ──────────────────────────────────────────────────────
    useEffect(() => {
        levelStateRef.current = levelState
    }, [levelState])

    // ── Countdown ─────────────────────────────────────────────────────────────
    useEffect(() => {
        if (levelState !== 'active') return

        const interval = window.setInterval(() => {
            if (!startTimeRef.current) return
            const elapsed = (Date.now() - startTimeRef.current) / 1000
            const remaining = currentLevel.timerSeconds - elapsed

            if (remaining <= 0) {
                clearInterval(interval)
                setTimeLeft(0)
                setLevelState('failed')
                levelStateRef.current = 'failed'
                playSound('error', true)
            } else {
                setTimeLeft(remaining)
            }
        }, 100)

        return () => clearInterval(interval)
    }, [levelState, currentLevel.timerSeconds])

    // ── Helpers ───────────────────────────────────────────────────────────────

    const buildResult = useCallback((): LevelResult => {
        const elapsed = startTimeRef.current ? Date.now() - startTimeRef.current : 1
        const correctChars = countCorrectChars(engine.chars)
        return {
            level: currentLevel.level,
            wpm: calculateWpm(correctChars, elapsed),
            accuracy: calculateAccuracy(correctChars, engine.cursorIndex),
            timeUsed: elapsed / 1000,
        }
    }, [engine.chars, engine.cursorIndex, currentLevel.level])

    // ── Pass level ─────────────────────────────────────────────────────────────
    const passLevel = useCallback(() => {
        const result = buildResult()
        const next = [...levelResults, result]
        setLevelResults(next)
        playSound('complete', true)

        if (levelIndex + 1 >= TOTAL_LEVELS) {
            setLevelState('complete')
            levelStateRef.current = 'complete'
            onGameEnd(next)
        } else {
            setLevelState('passed')
            levelStateRef.current = 'passed'
        }
    }, [buildResult, levelResults, levelIndex, onGameEnd])

    // ── Advance to next level ──────────────────────────────────────────────────
    const nextLevel = useCallback(() => {
        const next = levelIndex + 1
        setLevelIndex(next)
        dispatchEngine({ type: 'RESET', chars: buildCharsForLevel(next) })
        setTimeLeft(LEVELS[next]!.timerSeconds)
        setLevelState('idle')
        levelStateRef.current = 'idle'
        startTimeRef.current = null
        setTimeout(() => inputRef.current?.focus(), 50)
    }, [levelIndex])

    // ── Retry (after fail: restart same level) ─────────────────────────────────
    const retryLevel = useCallback(() => {
        dispatchEngine({ type: 'RESET', chars: buildCharsForLevel(levelIndex) })
        setTimeLeft(currentLevel.timerSeconds)
        setLevelState('idle')
        levelStateRef.current = 'idle'
        startTimeRef.current = null
        setTimeout(() => inputRef.current?.focus(), 50)
    }, [levelIndex, currentLevel.timerSeconds])

    // ── Typing handlers ────────────────────────────────────────────────────────
    const startIfNeeded = useCallback(() => {
        if (levelStateRef.current === 'idle') {
            setLevelState('active')
            levelStateRef.current = 'active'
            startTimeRef.current = Date.now()
        }
    }, [])

    const typeChar = useCallback(
        (inputChar: string) => {
            if (levelStateRef.current !== 'idle' && levelStateRef.current !== 'active') return
            startIfNeeded()

            const result = applyCharacter(engine, inputChar)
            if (!result) return

            dispatchEngine({ type: 'SYNC', state: result.state })

            // Check if entire text is typed (cursor past last char)
            if (result.state.cursorIndex >= engine.chars.length) {
                passLevel()
            }

            if (!result.isCorrect) playSound('error', true)
            else playSound('key', true)
        },
        [engine, startIfNeeded, passLevel],
    )

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent<HTMLInputElement>) => {
            const state = levelStateRef.current
            if (state !== 'idle' && state !== 'active') return

            if (e.key === 'Backspace') {
                e.preventDefault()
                if (engine.cursorIndex === 0 || state === 'idle') return
                dispatchEngine({ type: 'SYNC', state: applyBackspace(engine) })
                return
            }

            if (e.key === ' ' || e.code === 'Space') {
                e.preventDefault()
                typeChar(' ')
                return
            }

            if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
                e.preventDefault()
                typeChar(e.key)
            }
        },
        [engine, typeChar],
    )

    const focusInput = useCallback(() => {
        if (levelStateRef.current !== 'passed' && levelStateRef.current !== 'failed' && levelStateRef.current !== 'complete') {
            inputRef.current?.focus()
        }
    }, [])

    // ── Live stats ─────────────────────────────────────────────────────────────
    const elapsed = startTimeRef.current ? Date.now() - startTimeRef.current : 0
    const liveWpm = calculateWpm(countCorrectChars(engine.chars), elapsed)
    const liveAccuracy = calculateAccuracy(countCorrectChars(engine.chars), engine.cursorIndex)

    return {
        // State
        levelIndex,
        levelNumber: currentLevel.level,
        levelState,
        snippet,
        timeLeft,
        timerSeconds: currentLevel.timerSeconds,
        minWpm: currentLevel.minWpm,
        levelResults,
        // Engine
        chars: engine.chars,
        cursorIndex: engine.cursorIndex,
        errors: engine.errors,
        // Live stats
        liveWpm,
        liveAccuracy,
        // Refs
        inputRef,
        // Actions
        handleKeyDown,
        focusInput,
        passLevel,
        nextLevel,
        retryLevel,
    }
}
