import { ODS_SNIPPETS } from './odsTexts'

export interface LevelConfig {
    level: number       // 1-indexed
    snippetIndex: number
    timerSeconds: number
    minWpm: number      // informational target shown to player
}

// Timer decreases as levels go up, requiring higher WPM
// Levels 1-4: 75s | 5-8: 60s | 9-12: 48s | 13-15: 38s | 16-17: 30s
function timerForLevel(level: number): number {
    if (level <= 4) return 75
    if (level <= 8) return 60
    if (level <= 12) return 48
    if (level <= 15) return 38
    return 30
}

// Rough WPM target to beat the level comfortably
function targetWpmForLevel(level: number): number {
    if (level <= 4) return 20
    if (level <= 8) return 30
    if (level <= 12) return 40
    if (level <= 15) return 50
    return 65
}

export const LEVELS: LevelConfig[] = ODS_SNIPPETS.map((_, i) => ({
    level: i + 1,
    snippetIndex: i,
    timerSeconds: timerForLevel(i + 1),
    minWpm: targetWpmForLevel(i + 1),
}))

export const TOTAL_LEVELS = LEVELS.length
