import type { CharState } from '../types'
import { ODS_SNIPPETS, type OdsSnippet } from '../data/odsTexts'

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]!
}

export function getRandomSnippet(excludeGoal?: number): OdsSnippet {
  const pool =
    excludeGoal !== undefined
      ? ODS_SNIPPETS.filter((s) => s.goal !== excludeGoal)
      : ODS_SNIPPETS
  return pickRandom(pool.length > 0 ? pool : ODS_SNIPPETS)
}

export function buildInitialText(): { text: string; snippet: OdsSnippet } {
  const snippet = getRandomSnippet() //ODS_SNIPPETS[0]
  return { text: snippet.text + ' ', snippet }
}

export function appendRandomText(
  currentText: string,
  lastGoal: number,
): { text: string; snippet: OdsSnippet } {
  const snippet = getRandomSnippet(lastGoal)
  return { text: currentText + snippet.text + ' ', snippet }
}

export function initCharStates(text: string): CharState[] {
  return text.split('').map((char) => ({
    char,
    status: 'pending',
  }))
}
