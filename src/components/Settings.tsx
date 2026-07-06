import { useEffect, useState } from 'react'
import {
  AlertTriangle,
  Bell,
  Check,
  Download,
  Globe,
  Loader2,
  Mic,
  ShieldCheck,
  Sun,
  Trash2,
  Volume2,
  Waypoints,
  Wind,
} from 'lucide-react'
import { clearAllData, exportAllData, useSettings, useModelIdForPack, type Settings as SettingsType } from '../lib/settings'
import { speechSupported } from '../lib/speech'
import { useName } from '../lib/store'
import {
  emailCaptureAvailable,
  getLatestIdToken,
  googleSignInAvailable,
  subscribeEmail,
  useProfile,
} from '../lib/auth'
import GoogleSignInButton from './GoogleSignInButton'
import { LANG_LABELS, SUPPORTED_LANGS, useLang } from '../lib/i18n'
import { CHARACTER_PACKS, DEFAULT_PACK_ID, SUPPORTED_MODELS, type CharacterPack } from '../lib/characterPacks'
import {
  isModelDownloaded,
  removeDownloadedModel,
  switchActiveLocalModel,
  useLocalEngineState,
  webgpuSupported,
} from '../lib/localEngine'
import { playTapChime } from '../lib/chime'
import { isLikelyMeteredConnection } from '../lib/network'
import { isPushSupported, subscribeToReminders, unsubscribeFromReminders } from '../lib/push'
import { backupNow, deleteBackup, restoreBackup } from '../lib/backup'

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
      onClick={() => {
        playTapChime()
        onChange(!on)
      }}
      className={`relative h-7 w-12 shrink-0 rounded-full transition ${
        on ? 'bg-sage' : 'bg-ink/15'
      }  ${disabled ? 'opacity-40' : ''}`}
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

function ReminderCard() {
  const { t, lang } = useLang()
  const [settings, setSettings] = useSettings()
  const [busy, setBusy] = useState(false)
  const supported = isPushSupported()

  async function toggle(on: boolean) {
    setBusy(true)
    if (on) {
      const ok = await subscribeToReminders(settings.reminderHour, settings.reminderMinute, lang)
      setSettings((s) => ({ ...s, reminderEnabled: ok }))
    } else {
      await unsubscribeFromReminders()
      setSettings((s) => ({ ...s, reminderEnabled: false }))
    }
    setBusy(false)
  }

  async function updateTime(hour: number, minute: number) {
    setSettings((s) => ({ ...s, reminderHour: hour, reminderMinute: minute }))
    if (settings.reminderEnabled) await subscribeToReminders(hour, minute, lang)
  }

  return (
    <div className="card mt-4 p-5">
      <div className="flex items-center gap-4">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-sage/15 text-sagedeep">
          <Bell size={18} />
        </div>
        <div className="flex-1">
          <p className="font-medium text-ink">{t('settings.reminder.title')}</p>
          <p className="text-sm text-muted">
            {supported ? t('settings.reminder.desc') : t('settings.reminder.unsupported')}
          </p>
        </div>
        <Toggle on={settings.reminderEnabled} disabled={!supported || busy} onChange={toggle} />
      </div>
      {settings.reminderEnabled && (
        <div className="mt-3 flex items-center gap-2">
          <input
            type="time"
            value={`${String(settings.reminderHour).padStart(2, '0')}:${String(settings.reminderMinute).padStart(2, '0')}`}
            onChange={(e) => {
              const [h, m] = e.target.value.split(':').map(Number)
              updateTime(h, m)
            }}
            className="rounded-xl border border-ink/10 bg-white/60 px-3 py-2 text-sm text-ink outline-none focus:border-sage/50"
          />
        </div>
      )}
    </div>
  )
}

type BackupStatus = 'idle' | 'working' | 'ok' | 'wrong-passphrase' | 'no-backup' | 'error'

