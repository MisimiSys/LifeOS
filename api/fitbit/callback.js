import {
  exchangeAuthorizationCode,
  parseCookies,
  sendJson,
  setCors,
  storeFitbitToken,
  upsertDailyMetrics,
  fetchTodayFitbitMetrics,
  webAppUrl,
} from './_shared.js'

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
    const requestUrl = new URL(request.url, `https://${request.headers.host}`)
    const code = requestUrl.searchParams.get('code')
    const state = requestUrl.searchParams.get('state')
    const cookies = parseCookies(request)

    if (!code) {
      throw new Error('Missing Fitbit authorization code')
    }

    if (!state || state !== cookies.lifeos_fitbit_oauth_state) {
      throw new Error('Fitbit OAuth state did not match')
    }

    const tokenPayload = await exchangeAuthorizationCode(code)
    await storeFitbitToken(tokenPayload)
    const todayMetrics = await fetchTodayFitbitMetrics()
    await upsertDailyMetrics(todayMetrics)

    response.setHeader(
      'Set-Cookie',
      'lifeos_fitbit_oauth_state=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Secure',
    )
    response.statusCode = 302
    response.setHeader('Location', `${webAppUrl()}?fitbit=connected`)
    response.end()
  } catch (error) {
    response.statusCode = 302
    response.setHeader(
      'Location',
      `${webAppUrl()}?fitbit=error&message=${encodeURIComponent(
        error instanceof Error ? error.message : 'Fitbit connection failed',
      )}`,
    )
    response.end()
  }
}

