/**
 * PM2 Ecosystem Config — Cyber Library Production
 * Usage:
 *   pm2 start ecosystem.config.js
 *   pm2 startup systemd && pm2 save   # auto-start on reboot
 *
 * Assumes: DO 4vCPU-8GB Droplet, Next.js on port 3000
 */
module.exports = {
  apps: [
    {
      name:        "cyber-library",
      script:      "node_modules/.bin/next",
      args:        "start",
      cwd:         "/home/cyberlib/app",  // ← update to your actual deploy path

      // Cluster mode: 3 workers for 4vCPU (1 core reserved for PG + OS)
      instances:   3,
      exec_mode:   "cluster",

      // Memory safety: restart worker if it exceeds 1GB
      max_memory_restart: "1G",

      // Crash recovery: wait 3s before restart, exponential backoff after repeated crashes
      restart_delay:            3000,
      exp_backoff_restart_delay: 100,
      max_restarts:             10,

      // Environment
      env: {
        NODE_ENV: "production",
        PORT:     3000,
      },

      // Logs (rotate manually or use pm2-logrotate module)
      error_file:      "/var/log/cyber-library/error.log",
      out_file:        "/var/log/cyber-library/out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs:      true,

      // Graceful shutdown: wait 10s for in-flight requests
      kill_timeout:    10000,
      listen_timeout:  8000,

      // Watch (DISABLE in production — causes hot reload = crashes)
      watch: false,
    },
  ],
};
