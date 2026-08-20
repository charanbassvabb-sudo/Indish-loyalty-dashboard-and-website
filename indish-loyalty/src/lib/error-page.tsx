// Minimal standalone HTML shown when server-side rendering throws before
// the React error boundary can mount. Kept dependency-free on purpose —
// this must render even if the rest of the app failed to load.
export function renderErrorPage(): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Something went wrong — Indish Loyalty</title>
    <style>
      body { margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center;
        background:#0b0b0c; color:#f5f1e8; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Inter,sans-serif; }
      .box { max-width:28rem; text-align:center; padding:2rem; }
      h1 { font-size:1.25rem; font-weight:600; margin:0 0 .5rem; }
      p { color:#a3a29c; font-size:.875rem; margin:0 0 1.5rem; }
      a { display:inline-flex; align-items:center; justify-content:center; border-radius:.375rem;
        background:#d4af37; color:#0b0b0c; padding:.5rem 1rem; font-size:.875rem; font-weight:600;
        text-decoration:none; }
    </style>
  </head>
  <body>
    <div class="box">
      <h1>This page didn't load</h1>
      <p>Something went wrong on our end. Please try refreshing or head back home.</p>
      <a href="/">Go home</a>
    </div>
  </body>
</html>`;
}