function BackupCard() {
  const { t } = useLang()
  const { profile } = useProfile()
  const [settings, setSettings] = useSettings()
  const [passphrase, setPassphrase] = useState('')
  const [confirmPass, setConfirmPass] = useState('')
  const [status, setStatus] = useState<BackupStatus>('idle')
  const [pendingAction, setPendingAction] = useState<null | 'backup' | 'restore'>(null)
  const [needsReauth, setNeedsReauth] = useState(false)

  const hasBackup = !!settings.backupUpdatedAt
  const passReady = hasBackup ? passphrase.length >= 8 : passphrase.length >= 8 && passphrase === confirmPass

  if (!googleSignInAvailable() || !profile) return null

  async function run(action: 'backup' | 'restore') {
    const token = getLatestIdToken()
    if (!token) {
      setPendingAction(action)
      setNeedsReauth(true)
      return
    }
    setStatus('working')
    try {
      if (action === 'backup') {
        await backupNow(token, passphrase)
        setSettings((s) => ({ ...s, backupUpdatedAt: new Date().toISOString() }))
      } else {
        await restoreBackup(token, passphrase)
      }
      setStatus('ok')
      setPassphrase('')
      setConfirmPass('')
    } catch (err: any) {
      if (err?.message === 'wrong-passphrase') setStatus('wrong-passphrase')
      else if (err?.message === 'no-backup') setStatus('no-backup')
      else setStatus('error')
    }
  }

  return (
    <div className="card mt-4 p-5">
      <p className="font-medium text-ink">{t('settings.backup.title')}</p>
      <p className="mb-3 text-sm text-muted">{t('settings.backup.desc')}</p>

      {needsReauth && (
        <div className="mb-3 rounded-2xl bg-sage/10 p-3">
          <p className="mb-2 text-xs text-ink/80">{t('settings.backup.reauth')}</p>
          <GoogleSignInButton
            forceRender
            onSignedIn={() => {
              setNeedsReauth(false)
              if (pendingAction) run(pendingAction)
            }}
          />
        </div>
      )}

      <input
        type="password"
        value={passphrase}
        onChange={(e) => setPassphrase(e.target.value)}
        placeholder={t('settings.backup.passphrasePlaceholder')}
        className="w-full rounded-2xl border border-ink/10 bg-white/60 px-4 py-3 text-sm text-ink outline-none transition focus:border-sage/50"
      />
      {!hasBackup && (
        <input
          type="password"
          value={confirmPass}
          onChange={(e) => setConfirmPass(e.target.value)}
          placeholder={t('settings.backup.confirmPlaceholder')}
          className="mt-2 w-full rounded-2xl border border-ink/10 bg-white/60 px-4 py-3 text-sm text-ink outline-none transition focus:border-sage/50"
        />
      )}
      <p className="mt-2 text-[11px] leading-relaxed text-muted/80">{t('settings.backup.warning')}</p>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          disabled={!passReady || status === 'working'}
          onClick={() => run('backup')}
          className="rounded-full bg-sage px-4 py-2 text-xs font-medium text-white transition hover:opacity-90 disabled:opacity-40"
        >
          {t('settings.backup.backupNow')}
        </button>
        {hasBackup && (
          <button
            disabled={passphrase.length < 8 || status === 'working'}
            onClick={() => run('restore')}
            className="rounded-full border border-sage/40 px-4 py-2 text-xs font-medium text-sagedeep transition hover:bg-sage/10 disabled:opacity-40"
          >
            {t('settings.backup.restore')}
          </button>
        )}
      </div>

      {hasBackup && (
        <p className="mt-2 text-xs text-muted">
          {t('settings.backup.lastBackup', { date: new Date(settings.backupUpdatedAt!).toLocaleString() })}
        </p>
      )}
      {status === 'ok' && <p className="mt-2 text-xs text-sagedeep">{t('settings.backup.success')}</p>}
      {status === 'wrong-passphrase' && (
        <p className="mt-2 text-xs text-clay">{t('settings.backup.wrongPassphrase')}</p>
      )}
      {status === 'no-backup' && <p className="mt-2 text-xs text-clay">{t('settings.backup.noBackup')}</p>}
      {status === 'error' && <p className="mt-2 text-xs text-clay">{t('settings.backup.error')}</p>}
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
  const activeModelId = useModelIdForPack(activePack.id)
  const engineState = useLocalEngineState(activeModelId)
  const [downloaded, setDownloaded] = useState(false)

  // Track loaded states of each pack dynamically, avoiding hook rule violations
  const calmModelId = useModelIdForPack('calm')
  const groundedModelId = useModelIdForPack('grounded')
  const reflectiveModelId = useModelIdForPack('reflective')

  const calmEngineState = useLocalEngineState(calmModelId)
  const groundedEngineState = useLocalEngineState(groundedModelId)
  const reflectiveEngineState = useLocalEngineState(reflectiveModelId)

  const previousLoadedModelId = (() => {
    if (activePack.id !== 'calm' && calmEngineState.status === 'ready') return calmModelId
    if (activePack.id !== 'grounded' && groundedEngineState.status === 'ready') return groundedModelId
    if (activePack.id !== 'reflective' && reflectiveEngineState.status === 'ready') return reflectiveModelId
    return undefined
  })()

  useEffect(() => {
    let cancelled = false
    isModelDownloaded(activeModelId).then((ok) => {
      if (!cancelled) setDownloaded(ok)
    })
    return () => {
      cancelled = true
    }
  }, [activeModelId])

  // Already-downloaded companions load straight from the on-device cache — no need to make
  // the user tap "Download" again just to switch back to a model they already have.
  useEffect(() => {
    if (gpuOk && downloaded && engineState.status === 'idle') {
      switchActiveLocalModel(activeModelId, previousLoadedModelId).catch(() => {})
    }
  }, [gpuOk, downloaded, engineState.status, activeModelId, previousLoadedModelId])

  const set = (patch: Partial<SettingsType>) => setSettings((s) => ({ ...s, ...patch }))

  function choosePack(pack: CharacterPack) {
    playTapChime()
    set({ activePackId: pack.id })
  }

  function handleDownload() {
    if (isLikelyMeteredConnection()) {
      const modelInfo = SUPPORTED_MODELS.find((m) => m.id === activeModelId)
      const ok = confirm(t('download.meteredWarning', { size: modelInfo?.vramGB ?? activePack.vramHintGB }))
      if (!ok) return
    }
    switchActiveLocalModel(activeModelId, previousLoadedModelId).catch(() => {})
  }

  async function handleRemoveDownload() {
    await removeDownloadedModel(activeModelId)
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
              onClick={() => {
                playTapChime()
                setLang(l)
              }}
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

      {/* Theme selection */}
      <div className="card mt-4 p-5">
        <div className="mb-3 flex items-center gap-2">
          <Sun size={18} className="text-sagedeep" />
          <p className="font-medium text-ink">{t('settings.theme.title') || 'Appearance'}</p>
        </div>
        <p className="mb-3 text-sm text-muted">{t('settings.theme.desc') || 'Choose how Aura looks on your screen.'}</p>
        <div className="flex gap-2">
          {(['light', 'dark', 'system'] as const).map((tMode) => (
            <button
              key={tMode}
              onClick={() => {
                playTapChime()
                set({ theme: tMode })
              }}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition capitalize ${
                settings.theme === tMode
                  ? 'border-sage bg-sage/15 text-sagedeep'
                  : 'border-ink/10 bg-white/50 text-muted hover:border-sage/40'
              }`}
            >
              {t(`settings.theme.${tMode}`) || tMode}
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
          <div className="mt-4 rounded-2xl border border-ink/8 bg-white/50 p-4 animate-rise">
            {/* Model Selection Dropdown */}
            <div className="mb-4">
              <label htmlFor="model-select" className="text-xs font-semibold uppercase tracking-wider text-muted block mb-1.5">
                {t('settings.model.label') || 'Underlying Model'}
              </label>
              <select
                id="model-select"
                value={activeModelId}
                onChange={(e) => {
                  const newModelId = e.target.value
                  set({
                    modelOverrides: {
                      ...settings.modelOverrides,
                      [activePack.id]: newModelId
                    }
                  })
                }}
                className="w-full rounded-xl border border-ink/10 bg-white/60 dark:bg-sand/30 px-3 py-2 text-sm text-ink outline-none transition focus:border-sage/50"
              >
                {SUPPORTED_MODELS.map((m) => (
                  <option key={m.id} value={m.id} className="dark:bg-sand bg-white text-ink">
                    {m.label} ({m.vramGB} GB)
                  </option>
                ))}
              </select>
              <p className="mt-1.5 text-xs text-muted leading-relaxed">
                {SUPPORTED_MODELS.find(m => m.id === activeModelId)?.description}
              </p>
            </div>

            <div className="border-t border-ink/8 pt-3">
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

        <Row
          icon={<Volume2 size={18} />}
          title={t('settings.toggle.sound.title')}
          desc={t('settings.toggle.sound.desc')}
        >
          <Toggle on={settings.soundEffects} onChange={(v) => set({ soundEffects: v })} />
        </Row>
      </div>

      {/* Daily reminder push notification */}
      <ReminderCard />

      {/* Account (only renders when Google Sign-In / email updates are configured) */}
      <AccountCard />

      {/* Encrypted cross-device backup (only renders when signed in with Google) */}
      <BackupCard />

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
          onClick={async () => {
            if (!confirm(t('settings.danger.confirm'))) return
            await unsubscribeFromReminders().catch(() => {})
            const token = getLatestIdToken()
            if (token) await deleteBackup(token).catch(() => {})
            clearAllData()
          }}
          className="inline-flex items-center gap-2 rounded-full border border-clay/40 px-4 py-2 text-sm font-medium text-clay transition hover:bg-clay/10"
        >
          <Trash2 size={15} /> {t('settings.danger.erase')}
        </button>
      </div>
    </div>
  )
}
