// =====================================================================
// Aura — locale-aware emergency number for the crisis banner.
// The banner's "Emergency" button used to hardcode tel:911 regardless of the
// person's country, while the label text was translated per language (e.g.
// French showed "15 / 112" but the button dialed 911 anyway). A wrong number
// in an actual crisis is worse than none, so this only returns a number for
// countries we're confident about — everything else falls back to a plain
// "call your local emergency number" with no tel: link.
//
// Detection uses navigator.languages (BCP-47 region subtag, e.g. "es-MX" →
// "MX") — never geolocation. It's a best-effort hint from the browser/OS
// locale the person already has, not a permission prompt.
// =====================================================================

const EMERGENCY_NUMBER_BY_REGION: Record<string, string> = {
  // Unified 911
  US: '911', CA: '911', MX: '911', AR: '911', EC: '911', UY: '911', PY: '911',
  HN: '911', SV: '911', NI: '911', CR: '911', PA: '911', DO: '911', VE: '911',
  // 112 (EU-wide + others that adopted it)
  ES: '112', FR: '112', DE: '112', PT: '112', IT: '112', NL: '112', BE: '112',
  AT: '112', CH: '112', SE: '112', NO: '112', FI: '112', DK: '112', PL: '112',
  GR: '112', HU: '112', RO: '112', CZ: '112', SK: '112', IE: '112', IN: '112',
  // Other single national numbers
  GB: '999', AU: '000', NZ: '111',
  CO: '123', PE: '105', BO: '110', GT: '110', CU: '106', BR: '190',
}

/** Best-effort ISO 3166-1 alpha-2 region guess from the browser's locale list. */
function detectRegion(): string | undefined {
  if (typeof navigator === 'undefined') return undefined
  const candidates = navigator.languages?.length ? navigator.languages : [navigator.language]
  for (const tag of candidates) {
    const region = tag?.split('-')[1]?.toUpperCase()
    if (region && /^[A-Z]{2}$/.test(region)) return region
  }
  return undefined
}

/** The local emergency number for this browser's region, or undefined if we're not confident. */
export function localEmergencyNumber(): string | undefined {
  const region = detectRegion()
  return region ? EMERGENCY_NUMBER_BY_REGION[region] : undefined
}
