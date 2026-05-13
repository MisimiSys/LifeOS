import { fetchTodayHealthMetrics, sendJson, setCors, upsertDailyMetrics } from './_shared.js'

export default async function handler(request, response) {
  setCors(request, response)

  if (request.method === 'OPTIONS') {
    response.statusCode = 204
    response.end()
    return
  }

  if (request.method !== 'POST') {
    sendJson(response, 405, { error: 'Method not allowed' })
    return
  }

  try {
      const metrics = await fetchTodayHealthMetrics()
      await upsertDailyMetrics(metrics)
      sendJson(response, 200, { ok: true, metrics })
  } catch (error) {
    sendJson(response, 500, {
      error: error instanceof Error ? error.message : 'Could not sync Google Health data',
    })
  }
}
