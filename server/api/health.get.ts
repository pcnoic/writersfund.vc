export default defineEventHandler(() => {
  return {
    ok: true,
    service: "wf-app",
    timestamp: new Date().toISOString(),
  };
});
