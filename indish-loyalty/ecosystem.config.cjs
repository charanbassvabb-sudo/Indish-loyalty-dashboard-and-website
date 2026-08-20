// PM2 config for the Indish Loyalty app (TanStack Start, node-server preset).
// Self-hosted on the same droplet as the main site — see deploy/DEPLOY.md
// and deploy/nginx-loyalty.conf. Runs under a separate Node 22 (via nvm),
// since this app's build tooling requires it while the main backend stays
// on the droplet's system Node 20 — see the `interpreter` path below.
//
// Usage (from indish-loyalty/ on the droplet):
//   pm2 start ecosystem.config.cjs
//   pm2 save
module.exports = {
  apps: [
    {
      name: "indish-loyalty",
      cwd: "/var/www/indish-loyalty",
      script: ".output/server/index.mjs",
      interpreter: "/root/.nvm/versions/node/v22.23.2/bin/node",
      instances: 1,
      exec_mode: "fork",
      env: {
        PORT: 8081,
        NODE_ENV: "production",
      },
      max_memory_restart: "300M",
      out_file: "/var/log/indish/loyalty-out.log",
      error_file: "/var/log/indish/loyalty-error.log",
      merge_logs: true,
      time: true,
      watch: false,
      autorestart: true,
      restart_delay: 3000,
    },
  ],
};
