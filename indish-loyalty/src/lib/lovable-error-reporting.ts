// Originally forwarded errors to Lovable's in-editor telemetry. This app no
// longer runs inside Lovable, so we just log — swap this out for Sentry,
// LogRocket, etc. if you want production error tracking.
export function reportLovableError(error: unknown, meta?: Record<string, unknown>) {
  console.error("[app error]", error, meta);
}
