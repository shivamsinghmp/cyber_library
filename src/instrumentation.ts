/**
 * Next.js instrumentation hook — runs ONCE per worker process at startup.
 * Docs: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 *
 * Must be enabled in next.config with: experimental: { instrumentationHook: true }
 */
export async function register() {
  // Only run in the Node.js runtime (not Edge workers)
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { validateEnv } = await import("./lib/envValidation");
    validateEnv();
  }
}
