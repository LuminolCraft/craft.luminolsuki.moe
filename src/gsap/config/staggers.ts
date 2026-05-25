import { DURATIONS } from './durations'

export const STAGGERS = {
  cards: {
    each: 0.1,
    from: 'start' as const,
  },
  list: {
    each: 0.08,
    from: 'start' as const,
  },
  grid: {
    each: 0.06,
    from: 'center' as const,
    grid: 'auto' as const,
  },
  rules: {
    each: 0.12,
    from: 'start' as const,
  },
  characters: {
    each: DURATIONS.charStagger,
    from: 'random' as const,
  },
  words: {
    each: DURATIONS.wordStagger,
    from: 'start' as const,
  },
} as const
