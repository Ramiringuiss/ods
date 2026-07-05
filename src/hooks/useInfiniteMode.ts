import {
    useCallback,
    useEffect,
    useReducer,
    useRef,
    useState,
    useSyncExternalStore,
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
import { resetTextQueue, type TextItem } from '../services/aiTextService'
import { playSound } from '../utils/sounds'

// ─── Types ────────────────────────────────────────────────────────────────────

export type InfiniteState = 'idle' | 'active' | 'finished'

/** Volatile session entry — lives only in React state, never persisted */
export interface SessionEntry {
    textIndex: number
    wpm: number
    accuracy: number
    source: TextItem['source']
}

// ─── Engine reducer ───────────────────────────────────────────────────────────

type EngineAction =
    | { type: 'SYNC'; state: TypingEngineState }
    | { type: 'RESET'; chars: CharState[] }

function engineReducer(s: TypingEngineState, a: EngineAction): TypingEngineState {
    if (a.type === 'SYNC') return a.state
    if (a.type === 'RESET') return { chars: a.chars, cursorIndex: 0, errors: 0 }
    return s
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useInfiniteMode() {
    // Fresh queue on every mount (Phase 5: volatile — discarded on unmount)
    const queueRef = useRef(resetTextQueue())

    // Subscribe to queue changes for re-render when buffer fills
    useSyncExternalStore(
        (cb) => queueRef.current.subscribe(cb),
        () => queueRef.current.length,
    )

    const [currentItem, setCurrentItem] = useState<TextItem>(() =>
        queueRef.current.dequeue(),
    )
    const [gameState, setGameState] = useState<InfiniteState>('idle')
    const [sessionHistory, setSessionHistory] = useState<SessionEntry[]>([])

    const [engine, dispatchEngine] = useReducer(engineReducer, {
        chars: initCharStates(currentItem.text),
        cursorIndex: 0,
        errors: 0,
    })

    const startTimeRef = useRef<number | null>(null)
    const gameStateRef = useRef<InfiniteState>('idle')
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        gameStateRef.current = gameState
    }, [gameState])

    // Kick off background prefetch immediately on mount
    useEffect(() => {
        queueRef.current.maybeRefill()
    }, [])

    // ── Helpers ────────────────────────────────────────────────────────────────

    const buildEntry = useCallback(
        (textIndex: number, source: TextItem['source']): SessionEntry => {
            const elapsed = startTimeRef.current ? Date.now() - startTimeRef.current : 1
            const correct = countCorrectChars(engine.chars)
            return {
                textIndex,
                wpm: calculateWpm(correct, elapsed),
                accuracy: calculateAccuracy(correct, engine.cursorIndex),
                source,
            }
        },
        [engine.chars, engine.cursorIndex],
    )

    // ── Advance to next text after completing one ──────────────────────────────
    const advanceText = useCallback(() => {
        const entry = buildEntry(sessionHistory.length, currentItem.source)
        setSessionHistory((prev) => [...prev, entry])
        playSound('complete', true)

        // Trigger background refill proactively
        queueRef.current.maybeRefill()

        const next = queueRef.current.dequeue()
        setCurrentItem(next)
        dispatchEngine({ type: 'RESET', chars: initCharStates(next.text) })
        startTimeRef.current = Date.now() // reset timer for next text
    }, [buildEntry, currentItem.source, sessionHistory.length])

    // ── Finish game (user presses "Terminar") ──────────────────────────────────
    const finishGame = useCallback(() => {
        if (gameStateRef.current !== 'active') return
        setGameState('finished')
        gameStateRef.current = 'finished'
        playSound('complete', true)
    }, [])

    // ── Typing handlers ────────────────────────────────────────────────────────

    const startIfNeeded = useCallback(() => {
        if (gameStateRef.current === 'idle') {
            setGameState('active')
            gameStateRef.current = 'active'
            startTimeRef.current = Date.now()
        }
    }, [])

    const typeChar = useCallback(
        (inputChar: string) => {
            if (gameStateRef.current === 'finished') return
            startIfNeeded()

            const result = applyCharacter(engine, inputChar)
            if (!result) return

            dispatchEngine({ type: 'SYNC', state: result.state })

            if (result.state.cursorIndex >= engine.chars.length) {
                advanceText()
            }

            if (result.isCorrect) playSound('key', true)
            else playSound('error', true)
        },
        [engine, startIfNeeded, advanceText],
    )

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent<HTMLInputElement>) => {
            if (gameStateRef.current === 'finished') return

            if (e.key === 'Escape' && gameStateRef.current === 'active') {
                e.preventDefault()
                finishGame()
                return
            }

            if (e.key === 'Backspace') {
                e.preventDefault()
                if (engine.cursorIndex === 0 || gameStateRef.current === 'idle') return
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
        [engine, typeChar, finishGame],
    )

    const focusInput = useCallback(() => {
        if (gameStateRef.current !== 'finished') inputRef.current?.focus()
    }, [])

    // ── Live stats ─────────────────────────────────────────────────────────────
    const elapsed = startTimeRef.current ? Date.now() - startTimeRef.current : 0
    const liveWpm = calculateWpm(countCorrectChars(engine.chars), elapsed)
    const liveAccuracy = calculateAccuracy(countCorrectChars(engine.chars), engine.cursorIndex)

    // Session aggregate stats
    const textsCompleted = sessionHistory.length
    const sessionAvgWpm =
        textsCompleted > 0
            ? Math.round(sessionHistory.reduce((s, e) => s + e.wpm, 0) / textsCompleted)
            : 0
    const sessionBestWpm =
        textsCompleted > 0 ? Math.max(...sessionHistory.map((e) => e.wpm)) : 0

    return {
        gameState,
        currentItem,
        chars: engine.chars,
        cursorIndex: engine.cursorIndex,
        errors: engine.errors,
        liveWpm,
        liveAccuracy,
        sessionHistory,
        textsCompleted,
        sessionAvgWpm,
        sessionBestWpm,
        bufferSize: queueRef.current.length,
        inputRef,
        handleKeyDown,
        focusInput,
        finishGame,
    }
}
