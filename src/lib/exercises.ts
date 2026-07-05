// =====================================================================
// Guided calm exercises — breathing patterns and grounding, fully static
// data driven by timers in the UI. No AI involved: these work instantly,
// offline, before any model is downloaded, and never touch the network.
// =====================================================================

export type BreathPhase = {
  /** i18n key suffix: calm.phase.<key> */
  key: 'inhale' | 'hold' | 'exhale' | 'rest'
  seconds: number
}

export type BreathExercise = {
  id: string
  kind: 'breath'
  nameKey: string
  descKey: string
  glyph: string
  phases: BreathPhase[]
  cycles: number
}

export type StepsExercise = {
  id: string
  kind: 'steps'
  nameKey: string
  descKey: string
  glyph: string
  /** i18n keys, one per step, advanced manually by the user. */
  stepKeys: string[]
}

export type CalmExercise = BreathExercise | StepsExercise

export const CALM_EXERCISES: CalmExercise[] = [
  {
    id: 'box',
    kind: 'breath',
    nameKey: 'calm.ex.box.name',
    descKey: 'calm.ex.box.desc',
    glyph: '🌬️',
    phases: [
      { key: 'inhale', seconds: 4 },
      { key: 'hold', seconds: 4 },
      { key: 'exhale', seconds: 4 },
      { key: 'rest', seconds: 4 },
    ],
    cycles: 4,
  },
  {
    id: '478',
    kind: 'breath',
    nameKey: 'calm.ex.478.name',
    descKey: 'calm.ex.478.desc',
    glyph: '🌙',
    phases: [
      { key: 'inhale', seconds: 4 },
      { key: 'hold', seconds: 7 },
      { key: 'exhale', seconds: 8 },
    ],
    cycles: 4,
  },
  {
    id: 'sigh',
    kind: 'breath',
    nameKey: 'calm.ex.sigh.name',
    descKey: 'calm.ex.sigh.desc',
    glyph: '🍃',
    phases: [
      { key: 'inhale', seconds: 2 },
      { key: 'inhale', seconds: 1 },
      { key: 'exhale', seconds: 6 },
    ],
    cycles: 5,
  },
  {
    id: 'ground',
    kind: 'steps',
    nameKey: 'calm.ex.ground.name',
    descKey: 'calm.ex.ground.desc',
    glyph: '🪨',
    stepKeys: ['calm.ground.1', 'calm.ground.2', 'calm.ground.3', 'calm.ground.4', 'calm.ground.5'],
  },
]
