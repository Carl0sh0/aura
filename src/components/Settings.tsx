import { useEffect, useState } from 'react'
import {
  AlertTriangle,
  Check,
  Cloud,
  Cpu,
  Download,
  Globe,
  Loader2,
  Mic,
  ShieldCheck,
  Trash2,
  Volume2,
  Waypoints,
  Wind,
} from 'lucide-react'
import { clearAllData, useSettings, type Settings as SettingsType } from '../lib/settings'
import { speechSupported } from '../lib/speech'
import { useName } from '../lib/store'
import { LANG_LABELS, SUPPORTED_LANGS, useLang } from '../lib/i18n'
import {
  CHARACTER_PACKS,
  DEFAULT_PACK_ID,
  type CharacterPack,
  type PackId,
} from '../lib/characterPacks'
import {
  ensureLocalEngine,
  isModelDownloaded,
  removeDownloadedModel,
  switchActiveLocalModel,
  useLocalEngineState,
  webgpuSupported,
} from '../lib/localEngine'

const PACK_LIST = Object.values(CHARACTER_PACKS)

function Toggle({
  on,
  onChange,
  disabled,
}: {
  on: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={`relative h-7 w-12 shrink-0 rounded-full transition ${
        on ? 'bg-sage' : 'bg-ink/15'
      } ${disabled ? 'opacity-40' : ''}`}
    >
      <span
        className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${
          on ? 'left-6' : 'left-1'
        }`}
      />
    </button>
  )
}

function Row({
  icon,
  title,
  desc,
  children,
}: {
  icon: React.ReactNode
  title: string
  desc: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-4 py-4">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-sage/15 text-sagedeep">
        {icon}
      </div>
      <div className="flex-1">
        <p className="font-medium text-ink">{title}</p>
        <p className="text-sm text-muted">{desc}</p>
      </div>
      {children}
    </div>
  )
}

function EngineCard({
  active,
  disabled,
  icon,
  title,
  desc,
  onClick,
}: {
  active: boolean
  disabled?: boolean
  icon: React.ReactNode
  title: string
  desc: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex-1 rounded-2xl border p-4 text-left transition ${
        active
          ? 'border-sage bg-sage/10'
          : 'border-ink/10 bg-white/50 hover:border-sage/40'
      } ${disabled ? 'cursor-not-allowed opacity-40' : ''}`}
    >
      <div className="mb-2 flex items-center gap-2">
        <span className={active ? 'text-sagedeep' : 'text-muted'}>{icon}</span>
        <span className="font-medium text-ink">{title}</span>
      </div>
      <p className="text-xs leading-relaxed text-muted">{desc}</p>
    </button>
  )
}

