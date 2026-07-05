/**
 * AI Text Service — Cola/Buffer para el Modo Infinito
 *
 * Estrategia:
 * 1. Cola pre-cargada con textos ODS estáticos para inicio inmediato.
 * 2. En segundo plano, hace fetch a las APIs de Delirius (GPT y Gemini).
 * 3. Parsea dos formatos de respuesta: response.data (string) o response.data.result (string).
 * 4. Si una API falla o tarda >5s, cae al fallback (otro API o texto local).
 * 5. El buffer mínimo es 2 textos para que el jugador nunca se quede sin palabras.
 */

import { ODS_SNIPPETS } from '../data/odsTexts'

export interface TextItem {
    text: string
    source: 'local' | 'ai-gpt' | 'ai-gemini'
    topic?: string
}

// Prompts educativos rotatorios para las APIs de IA
const AI_PROMPTS = [
    'Escribe un párrafo corto de 2 oraciones sobre los Objetivos de Desarrollo Sostenible de la ONU. Solo el párrafo, sin título.',
    'Escribe un párrafo educativo breve de 2 oraciones sobre ecología y medio ambiente. Solo el párrafo, sin título.',
    'Escribe un párrafo corto de 2 oraciones sobre tecnología sostenible y energías renovables. Solo el párrafo, sin título.',
    'Escribe un párrafo de 2 oraciones sobre la importancia de la educación para el desarrollo humano. Solo el párrafo, sin título.',
    'Escribe un párrafo corto de 2 oraciones sobre el cambio climático y sus consecuencias. Solo el párrafo, sin título.',
    'Escribe un párrafo educativo de 2 oraciones sobre biodiversidad y conservación de ecosistemas. Solo el párrafo, sin título.',
]

const API_TIMEOUT_MS = 5000
const BUFFER_MIN = 2       // Refill cuando quedan menos de este número
const BUFFER_MAX = 5       // No acumular más de este número

// ─── Parsing de respuesta ─────────────────────────────────────────────────────
// El API puede devolver: { data: "texto" } o { data: { result: "texto" } }
function extractText(responseBody: unknown): string | null {
    if (!responseBody || typeof responseBody !== 'object') return null
    const body = responseBody as Record<string, unknown>

    // Caso 1: body.data es un string directo
    if (typeof body.data === 'string' && body.data.trim().length > 20) {
        return body.data.trim()
    }

    // Caso 2: body.data es un objeto con .result
    if (body.data && typeof body.data === 'object') {
        const inner = body.data as Record<string, unknown>
        if (typeof inner.result === 'string' && inner.result.trim().length > 20) {
            return inner.result.trim()
        }
    }

    // Caso 3: body.result directamente
    if (typeof body.result === 'string' && body.result.trim().length > 20) {
        return body.result.trim()
    }

    return null
}

function fetchWithTimeout(url: string, ms: number): Promise<Response> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), ms)
    return fetch(url, { signal: controller.signal }).finally(() => clearTimeout(timer))
}

async function fetchFromGPT(prompt: string): Promise<TextItem | null> {
    try {
        const url = `https://api.delirius.store/ia/chatgpt?q=${encodeURIComponent(prompt)}`
        const res = await fetchWithTimeout(url, API_TIMEOUT_MS)
        if (!res.ok) return null
        const json: unknown = await res.json()
        const text = extractText(json)
        if (!text) return null
        return { text, source: 'ai-gpt' }
    } catch {
        return null
    }
}

async function fetchFromGemini(prompt: string): Promise<TextItem | null> {
    try {
        const url = `https://api.delirius.store/ia/gemini?query=${encodeURIComponent(prompt)}`
        const res = await fetchWithTimeout(url, API_TIMEOUT_MS)
        if (!res.ok) return null
        const json: unknown = await res.json()
        const text = extractText(json)
        if (!text) return null
        return { text, source: 'ai-gemini' }
    } catch {
        return null
    }
}

function getLocalFallback(usedIndices: Set<number>): TextItem {
    const available = ODS_SNIPPETS.filter((_, i) => !usedIndices.has(i))
    const pool = available.length > 0 ? available : ODS_SNIPPETS
    const snippet = pool[Math.floor(Math.random() * pool.length)]!
    usedIndices.add(ODS_SNIPPETS.indexOf(snippet))
    if (usedIndices.size >= ODS_SNIPPETS.length) usedIndices.clear()
    return { text: snippet.text, source: 'local', topic: snippet.title }
}

// ─── TextQueue class ──────────────────────────────────────────────────────────

export class TextQueue {
    private queue: TextItem[] = []
    private isFetching = false
    private usedLocalIndices = new Set<number>()
    private promptIndex = 0
    private listeners: Array<() => void> = []

    constructor() {
        // Pre-load 2 local texts for instant start
        this.queue.push(this.nextLocal())
        this.queue.push(this.nextLocal())
    }

    private nextLocal(): TextItem {
        return getLocalFallback(this.usedLocalIndices)
    }

    private nextPrompt(): string {
        const p = AI_PROMPTS[this.promptIndex % AI_PROMPTS.length]!
        this.promptIndex++
        return p
    }

    private notify() {
        this.listeners.forEach((fn) => fn())
    }

    /** Subscribe to queue changes (for React re-renders) */
    subscribe(fn: () => void): () => void {
        this.listeners.push(fn)
        return () => {
            this.listeners = this.listeners.filter((f) => f !== fn)
        }
    }

    get length(): number {
        return this.queue.length
    }

    /** Dequeue next item. Returns a local fallback if empty (should not happen). */
    dequeue(): TextItem {
        const item = this.queue.shift() ?? this.nextLocal()
        this.notify()
        this.maybeRefill()
        return item
    }

    /** Peek at next item without removing. */
    peek(): TextItem | null {
        return this.queue[0] ?? null
    }

    /** Trigger background refill if below minimum. */
    maybeRefill() {
        if (this.isFetching) return
        if (this.queue.length >= BUFFER_MIN) return
        void this.refill()
    }

    private async refill() {
        if (this.isFetching || this.queue.length >= BUFFER_MAX) return
        this.isFetching = true

        const prompt = this.nextPrompt()

        // Try GPT first, then Gemini, then local fallback
        let item = await fetchFromGPT(prompt)
        if (!item) {
            item = await fetchFromGemini(prompt)
        }
        if (!item) {
            item = this.nextLocal()
        }

        this.queue.push(item)
        this.isFetching = false
        this.notify()

        // Keep refilling until we reach BUFFER_MAX
        if (this.queue.length < BUFFER_MAX) {
            void this.refill()
        }
    }
}

// Singleton per-session (recreated when InfiniteModePage mounts)
let _queueInstance: TextQueue | null = null

export function getTextQueue(): TextQueue {
    if (!_queueInstance) _queueInstance = new TextQueue()
    return _queueInstance
}

export function resetTextQueue(): TextQueue {
    _queueInstance = new TextQueue()
    return _queueInstance
}
