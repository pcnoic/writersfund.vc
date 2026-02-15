export default defineNuxtConfig({
  compatibilityDate: "2025-01-01",
  devtools: { enabled: true },
  modules: ["@nuxtjs/supabase"],
  supabase: {
    redirect: false,
  },
  runtimeConfig: {
    recaptchaSecretKey: process.env.RECAPTCHA_SECRET_KEY || "",
    public: {
      recaptchaSiteKey: process.env.RECAPTCHA_SITE_KEY || "",
    },
  },
  css: ["~/assets/css/main.css"],
  app: {
    head: {
      title: "The Writers Fund | Competitive Accelerator for Writers",
      meta: [
        { name: "description", content: "An accelerator for writers." },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
      ],
    },
  },
});
