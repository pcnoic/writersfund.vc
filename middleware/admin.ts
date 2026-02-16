export default defineNuxtRouteMiddleware(async () => {
  const auth = useAuth()
  const user = auth.user.value

  if (!user) {
    return navigateTo('/login?next=/admin')
  }

  // Check if user is admin via API
  try {
    await $fetch('/api/admin/stats')
  } catch {
    return navigateTo('/')
  }
})
