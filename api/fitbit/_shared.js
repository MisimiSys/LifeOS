import { createClient } from '@supabase/supabase-js'

const DEFAULT_ALLOWED_ORIGINS = [
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://localhost:5173',
  'http://localhost:5174',
  'https://misimisys.github.io',
  'https://jideatom.github.io',
]

const DEFAULT_LIFEOS_WEB_URL = 'https://misimisys.github.io/LifeOS/'
const FITBIT_SCOPE = ['activity', 'heartrate', 'sleep', 'weight', 'profile'].join(' ')

function requiredEnv(name) {
  const value = process.env[name]
  if (!value) {
    throw new Error(`${name} is not configured`)
  }
  return value
}

function fitbitClientId() {
  return requiredEnv('FITBIT_CLIENT_ID')
}

function fitbitClientSecret() {
  return requiredEnv('FITBIT_CLIENT_SECRET')
}

export function fitbitRedirectUri() {
  return requiredEnv('FITBIT_REDIRECT_URI')
}

function supabaseUrl() {
  return process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || requiredEnv('VITE_SUPABASE_URL')
}

function supabaseServiceRoleKey() {
  return requiredEnv('SUPABASE_SERVICE_ROLE_KEY')
}

export function webAppUrl() {
  return process.env.LIFEOS_WEB_APP_URL || DEFAULT_LIFEOS_WEB_URL
}

export function sendJson(response, statusCode, payload) {
  response.statusCode = statusCode
  response.setHeader('Content-Type', 'application/json')
  response.end(JSON.stringify(payload))
}

function allowedOrigins() {
  const configured = process.env.LIFEOS_ALLOWED_ORIGIN
  if (!configured) return DEFAULT_ALLOWED_ORIGINS

  return configured
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
}

export function setCors(request, response) {
  const requestOrigin = request.headers.origin
  const allowed = allowedOrigins()
  const responseOrigin =
    requestOrigin && allowed.includes(requestOrigin)
      ? requestOrigin
      : allowed[0] || '*'

  response.setHeader('Access-Control-Allow-Origin', responseOrigin)
  response.setHeader('Vary', 'Origin')
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
}

export function handleOptions(request, response) {
  setCors(request, response)
  if (request.method === 'OPTIONS') {
    response.statusCode = 204
    response.end()
    return true
  }
  return false
}

export function parseCookies(request) {
  return String(request.headers.cookie || '')
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((cookies, part) => {
      const separatorIndex = part.indexOf('=')
      if (separatorIndex === -1) return cookies
      const key = part.slice(0, separatorIndex)
      const value = decodeURIComponent(part.slice(separatorIndex + 1))
      cookies[key] = value
      return cookies
    }, {})
}

export function authRedirectUrl(state) {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: fitbitClientId(),
    redirect_uri: fitbitRedirectUri(),
    scope: FITBIT_SCOPE,
    expires_in: '31536000',
    state,
  })

  return `https://www.fitbit.com/oauth2/authorize?${params.toString()}`
}

function supabaseAdmin() {
  return createClient(supabaseUrl(), supabaseServiceRoleKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

function fitbitBasicAuthHeader() {
  return Buffer.from(`${fitbitClientId()}:${fitbitClientSecret()}`).toString('base64')
}

export async function exchangeAuthorizationCode(code) {
  const response = await fetch('https://api.fitbit.com/oauth2/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${fitbitBasicAuthHeader()}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: fitbitClientId(),
      grant_type: 'authorization_code',
      redirect_uri: fitbitRedirectUri(),
      code,
    }),
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(payload.errors?.[0]?.message || payload.error_description || 'Fitbit token exchange failed')
  }
  return payload
}

export async function refreshFitbitToken(refreshToken) {
  const response = await fetch('https://api.fitbit.com/oauth2/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${fitbitBasicAuthHeader()}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(payload.errors?.[0]?.message || payload.error_description || 'Fitbit token refresh failed')
  }
  return payload
}

export async function getStoredFitbitToken() {
  const admin = supabaseAdmin()
  const { data, error } = await admin.from('fitbit_tokens').select('*').eq('id', 'primary').maybeSingle()
  if (error) throw error
  return data
}

