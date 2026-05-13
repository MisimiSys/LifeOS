import { getStoredFitbitToken, latestFitbitMetrics, sendJson, setCors } from './_shared.js'

export default async function handler(request, response) {
  setCors(request, response)

  if (request.method === 'OPTIONS') {
    response.statusCode = 204
    response.end()
    return
  }

  if (request.method !== 'GET') {
    sendJson(response, 405, { error: 'Method not allowed' })
    return
  }

  try {
    const [token, metrics] = await Promise.all([getStoredFitbitToken().catch(() => null), latestFitbitMetrics().catch(() => null)])

    sendJson(response, 200, {
      ok: true,
      connected: Boolean(token?.refresh_token),
      lastSyncedAt: metrics?.synced_at || token?.updated_at || null,
      latestMetrics: metrics,
    })
  } catch (error) {
    sendJson(response, 500, {
      error: error instanceof Error ? error.message : 'Could not load Fitbit status',
    })
  }
}

