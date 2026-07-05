import { LifeBuoy, Phone, X } from 'lucide-react'
import { useLang } from '../lib/i18n'

// Shown whenever the app detects language suggesting acute distress. It never
// blocks the conversation — it sits alongside it, offering real, human help.
export default function CrisisBanner({ onClose }: { onClose?: () => void }) {
  const { t } = useLang()
  return (
    <div className="rounded-2xl border border-clay/40 bg-clay/10 p-4 sm:p-5 text-ink animate-rise">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-clay/20 text-clay">
          <LifeBuoy size={18} />
        </div>
        <div className="flex-1">
          <p className="font-display text-lg leading-tight">{t('crisis.title')}</p>
          <p className="mt-1 text-sm text-ink/80">{t('crisis.body')}</p>
          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            <a
              href="tel:988"
              className="inline-flex items-center gap-2 rounded-full bg-clay px-4 py-2 font-medium text-white transition hover:opacity-90"
            >
              <Phone size={15} /> {t('crisis.call988')}
            </a>
            <a
              href="tel:911"
              className="inline-flex items-center gap-2 rounded-full border border-clay/40 px-4 py-2 font-medium text-clay transition hover:bg-clay/10"
            >
              {t('crisis.emergency')}
            </a>
            <a
              href="https://findahelpline.com"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-ink/15 px-4 py-2 font-medium text-ink/70 transition hover:bg-white/60"
            >
              {t('crisis.findLine')}
            </a>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Dismiss"
            className="text-ink/40 transition hover:text-ink"
          >
            <X size={18} />
          </button>
        )}
      </div>
    </div>
  )
}
