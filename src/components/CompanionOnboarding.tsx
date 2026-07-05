import { AlertTriangle, Loader2 } from 'lucide-react'
import { CHARACTER_PACKS, DEFAULT_PACK_ID, type CharacterPack } from '../lib/characterPacks'
import { useSettings, type Settings as SettingsType } from '../lib/settings'
import { switchActiveLocalModel, useLocalEngineState, webgpuSupported } from '../lib/localEngine'
import { useLang } from '../lib/i18n'
import { PackCard } from './Settings'

const PACK_LIST = Object.values(CHARACTER_PACKS)

// Everything Aura does depends on which on-device companion is active, so this runs
// before anything else — including the name step — rather than being buried in Settings.
export default function CompanionOnboarding({ onDone }: { onDone: () => void }) {
  const { t } = useLang()
  const [settings, setSettings] = useSettings()
  const gpuOk = webgpuSupported()
  const activePack = CHARACTER_PACKS[settings.activePackId] ?? CHARACTER_PACKS[DEFAULT_PACK_ID]
  const engineState = useLocalEngineState(activePack.localModelId)

  const set = (patch: Partial<SettingsType>) => setSettings((s) => ({ ...s, ...patch }))

  function choosePack(pack: CharacterPack) {
    const previous = activePack
    set({ activePackId: pack.id })
    if (gpuOk) switchActiveLocalModel(pack.localModelId, previous.localModelId).catch(() => {})
  }

  function handleContinue() {
    // Kick off the download if the user never tapped a card (default pack, untouched).
    if (gpuOk && engineState.status === 'idle') {
      switchActiveLocalModel(activePack.localModelId).catch(() => {})
    }
    set({ hasChosenCompanion: true })
    onDone()
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
              onSelect={() => choosePack(pack)}
            />
          ))}
        </div>

        {gpuOk && engineState.status === 'loading' && (
          <div className="mt-4">
            <div className="flex items-center justify-center gap-2 text-xs text-ink/70">
              <Loader2 size={13} className="animate-spin text-sage" />
              {engineState.text || t('settings.engine.loadingDefault')}
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink/10">
              <div
                className="h-full rounded-full bg-sage transition-all"
                style={{ width: `${Math.round(engineState.progress * 100)}%` }}
              />
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={handleContinue}
          className="mt-6 w-full rounded-full bg-clay py-3 text-sm font-medium text-white transition hover:opacity-90"
        >
          {t('welcome.companion.continue')}
        </button>
        <p className="mt-2 text-xs text-muted">{t('welcome.companion.hint')}</p>
      </div>
    </div>
  )
}
