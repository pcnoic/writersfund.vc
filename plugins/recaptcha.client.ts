import { VueReCaptcha } from 'vue-recaptcha-v3'

export default defineNuxtPlugin((nuxtApp) => {
  const config = useRuntimeConfig()
  
  console.log('[reCAPTCHA Plugin] Site key from config:', config.public.recaptchaSiteKey ? `${config.public.recaptchaSiteKey.substring(0, 10)}...` : 'MISSING')
  
  if (!config.public.recaptchaSiteKey) {
    console.warn('[reCAPTCHA Plugin] No site key configured, skipping reCAPTCHA setup')
    return
  }
  
  nuxtApp.vueApp.use(VueReCaptcha, {
    siteKey: config.public.recaptchaSiteKey,
    loaderOptions: {
      autoHideBadge: true,
      useRecaptchaNet: true
    }
  })
})
