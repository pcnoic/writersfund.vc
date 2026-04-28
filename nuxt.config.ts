export default defineNuxtConfig({
  compatibilityDate: "2025-01-01",
  devtools: { enabled: true },
  runtimeConfig: {
    jwtSecret: process.env.JWT_SECRET || "your-secret-key-change-this-in-production",
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
      link: [
        { rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon-32.png" },
        { rel: "icon", type: "image/png", sizes: "16x16", href: "/favicon-16.png" },
        { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png" },
      ],
    },
  },
});
