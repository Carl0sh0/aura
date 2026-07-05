import { useEffect, useState } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { CHARACTER_PACKS, DEFAULT_PACK_ID } from '../lib/characterPacks'
import { useSettings, type Settings as SettingsType } from '../lib/settings'
import { switchActiveLocalModel, useLocalEngineState, webgpuSupported } from '../lib/localEngine'
import { useLang } from '../lib/i18n'
import { PackCard } from './Settings'

const PACK_LIST = Object.values(CHARACTER_PACKS)
const SPLASH_MS = 4500

// First-run flow: a short branded splash → pick a companion (confirmed with
// Continue) → a dedicated download screen with live progress. Everything Aura
// does depends on the chosen on-device model, so this runs before the name step.
export default function CompanionOnboarding({ onDone }: { onDone: () => void }) {
  const { t } = useLang()
  const [settings, setSettings] = useSettings()
  const [step, setStep] = useState<'splash' | 'pick' | 'download'>('splash')
  const gpuOk = webgpuSupported()
  const activePack = CHARACTER_PACKS[settings.activePackId] ?? CHARACTER_PACKS[DEFAULT_PACK_ID]
  const engineState = useLocalEngineState(activePack.localModelId)

  const set = (patch: Partial<SettingsType>) => setSettings((s) => ({ ...s, ...patch }))

  // Timed intro: auto-advance after a few seconds (tap anywhere to skip).
  useEffect(() => {
    if (step !== 'splash') return
    const id = setTimeout(() => setStep('pick'), SPLASH_MS)
    return () => clearTimeout(id)
  }, [step])
  // Download finished → into the app.
  useEffect(() => {
    if (step === 'download' && engineState.status === 'ready') onDone()
  }, [step, engineState.status, onDone])

  function handleContinue() {
    if (!gpuOk) {
      onDone()
      return
    }
    setStep('download')
    switchActiveLocalModel(activePack.localModelId).catch(() => {})
  }

  if (step === 'splash') {
    return (
      <button
        type="button"
        onClick={() => setStep('pick')}
        className="grid min-h-screen w-full cursor-default place-items-center bg-cream"
        aria-label="Aura"
      >
        <div className="text-center animate-rise">
          <img src="/logo-mark.svg" alt="" className="mx-auto h-24 w-24 animate-breathe" />
          <h1 className="mt-6 font-display text-5xl text-ink">Aura</h1>
          <p className="mt-2 text-sm text-muted">{t('welcome.splash.tagline')}</p>
        </div>
      </button>
    )
  }

  if (step === 'download') {
    return (
      <div className="grid min-h-screen place-items-center p-6">
        <div className="card w-full max-w-md p-8 text-center animate-rise">
          <div className="mx-auto mb-5 grid h-20 w-20 place-items-center rounded-full bg-sage/25 text-4xl animate-breathe">
            {activePack.glyph}
          </div>
          <h1 className="font-display text-2xl text-ink">
            {t('welcome.downloading.title', { pack: t(activePack.nameKey) })}
          </h1>
          <p className="mt-2 text-sm text-muted">{t('welcome.downloading.sub')}</p>

          {engineState.status === 'error' ? (
            <div className="mt-6">
              <p className="flex items-start justify-center gap-2 text-sm text-clay">
                <AlertTriangle size={15} className="mt-0.5 shrink-0" />
                {t('settings.engine.errorPrefix')}
                {engineState.error || 'unknown error'}
              </p>
              <button
                onClick={() => switchActiveLocalModel(activePack.localModelId).catch(() => {})}
                className="mx-auto mt-4 inline-flex items-center gap-2 rounded-full bg-clay px-6 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
              >
                <RefreshCw size={14} /> {t('welcome.downloading.retry')}
              </button>
            </div>
          ) : (
            <div className="mt-6">
              <div className="h-2.5 overflow-hidden rounded-full bg-ink/10">
                <div
                  className="h-full rounded-full bg-sage transition-all"
                  style={{ width: `${Math.round(engineState.progress * 100)}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-muted">
                {Math.round(engineState.progress * 100)}% — {engineState.text || '…'}
              </p>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="grid min-h-screen place-items-center p-6">
      <div className="card w-full max-w-lg p-8 text-center animate-rise">
        <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-sage/25 text-3xl animate-breathe">
          {activePack.glyph}
        </div>
        <h1 className="font-display text-3xl text-ink">{t('welcome.companion.title')}</h1>
        <p className="mt-2 text-sm text-muted">{t('welcome.companion.desc')}</p>

        {!gpuOk && (
          <p className="mt-4 flex items-start gap-2 rounded-2xl bg-clay/10 p-3 text-left text-xs text-clay">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            {t('settings.packs.gpuRequired')}
          </p>
        )}

        <div className="mt-5 grid gap-3 text-left sm:grid-cols-3">
          {PACK_LIST.map((pack) => (
            <PackCard
              key={pack.id}
              pack={pack}
              active={settings.activePackId === pack.id}
              onSelect={() => set({ activePackId: pack.id })}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={handleContinue}
          className="mt-6 w-full rounded-full bg-clay py-3 text-sm font-medium text-white transition hover:opacity-90"
        >
          {t('welcome.companion.continue')}
        </button>
      </div>
    </div>
  )
}
