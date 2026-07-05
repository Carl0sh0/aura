import { useEffect, useRef, useState } from 'react'
import { ArrowRight, X } from 'lucide-react'
import {
  CALM_EXERCISES,
  type BreathExercise,
  type CalmExercise,
  type StepsExercise,
} from '../lib/exercises'
import { useSettings } from '../lib/settings'
import { useLang } from '../lib/i18n'

// =====================================================================
// Calm space — a full-screen, distraction-free overlay with guided
// breathing (timer-driven animated circle) and 5-4-3-2-1 grounding.
// Entirely static/offline; works before any AI model is downloaded.
// =====================================================================

const CIRCLE_SCALE: Record<string, number> = {
  inhale: 1.45,
  hold: 1.45,
  exhale: 0.85,
  rest: 0.85,
}

function BreathPlayer({ ex, onClose }: { ex: BreathExercise; onClose: () => void }) {
  const { t } = useLang()
  const [settings] = useSettings()
  const [phaseIdx, setPhaseIdx] = useState(-1) // -1 = not started
  const [cycle, setCycle] = useState(0)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [done, setDone] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  const running = phaseIdx >= 0 && !done
  const phase = running ? ex.phases[phaseIdx] : null

  // Advance through phases/cycles on a per-second tick so we can show a countdown.
  useEffect(() => {
    if (!running) return
    if (secondsLeft > 1) {
      timerRef.current = setTimeout(() => setSecondsLeft((s) => s - 1), 1000)
      return () => clearTimeout(timerRef.current)
    }
    timerRef.current = setTimeout(() => {
      const nextPhase = phaseIdx + 1
      if (nextPhase < ex.phases.length) {
        setPhaseIdx(nextPhase)
        setSecondsLeft(ex.phases[nextPhase].seconds)
      } else if (cycle + 1 < ex.cycles) {
        setCycle((c) => c + 1)
        setPhaseIdx(0)
        setSecondsLeft(ex.phases[0].seconds)
      } else {
        setDone(true)
      }
    }, 1000)
    return () => clearTimeout(timerRef.current)
  }, [running, secondsLeft, phaseIdx, cycle, ex])

  function start() {
    setDone(false)
    setCycle(0)
    setPhaseIdx(0)
    setSecondsLeft(ex.phases[0].seconds)
  }

  const scale = phase ? CIRCLE_SCALE[phase.key] ?? 1 : 1
  const transitionSecs = phase ? phase.seconds : 0.6

  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center">
      <div className="relative grid h-64 w-64 place-items-center">
        {/* Soft halo rings */}
        <div className="absolute inset-0 rounded-full bg-sage/10" />
        <div className="absolute inset-6 rounded-full bg-sage/10" />
        {/* Breathing circle */}
        <div
          className="grid h-36 w-36 place-items-center rounded-full bg-gradient-to-br from-sage to-sagedeep shadow-lg shadow-sage/30"
          style={
            settings.reduceMotion
              ? undefined
              : {
                  transform: `scale(${running ? scale : 1})`,
                  transition: `transform ${transitionSecs}s cubic-bezier(0.45, 0, 0.55, 1)`,
                }
          }
        >
          {running && <span className="font-display text-4xl text-white/90">{secondsLeft}</span>}
          {!running && !done && <span className="text-4xl">{ex.glyph}</span>}
          {done && <span className="text-4xl">✨</span>}
        </div>
      </div>

      <p className="mt-8 h-9 font-display text-2xl text-ink">
        {done ? t('calm.done') : phase ? t(`calm.phase.${phase.key}`) : t(ex.nameKey)}
      </p>
      <p className="mt-1 h-5 text-sm text-muted">
        {running
          ? t('calm.cycle', { n: cycle + 1, total: ex.cycles })
          : done
            ? t('calm.doneSub')
            : t(ex.descKey)}
      </p>

      {!running && (
        <button
          onClick={done ? onClose : start}
          className="mt-8 rounded-full bg-clay px-8 py-3 text-sm font-medium text-white transition hover:opacity-90"
        >
          {done ? t('calm.finish') : t('calm.start')}
        </button>
      )}
    </div>
  )
}

function StepsPlayer({ ex, onClose }: { ex: StepsExercise; onClose: () => void }) {
  const { t } = useLang()
  const [step, setStep] = useState(-1)
  const done = step >= ex.stepKeys.length

  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center">
      <div className="grid h-24 w-24 place-items-center rounded-full bg-sage/15 text-4xl">
        {done ? '✨' : ex.glyph}
      </div>

      {step === -1 ? (
        <>
          <p className="mt-8 font-display text-2xl text-ink">{t(ex.nameKey)}</p>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted">{t(ex.descKey)}</p>
        </>
      ) : done ? (
        <>
          <p className="mt-8 font-display text-2xl text-ink">{t('calm.done')}</p>
          <p className="mt-1 text-sm text-muted">{t('calm.doneSub')}</p>
        </>
      ) : (
        <>
          <p className="mt-8 text-xs font-medium uppercase tracking-wide text-sage">
            {step + 1} / {ex.stepKeys.length}
          </p>
          <p className="mx-auto mt-2 max-w-sm animate-rise font-display text-2xl leading-snug text-ink">
            {t(ex.stepKeys[step])}
          </p>
        </>
      )}

      <button
        onClick={() => (done ? onClose() : setStep((s) => s + 1))}
        className="mt-8 inline-flex items-center gap-2 rounded-full bg-clay px-8 py-3 text-sm font-medium text-white transition hover:opacity-90"
      >
        {step === -1 ? t('calm.start') : done ? t('calm.finish') : t('calm.next')}
        {!done && step >= 0 && <ArrowRight size={15} />}
      </button>
    </div>
  )
}

export default function CalmSpace() {
  const { t } = useLang()
  const [active, setActive] = useState<CalmExercise | null>(null)

  // Esc exits the current exercise back to the list.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setActive(null)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="mx-auto flex min-h-full max-w-2xl flex-col">
      <header className="mb-4 flex items-start justify-between">
        <div>
          <h1 className="font-display text-3xl text-ink">{t('calm.title')}</h1>
          <p className="text-sm text-muted">{t('calm.card.desc')}</p>
        </div>
        {active && (
          <button
            onClick={() => setActive(null)}
            className="grid h-10 w-10 place-items-center rounded-full text-muted transition hover:bg-white/70 hover:text-ink"
            aria-label={t('calm.close')}
          >
            <X size={20} />
          </button>
        )}
      </header>

      {active ? (
        <div className="card flex flex-1 flex-col p-6" style={{ minHeight: '60vh' }}>
          {active.kind === 'breath' ? (
            <BreathPlayer ex={active} onClose={() => setActive(null)} />
          ) : (
            <StepsPlayer ex={active} onClose={() => setActive(null)} />
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="mb-1 text-sm text-muted">{t('calm.pick')}</p>
          {CALM_EXERCISES.map((ex) => (
            <button
              key={ex.id}
              onClick={() => setActive(ex)}
              className="card group flex items-center gap-4 p-5 text-left transition hover:border-sage/40 animate-rise"
            >
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-sage/15 text-2xl">
                {ex.glyph}
              </div>
              <div className="flex-1">
                <p className="font-display text-lg text-ink">{t(ex.nameKey)}</p>
                <p className="text-sm text-muted">{t(ex.descKey)}</p>
              </div>
              <ArrowRight size={16} className="text-clay opacity-0 transition group-hover:opacity-100" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
