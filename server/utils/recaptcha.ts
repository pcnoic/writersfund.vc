import { createError } from 'h3'

interface RecaptchaResponse {
  success: boolean
  score: number
  action: string
  challenge_ts: string
  hostname: string
  'error-codes'?: string[]
}

const RECAPTCHA_VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify'
const MIN_SCORE = 0.5

export async function verifyRecaptcha(
  token: string,
  expectedAction: string
): Promise<{ success: boolean; score: number }> {
  const secretKey = process.env.RECAPTCHA_SECRET_KEY
  const isDev = process.env.NODE_ENV === 'development'

  console.log('[reCAPTCHA] Starting verification for action:', expectedAction)
  console.log('[reCAPTCHA] Environment:', process.env.NODE_ENV)
  console.log('[reCAPTCHA] Secret key configured:', !!secretKey)
  console.log('[reCAPTCHA] Token received:', token ? `${token.substring(0, 20)}...` : 'MISSING')

  if (!secretKey) {
    console.warn('[reCAPTCHA] RECAPTCHA_SECRET_KEY not configured, skipping verification')
    return { success: true, score: 1 }
  }

  if (isDev && process.env.SKIP_RECAPTCHA === 'true') {
    console.warn('[reCAPTCHA] Skipping verification in development (SKIP_RECAPTCHA=true)')
    return { success: true, score: 1 }
  }

  if (!token) {
    console.error('[reCAPTCHA] No token provided')
    throw createError({
      statusCode: 400,
      statusMessage: 'reCAPTCHA token is required'
    })
  }

  console.log('[reCAPTCHA] Sending verification request to Google...')

  const response = await fetch(RECAPTCHA_VERIFY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      secret: secretKey,
      response: token
    })
  })

  const data: RecaptchaResponse = await response.json()

  console.log('[reCAPTCHA] Google response:', JSON.stringify({
    success: data.success,
    score: data.score,
    action: data.action,
    hostname: data.hostname,
    errorCodes: data['error-codes']
  }, null, 2))

  if (!data.success) {
    console.error('[reCAPTCHA] Verification failed. Error codes:', data['error-codes'])
    throw createError({
      statusCode: 403,
      statusMessage: `reCAPTCHA verification failed: ${(data['error-codes'] || []).join(', ')}`
    })
  }

  if (data.action !== expectedAction) {
    console.error(`[reCAPTCHA] Action mismatch: expected "${expectedAction}", got "${data.action}"`)
    throw createError({
      statusCode: 403,
      statusMessage: `reCAPTCHA action mismatch: expected ${expectedAction}, got ${data.action}`
    })
  }

  if (data.score < MIN_SCORE) {
    console.warn(`[reCAPTCHA] Score too low: ${data.score} (minimum: ${MIN_SCORE})`)
    throw createError({
      statusCode: 403,
      statusMessage: `Request blocked due to suspicious activity (score: ${data.score})`
    })
  }

  console.log(`[reCAPTCHA] Verification successful. Score: ${data.score}`)
  return { success: true, score: data.score }
}
