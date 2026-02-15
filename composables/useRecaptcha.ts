import { useReCaptcha } from 'vue-recaptcha-v3'

export function useRecaptcha() {
  const recaptcha = useReCaptcha()

  async function getToken(action: string): Promise<string | null> {
    console.log('[reCAPTCHA Client] Getting token for action:', action)
    console.log('[reCAPTCHA Client] recaptcha instance:', !!recaptcha)
    
    if (!recaptcha) {
      console.warn('[reCAPTCHA Client] reCAPTCHA not available - instance is null')
      return null
    }

    try {
      console.log('[reCAPTCHA Client] Waiting for reCAPTCHA to load...')
      await recaptcha.recaptchaLoaded()
      console.log('[reCAPTCHA Client] reCAPTCHA loaded, executing...')
      
      const token = await recaptcha.executeRecaptcha(action)
      console.log('[reCAPTCHA Client] Token received:', token ? `${token.substring(0, 30)}...` : 'EMPTY')
      
      return token
    } catch (error) {
      console.error('[reCAPTCHA Client] Error getting token:', error)
      return null
    }
  }

  return { getToken }
}