function PackCard({
  pack,
  active,
  showModelInfo,
  downloaded,
  onSelect,
  onRemoveDownload,
}: {
  pack: CharacterPack
  active: boolean
  showModelInfo: boolean
  downloaded: boolean
  onSelect: () => void
  onRemoveDownload: () => void
}) {
  const { t } = useLang()
  const engineState = useLocalEngineState(pack.localModelId)

  return (
    <div
      className={`rounded-2xl border p-4 transition ${
        active ? 'border-sage bg-sage/10' : 'border-ink/10 bg-white/50'
      }`}
    >
      <button type="button" onClick={onSelect} className="w-full text-left">
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium text-ink">{t(pack.nameKey)}</span>
          {active && <Check size={16} className="shrink-0 text-sagedeep" />}
        </div>
        <p className="mt-1 text-xs leading-relaxed text-muted">{t(pack.taglineKey)}</p>
        {showModelInfo && (
          <p className="mt-1 text-[11px] text-muted/80">
            {pack.localModelLabel} — ~{pack.vramHintGB}GB
          </p>
        )}
      </button>

      {showModelInfo && (
        <div className="mt-3">
          {engineState.status === 'loading' && (
            <div>
              <div className="flex items-center gap-2 text-xs text-ink/80">
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
          {engineState.status === 'error' && (
            <p className="flex items-start gap-1.5 text-xs text-clay">
              <AlertTriangle size={13} className="mt-0.5 shrink-0" />
              {t('settings.engine.errorPrefix')}
              {engineState.error || 'unknown error'}
            </p>
          )}
          {engineState.status !== 'loading' && (
            <div className="flex items-center gap-3 text-xs">
              {downloaded ? (
                <>
                  <span className="inline-flex items-center gap-1 text-sagedeep">
                    <Check size={13} /> {t('settings.packs.downloaded')}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onRemoveDownload()
                    }}
                    className="inline-flex items-center gap-1 text-muted hover:text-clay"
                  >
                    <Trash2 size={12} /> {t('settings.packs.removeDownload')}
                  </button>
                </>
              ) : (
                <span className="inline-flex items-center gap-1 text-muted">
                  <Download size={12} /> {t('settings.packs.download')}
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function Settings() {
  const [settings, setSettings] = useSettings()
  const [name, setName] = useName()
  const { t, lang, setLang } = useLang()
  const voiceOk = speechSupported()
  const ttsOk = typeof window !== 'undefined' && 'speechSynthesis' in window
  const gpuOk = webgpuSupported()
  const lowMemory =
    typeof navigator !== 'undefined' && (navigator as any).deviceMemory < 4
  const [downloaded, setDownloaded] = useState<Record<PackId, boolean>>({
    calm: false,
    grounded: false,
    reflective: false,
  })

  useEffect(() => {
    let cancelled = false
    Promise.all(PACK_LIST.map((p) => isModelDownloaded(p.localModelId))).then((results) => {
      if (cancelled) return
      setDownloaded(
        Object.fromEntries(PACK_LIST.map((p, i) => [p.id, results[i]])) as Record<PackId, boolean>,
      )
    })
    return () => {
      cancelled = true
    }
  }, [])

  const set = (patch: Partial<SettingsType>) => setSettings((s) => ({ ...s, ...patch }))
  const activePack = CHARACTER_PACKS[settings.activePackId] ?? CHARACTER_PACKS[DEFAULT_PACK_ID]

  function chooseEngine(engine: SettingsType['aiEngine']) {
    set({ aiEngine: engine })
    if (engine === 'local') ensureLocalEngine(activePack.localModelId).catch(() => {})
  }

  function choosePack(pack: CharacterPack) {
    const previous = activePack
    set({ activePackId: pack.id })
    if (settings.aiEngine === 'local') {
      switchActiveLocalModel(pack.localModelId, previous.localModelId).catch(() => {})
    }
  }

  async function handleRemoveDownload(pack: CharacterPack) {
    await removeDownloadedModel(pack.localModelId)
    setDownloaded((d) => ({ ...d, [pack.id]: false }))
  }

  return (
    <div className="mx-auto max-w-2xl">
      <header className="mb-4">
        <h1 className="font-display text-3xl text-ink">{t('settings.title')}</h1>
        <p className="text-sm text-muted">{t('settings.subtitle')}</p>
      </header>

      {/* Name */}
      <div className="card p-5">
        <label className="text-sm font-medium text-ink">{t('settings.name.label')}</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('settings.name.placeholder')}
          className="mt-2 w-full rounded-2xl border border-ink/10 bg-white/60 px-4 py-3 text-ink outline-none transition focus:border-sage/50"
        />
      </div>

      {/* Language */}
      <div className="card mt-4 p-5">
        <div className="mb-3 flex items-center gap-2">
          <Globe size={18} className="text-sagedeep" />
          <p className="font-medium text-ink">{t('settings.language.title')}</p>
        </div>
        <p className="mb-3 text-sm text-muted">{t('settings.language.desc')}</p>
        <div className="flex flex-wrap gap-2">
          {SUPPORTED_LANGS.map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                lang === l
                  ? 'border-sage bg-sage/15 text-sagedeep'
                  : 'border-ink/10 bg-white/50 text-muted hover:border-sage/40'
              }`}
            >
              {LANG_LABELS[l]}
            </button>
          ))}
        </div>
      </div>

      {/* AI Engine */}
      <div className="card mt-4 p-5">
        <p className="font-medium text-ink">{t('settings.engine.title')}</p>
        <p className="mb-3 text-sm text-muted">{t('settings.engine.desc')}</p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <EngineCard
            active={settings.aiEngine === 'cloud'}
            icon={<Cloud size={18} />}
            title={t('settings.engine.cloud.title')}
            desc={t('settings.engine.cloud.desc')}
            onClick={() => chooseEngine('cloud')}
          />
          <EngineCard
            active={settings.aiEngine === 'local'}
            disabled={!gpuOk}
            icon={<Cpu size={18} />}
            title={t('settings.engine.local.title')}
            desc={
              gpuOk
                ? `${activePack.localModelLabel} — ~${activePack.vramHintGB}GB.`
                : t('settings.engine.local.desc.unsupported')
            }
            onClick={() => chooseEngine('local')}
          />
        </div>

        {settings.aiEngine === 'local' && !gpuOk && (
          <p className="mt-3 flex items-start gap-2 text-xs text-clay">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            {t('settings.engine.local.desc.unsupported')}
          </p>
        )}

        {lowMemory && (
          <p className="mt-3 flex items-start gap-2 text-xs text-muted">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            {t('settings.packs.hardwareWarning')}
          </p>
        )}
      </div>

      {/* Companion picker — applies to both cloud and local engines */}
      <div className="card mt-4 p-5">
        <p className="font-medium text-ink">{t('settings.packs.title')}</p>
        <p className="mb-3 text-sm text-muted">{t('settings.packs.desc')}</p>
        <div className="grid gap-3 sm:grid-cols-3">
          {PACK_LIST.map((pack) => (
            <PackCard
              key={pack.id}
              pack={pack}
              active={settings.activePackId === pack.id}
              showModelInfo={settings.aiEngine === 'local' && gpuOk}
              downloaded={downloaded[pack.id]}
              onSelect={() => choosePack(pack)}
              onRemoveDownload={() => handleRemoveDownload(pack)}
            />
          ))}
        </div>
      </div>

      {/* Feature toggles */}
      <div className="card mt-4 divide-y divide-ink/8 px-5">
        <Row
          icon={<Mic size={18} />}
          title={t('settings.toggle.voice.title')}
          desc={voiceOk ? t('settings.toggle.voice.desc.ok') : t('settings.toggle.voice.desc.unsupported')}
        >
          <Toggle
            on={settings.voiceInput && voiceOk}
            disabled={!voiceOk}
            onChange={(v) => set({ voiceInput: v })}
          />
        </Row>

        <Row
          icon={<Volume2 size={18} />}
          title={t('settings.toggle.tts.title')}
          desc={ttsOk ? t('settings.toggle.tts.desc.ok') : t('settings.toggle.tts.desc.unsupported')}
        >
          <Toggle
            on={settings.readAloud && ttsOk}
            disabled={!ttsOk}
            onChange={(v) => set({ readAloud: v })}
          />
        </Row>

        <Row
          icon={<Waypoints size={18} />}
          title={t('settings.toggle.autoRead.title')}
          desc={t('settings.toggle.autoRead.desc')}
        >
          <Toggle
            on={settings.autoRead && settings.readAloud}
            disabled={!settings.readAloud || !ttsOk}
            onChange={(v) => set({ autoRead: v })}
          />
        </Row>

        <Row
          icon={<Wind size={18} />}
          title={t('settings.toggle.reduceMotion.title')}
          desc={t('settings.toggle.reduceMotion.desc')}
        >
          <Toggle on={settings.reduceMotion} onChange={(v) => set({ reduceMotion: v })} />
        </Row>
      </div>

      {/* Privacy */}
      <div className="card mt-4 flex items-start gap-3 p-5">
        <ShieldCheck size={20} className="mt-0.5 shrink-0 text-sage" />
        <p className="text-sm leading-relaxed text-muted">{t('settings.privacy')}</p>
      </div>

      {/* Danger zone */}
      <div className="card mt-4 flex items-center justify-between p-5">
        <div>
          <p className="font-medium text-ink">{t('settings.danger.title')}</p>
          <p className="text-sm text-muted">{t('settings.danger.desc')}</p>
        </div>
        <button
          onClick={() => {
            if (confirm(t('settings.danger.confirm'))) {
              clearAllData()
            }
          }}
          className="inline-flex items-center gap-2 rounded-full border border-clay/40 px-4 py-2 text-sm font-medium text-clay transition hover:bg-clay/10"
        >
          <Trash2 size={15} /> {t('settings.danger.erase')}
        </button>
      </div>
    </div>
  )
}
