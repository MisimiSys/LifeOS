export type PhoneHealthSnapshot = {
  date?: string
  source?: string
  sleep_hours?: number | null
  sleep_score?: number | null
  resting_heart_rate?: number | null
  steps?: number | null
  active_zone_minutes?: number | null
  calories_burned?: number | null
  distance_km?: number | null
  workout_minutes?: number | null
  weight_kg?: number | null
}

const DEFAULT_PHONE_INGEST_BASE = 'https://life-os-lac-pi.vercel.app'

export const PHONE_HEALTH_INGEST_ENDPOINT = `${
  import.meta.env.VITE_LIFEOS_HEALTH_API_BASE ?? DEFAULT_PHONE_INGEST_BASE
}/api/health/ingest`

export function isLikelyNativePhoneShell() {
  return Boolean((window as Window & { Capacitor?: unknown }).Capacitor)
}

export async function postPhoneHealthSnapshot(snapshot: PhoneHealthSnapshot, syncKey: string) {
  const response = await fetch(PHONE_HEALTH_INGEST_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-lifeos-phone-sync-key': syncKey,
    },
    body: JSON.stringify(snapshot),
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(
      (payload && typeof payload.error === 'string' && payload.error) ||
        'Phone health snapshot could not be uploaded.',
    )
  }

  return payload
}
