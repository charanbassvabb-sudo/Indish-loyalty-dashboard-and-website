// PM2 process manager config for the Indish API.
// Usage (from /var/www/indish/backend on the droplet):
//   pm2 start ../deploy/ecosystem.config.js
//   pm2 save
//   pm2 startup   (follow the printed command once, so PM2 survives reboots)

module.exports = {
  apps: [
    {
      name: "indish-api",
      cwd: "/var/www/indish/backend",
      script: "dist/index.js",
      instances: 1,
      exec_mode: "fork",
      env_production: {
        NODE_ENV: "production",
      },
      max_memory_restart: "300M",
      out_file: "/var/log/indish/api-out.log",
      error_file: "/var/log/indish/api-error.log",
      merge_logs: true,
      time: true,
      watch: false,
      autorestart: true,
      restart_delay: 3000,
    },
  ],
};
