import { describe, expect, it } from 'vitest'
import {
  applyBackspace,
  applyCharacter,
  type TypingEngineState,
} from './typingEngine'
import { initCharStates } from '../utils/textGenerator'

function engineState(text: string): TypingEngineState {
  return {
    chars: initCharStates(text),
    cursorIndex: 0,
    errors: 0,
  }
}

function typeString(state: TypingEngineState, input: string): TypingEngineState {
  let current = state
  for (const ch of input) {
    const result = applyCharacter(current, ch)
    if (!result) throw new Error(`Failed to type "${ch}"`)
    current = result.state
  }
  return current
}

describe('applyCharacter', () => {
  it('marks matching characters as correct and advances cursor', () => {
    const result = applyCharacter(engineState('hello'), 'h')
    expect(result?.state.chars[0]?.status).toBe('correct')
    expect(result?.state.cursorIndex).toBe(1)
  })

  it('marks mismatches as incorrect and still advances cursor', () => {
    const state = typeString(engineState('hello'), 'hel')
    const result = applyCharacter(state, 'x')
    expect(result?.state.chars[3]?.status).toBe('incorrect')
    expect(result?.state.cursorIndex).toBe(4)
    expect(result?.state.errors).toBe(1)
  })
})

describe('applyBackspace', () => {
  it('reverts an incorrect character to pending without touching prior correct chars', () => {
    let state = typeString(engineState('hello'), 'hel')
    const mistake = applyCharacter(state, 'x')!
    state = mistake.state

    expect(state.chars[0]?.status).toBe('correct')
    expect(state.chars[1]?.status).toBe('correct')
    expect(state.chars[2]?.status).toBe('correct')
    expect(state.chars[3]?.status).toBe('incorrect')

    const afterBackspace = applyBackspace(state)
    expect(afterBackspace.chars[3]?.status).toBe('pending')
    expect(afterBackspace.cursorIndex).toBe(3)
    expect(afterBackspace.errors).toBe(0)

    expect(afterBackspace.chars[0]?.status).toBe('correct')
    expect(afterBackspace.chars[1]?.status).toBe('correct')
    expect(afterBackspace.chars[2]?.status).toBe('correct')
  })

  it('does not allow backspace over confirmed correct characters', () => {
    let state = typeString(engineState('hello'), 'hel')
    const mistake = applyCharacter(state, 'x')!
    state = applyBackspace(mistake.state)

    const blocked = applyBackspace(state)
    expect(blocked.chars[2]?.status).toBe('correct')
    expect(blocked.cursorIndex).toBe(3)
  })
})

describe('correct → mistake → backspace → correct (reported bug)', () => {
  it('keeps all prior correct characters green after fixing a mistake', () => {
    const text = 'hello world'
    let state = typeString(engineState(text), 'hello')

    const mistake = applyCharacter(state, 'x')!
    state = mistake.state
    expect(state.chars[5]?.status).toBe('incorrect')

    state = applyBackspace(state)
    expect(state.chars[4]?.status).toBe('correct')
    expect(state.chars[5]?.status).toBe('pending')

    const fixed = applyCharacter(state, ' ')!
    state = fixed.state

    expect(state.chars[0]?.status).toBe('correct')
    expect(state.chars[1]?.status).toBe('correct')
    expect(state.chars[2]?.status).toBe('correct')
    expect(state.chars[3]?.status).toBe('correct')
    expect(state.chars[4]?.status).toBe('correct')
    expect(state.chars[5]?.status).toBe('correct')
    expect(state.cursorIndex).toBe(6)
  })

  it('preserves correct char before first mistake after full correction flow', () => {
    const text = 'test word'
    let state = typeString(engineState(text), 'test')

    state = applyCharacter(state, 'x')!.state
    const charBeforeMistake = 3
    expect(state.chars[charBeforeMistake]?.status).toBe('correct')

    state = applyBackspace(state)
    const correction = applyCharacter(state, ' ')!
    state = correction.state

    expect(state.chars[charBeforeMistake]?.status).toBe('correct')
    expect(state.chars[4]?.status).toBe('correct')
    expect(state.chars[charBeforeMistake]?.char).toBe('t')
  })
})