export async function storeFitbitToken(payload) {
  const admin = supabaseAdmin()
  const expiresAt = new Date(Date.now() + Number(payload.expires_in || 0) * 1000).toISOString()
  const row = {
    id: 'primary',
    access_token: payload.access_token,
    refresh_token: payload.refresh_token,
    expires_at: expiresAt,
    scope: payload.scope || FITBIT_SCOPE,
    fitbit_user_id: payload.user_id || null,
    updated_at: new Date().toISOString(),
  }

  const { error } = await admin.from('fitbit_tokens').upsert(row, { onConflict: 'id' })
  if (error) throw error
  return row
}

export async function getValidFitbitAccessToken() {
  const stored = await getStoredFitbitToken()
  if (!stored?.refresh_token) {
    throw new Error('Fitbit is not connected yet')
  }

  const expiresAtMs = stored.expires_at ? new Date(stored.expires_at).getTime() : 0
  const shouldRefresh = !stored.access_token || !expiresAtMs || expiresAtMs - Date.now() < 5 * 60 * 1000

  if (!shouldRefresh) {
    return stored.access_token
  }

  const refreshed = await refreshFitbitToken(stored.refresh_token)
  const saved = await storeFitbitToken(refreshed)
  return saved.access_token
}

async function fitbitRequest(path, accessToken) {
  const response = await fetch(`https://api.fitbit.com${path}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(payload.errors?.[0]?.message || `Fitbit request failed: ${response.status}`)
  }
  return payload
}

function totalDistanceKm(summary) {
  const distances = Array.isArray(summary?.distances) ? summary.distances : []
  const total = distances.find((entry) => entry.activity === 'total') || distances[0]
  return total?.distance ?? null
}

export async function fetchTodayFitbitMetrics() {
  const accessToken = await getValidFitbitAccessToken()
  const [activities, sleep, weight] = await Promise.all([
    fitbitRequest('/1/user/-/activities/date/today.json', accessToken),
    fitbitRequest('/1.2/user/-/sleep/date/today.json', accessToken),
    fitbitRequest('/1/user/-/body/log/weight/date/today/1d.json', accessToken),
  ])

  const activitySummary = activities.summary || {}
  const latestSleepLog = Array.isArray(sleep.sleep) ? sleep.sleep[0] : null
  const latestWeightLog = Array.isArray(weight.weight) && weight.weight.length > 0 ? weight.weight[0] : null
  const totalMinutesAsleep =
    sleep.summary?.totalMinutesAsleep ??
    latestSleepLog?.minutesAsleep ??
    null

  return {
    date: activities.activities?.[0]?.dateTime || new Date().toISOString().slice(0, 10),
    source: 'Fitbit',
    sync_status: 'Imported',
    sleep_hours: totalMinutesAsleep != null ? Number(totalMinutesAsleep) / 60 : null,
    sleep_score: latestSleepLog?.levels?.summary?.deep?.count != null ? null : null,
    resting_heart_rate: activitySummary.restingHeartRate ?? null,
    steps: activitySummary.steps ?? null,
    active_zone_minutes:
      Number(activitySummary.fairlyActiveMinutes || 0) + Number(activitySummary.veryActiveMinutes || 0),
    calories_burned: activitySummary.caloriesOut ?? null,
    distance_km: totalDistanceKm(activitySummary),
    workout_minutes: Number(activitySummary.fairlyActiveMinutes || 0) + Number(activitySummary.veryActiveMinutes || 0),
    weight_kg: latestWeightLog?.weight ?? null,
    synced_at: new Date().toISOString(),
  }
}

export async function upsertDailyMetrics(row) {
  const admin = supabaseAdmin()
  const { error } = await admin.from('fitbit_daily_metrics').upsert(row, { onConflict: 'date' })
  if (error) throw error
}

export async function latestFitbitMetrics() {
  const admin = supabaseAdmin()
  const { data, error } = await admin
    .from('fitbit_daily_metrics')
    .select('*')
    .order('date', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data
}

