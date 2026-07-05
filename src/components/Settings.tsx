import { useEffect, useState } from 'react'
import {
  AlertTriangle,
  Check,
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
import { clearAllData, exportAllData, useSettings, type Settings as SettingsType } from '../lib/settings'
import { speechSupported } from '../lib/speech'
import { useName } from '../lib/store'
import { emailCaptureAvailable, googleSignInAvailable, subscribeEmail, useProfile } from '../lib/auth'
import GoogleSignInButton from './GoogleSignInButton'
import { LANG_LABELS, SUPPORTED_LANGS, useLang } from '../lib/i18n'
import { CHARACTER_PACKS, DEFAULT_PACK_ID, type CharacterPack } from '../lib/characterPacks'
import {
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

export function PackCard({
  pack,
  active,
  onSelect,
}: {
  pack: CharacterPack
  active: boolean
  onSelect: () => void
}) {
  const { t } = useLang()
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`rounded-2xl border p-4 text-left transition ${
        active ? 'border-sage bg-sage/10' : 'border-ink/10 bg-white/50 hover:border-sage/40'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 font-medium text-ink">
          <span className="text-lg">{pack.glyph}</span> {t(pack.nameKey)}
        </span>
        {active && <Check size={16} className="shrink-0 text-sagedeep" />}
      </div>
      <p className="mt-1 text-xs leading-relaxed text-muted">{t(pack.taglineKey)}</p>
      <p className="mt-1 text-[11px] text-muted/80">
        {pack.localModelLabel} — ~{pack.vramHintGB}GB
      </p>
    </button>
  )
}

function AccountCard() {
  const { t } = useLang()
  const { profile, signOut } = useProfile()
  const [name, setName] = useName()
  const [email, setEmail] = useState('')
  const [subscribed, setSubscribed] = useState(false)
  const [subscribeError, setSubscribeError] = useState(false)

  async function handleSubscribe(addr: string) {
    setSubscribeError(false)
    const ok = await subscribeEmail(addr.trim())
    if (ok) setSubscribed(true)
    else setSubscribeError(true)
  }

  // Nothing configured — render nothing rather than a broken card.
  if (!googleSignInAvailable() && !emailCaptureAvailable()) return null

  return (
    <div className="card mt-4 p-5">
      <p className="font-medium text-ink">{t('settings.account.title')}</p>
      <p className="mb-3 text-sm text-muted">{t('settings.account.desc')}</p>

      {googleSignInAvailable() &&
        (profile ? (
          <div className="flex items-center gap-3">
            {profile.picture && (
              <img src={profile.picture} alt="" className="h-10 w-10 rounded-full" />
            )}
            <div className="flex-1">
              <p className="text-sm font-medium text-ink">{profile.name}</p>
              <p className="text-xs text-muted">{profile.email}</p>
            </div>
            <button
              onClick={signOut}
              className="rounded-full border border-ink/10 px-4 py-2 text-xs font-medium text-muted transition hover:border-clay/40 hover:text-clay"
            >
              {t('settings.account.signOut')}
            </button>
          </div>
        ) : (
          <GoogleSignInButton onSignedIn={(p) => !name && p.name && setName(p.name.split(' ')[0])} />
        ))}

      {emailCaptureAvailable() && (
        <div className="mt-4 border-t border-ink/8 pt-4">
          {subscribed ? (
            <p className="text-sm text-sagedeep">✓ {t('settings.account.subscribed')}</p>
          ) : (
            <>
              <p className="mb-2 text-sm text-ink/85">{t('settings.account.updates')}</p>
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  const addr = email || profile?.email || ''
                  if (addr.trim()) handleSubscribe(addr)
                }}
                className="flex gap-2"
              >
                <input
                  type="email"
                  value={email || profile?.email || ''}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('settings.account.emailPlaceholder')}
                  className="flex-1 rounded-full border border-ink/10 bg-white/60 px-4 py-2 text-sm text-ink outline-none transition focus:border-sage/50"
                />
                <button
                  type="submit"
                  className="rounded-full bg-sage px-4 py-2 text-xs font-medium text-white transition hover:opacity-90"
                >
                  {t('settings.account.subscribe')}
                </button>
              </form>
              {subscribeError && (
                <p className="mt-2 text-xs text-clay">{t('settings.account.subscribeError')}</p>
              )}
              <p className="mt-2 text-[11px] leading-relaxed text-muted/80">
                {t('settings.account.privacyNote')}
              </p>
            </>
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
  const lowMemory = typeof navigator !== 'undefined' && (navigator as any).deviceMemory < 4

  const activePack = CHARACTER_PACKS[settings.activePackId] ?? CHARACTER_PACKS[DEFAULT_PACK_ID]
  const engineState = useLocalEngineState(activePack.localModelId)
  const [downloaded, setDownloaded] = useState(false)

  // Track which model (if any) is currently loaded in GPU memory, across all packs, so we
  // know what to unload when the user switches companions. Fixed set of hooks — safe.
  const loadedStates = PACK_LIST.map((p) => useLocalEngineState(p.localModelId))
  const previousLoadedModelId = PACK_LIST.find(
    (p, i) => p.id !== activePack.id && loadedStates[i].status === 'ready',
  )?.localModelId

  useEffect(() => {
    let cancelled = false
    isModelDownloaded(activePack.localModelId).then((ok) => {
      if (!cancelled) setDownloaded(ok)
    })
    return () => {
      cancelled = true
    }
  }, [activePack.localModelId])

  // Already-downloaded companions load straight from the on-device cache — no need to make
  // the user tap "Download" again just to switch back to a model they already have.
  useEffect(() => {
    if (gpuOk && downloaded && engineState.status === 'idle') {
      switchActiveLocalModel(activePack.localModelId, previousLoadedModelId).catch(() => {})
    }
  }, [gpuOk, downloaded, engineState.status, activePack.localModelId, previousLoadedModelId])

  const set = (patch: Partial<SettingsType>) => setSettings((s) => ({ ...s, ...patch }))

  function choosePack(pack: CharacterPack) {
    set({ activePackId: pack.id })
  }

  function handleDownload() {
    switchActiveLocalModel(activePack.localModelId, previousLoadedModelId).catch(() => {})
  }

  async function handleRemoveDownload() {
    await removeDownloadedModel(activePack.localModelId)
    setDownloaded(false)
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

      {!gpuOk && (
        <div className="card mt-4 flex items-start gap-3 border-clay/30 p-5">
          <AlertTriangle size={20} className="mt-0.5 shrink-0 text-clay" />
          <p className="text-sm leading-relaxed text-clay">{t('settings.packs.gpuRequired')}</p>
        </div>
      )}

      {/* Companion picker */}
      <div className="card mt-4 p-5">
        <p className="font-medium text-ink">{t('settings.packs.title')}</p>
        <p className="mb-3 text-sm text-muted">{t('settings.packs.desc')}</p>
        <div className="grid gap-3 sm:grid-cols-3">
          {PACK_LIST.map((pack) => (
            <PackCard
              key={pack.id}
              pack={pack}
              active={settings.activePackId === pack.id}
              onSelect={() => choosePack(pack)}
            />
          ))}
        </div>

        {lowMemory && (
          <p className="mt-3 flex items-start gap-2 text-xs text-muted">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            {t('settings.packs.hardwareWarning')}
          </p>
        )}

        {/* Single, unified download/status panel for whichever companion is selected above */}
        {gpuOk && (
          <div className="mt-4 rounded-2xl border border-ink/8 bg-white/50 p-3.5">
            {engineState.status === 'loading' && (
              <div>
                <div className="flex items-center gap-2 text-sm text-ink/80">
                  <Loader2 size={14} className="animate-spin text-sage" />
                  {engineState.text || t('settings.engine.loadingDefault')}
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-ink/10">
                  <div
                    className="h-full rounded-full bg-sage transition-all"
                    style={{ width: `${Math.round(engineState.progress * 100)}%` }}
                  />
                </div>
              </div>
            )}
            {engineState.status === 'error' && (
              <p className="flex items-start gap-2 text-sm text-clay">
                <AlertTriangle size={15} className="mt-0.5 shrink-0" />
                {t('settings.engine.errorPrefix')}
                {engineState.error || 'unknown error'}
              </p>
            )}
            {engineState.status === 'ready' && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-sagedeep">{t('settings.engine.ready')}</p>
                <button
                  onClick={handleRemoveDownload}
                  className="inline-flex items-center gap-1 text-xs text-muted hover:text-clay"
                >
                  <Trash2 size={12} /> {t('settings.packs.removeDownload')}
                </button>
              </div>
            )}
            {engineState.status === 'idle' && !downloaded && (
              <button
                onClick={handleDownload}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-sagedeep underline-offset-2 hover:underline"
              >
                <Download size={14} /> {t('settings.engine.download')}
              </button>
            )}
          </div>
        )}
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

      {/* Account (only renders when Google Sign-In / email updates are configured) */}
      <AccountCard />

      {/* Privacy */}
      <div className="card mt-4 flex items-start gap-3 p-5">
        <ShieldCheck size={20} className="mt-0.5 shrink-0 text-sage" />
        <p className="text-sm leading-relaxed text-muted">{t('settings.privacy')}</p>
      </div>

      {/* Your data — export */}
      <div className="card mt-4 flex items-center justify-between p-5">
        <div>
          <p className="font-medium text-ink">{t('settings.export.title')}</p>
          <p className="text-sm text-muted">{t('settings.export.desc')}</p>
        </div>
        <button
          onClick={exportAllData}
          className="inline-flex items-center gap-2 rounded-full border border-sage/40 px-4 py-2 text-sm font-medium text-sagedeep transition hover:bg-sage/10"
        >
          <Download size={15} /> {t('settings.export.button')}
        </button>
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
