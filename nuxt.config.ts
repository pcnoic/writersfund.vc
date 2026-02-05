export default defineNuxtConfig({
  compatibilityDate: "2025-01-01",
  devtools: { enabled: true },
  modules: ["@nuxtjs/supabase"],
  css: ["~/assets/css/main.css"],
  app: {
    head: {
      title: "Writers Fund",
      meta: [
        { name: "description", content: "An accelerator for writers." },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
      ],
    },
  },
});
