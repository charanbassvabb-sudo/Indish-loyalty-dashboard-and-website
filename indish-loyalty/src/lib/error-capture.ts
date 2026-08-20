// Tracks the most recent uncaught server-side error so server.ts can log
// something useful when h3 swallows an in-handler throw into a bare
// {"unhandled":true,"message":"HTTPError"} response.
let lastCapturedError: unknown = null;

function capture(error: unknown) {
  lastCapturedError = error;
}

export function consumeLastCapturedError(): unknown {
  const err = lastCapturedError;
  lastCapturedError = null;
  return err;
}

// Only wire up process-level hooks on the server (Node/Netlify Functions).
if (typeof process !== "undefined" && typeof process.on === "function") {
  process.on("uncaughtException", capture);
  process.on("unhandledRejection", capture);
}
