import crypto from 'node:crypto'
import { authRedirectUrl, sendJson, setCors } from './_shared.js'

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
    const state = crypto.randomUUID()
    response.setHeader(
      'Set-Cookie',
      `lifeos_fitbit_oauth_state=${encodeURIComponent(state)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=900; Secure`,
    )
    response.statusCode = 302
    response.setHeader('Location', authRedirectUrl(state))
    response.end()
  } catch (error) {
    sendJson(response, 500, {
      error: error instanceof Error ? error.message : 'Could not start Fitbit connection',
    })
  }
}

