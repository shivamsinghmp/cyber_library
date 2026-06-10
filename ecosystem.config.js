/**
 * PM2 Ecosystem Config — LOCAL DEVELOPMENT ONLY
 *
 * Production runs on Google Cloud Run (Docker containers).
 * Use this file only to run both servers locally:
 *   pm2 start ecosystem.config.js
 *   pm2 logs
 */
module.exports = {
  apps: [
    // ── Next.js ─────────────────────────────────────────────────────────────
    {
      name:        "lstudy",
      script:      "node_modules/.bin/next",
      args:        "start",
      cwd:         "/var/www/cyber_library",

      // Cluster mode: 3 workers for 4vCPU (1 core reserved for PG + OS)
      instances:   3,
      exec_mode:   "cluster",

      max_memory_restart:       "1G",
      restart_delay:            3000,
      exp_backoff_restart_delay: 100,
      max_restarts:             10,

      env: {
        NODE_ENV:      "production",
        PORT:          3000,
        PM2_INSTANCES: "3",
      },

      error_file:      "/var/log/lstudy/error.log",
      out_file:        "/var/log/lstudy/out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs:      true,

      kill_timeout:   10000,
      listen_timeout: 8000,
      watch:          false,
    },

    // ── Python FastAPI (StudyMate AI) ────────────────────────────────────────
    {
      name:     "lstudy-python",
      script:   "/var/www/cyber_library/python_server/venv/bin/uvicorn",
      args:     "main:app --host 127.0.0.1 --port 8001 --workers 2",
      cwd:      "/var/www/cyber_library/python_server",

      // fork — PM2 cluster mode is Node.js-only; Python uses fork
      instances: 1,
      exec_mode: "fork",
      interpreter: "none",        // uvicorn IS the interpreter

      max_memory_restart:       "512M",
      restart_delay:            5000,
      exp_backoff_restart_delay: 200,
      max_restarts:             10,

      env: {
        PYTHON_SERVER_PORT: "8001",
      },

      error_file:      "/var/log/lstudy/python-error.log",
      out_file:        "/var/log/lstudy/python-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs:      true,

      kill_timeout: 8000,
      watch:        false,
    },
  ],
};
