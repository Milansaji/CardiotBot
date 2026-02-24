// pm2 ecosystem config
// Usage:
//   Development:  pm2 start ecosystem.config.cjs
//   Production:   pm2 start ecosystem.config.cjs --env production
//
// Useful commands:
//   pm2 list              → see all processes
//   pm2 logs              → tail all logs
//   pm2 logs backend      → tail a specific process
//   pm2 restart all       → restart everything
//   pm2 save              → persist process list across reboots
//   pm2 startup           → generate OS startup hook

module.exports = {
    apps: [
        // ─────────────────────────────────────────────
        // 1. Express API backend  (port 3001)
        // ─────────────────────────────────────────────
        {
            name: 'backend',
            script: 'backend/server.js',
            cwd: __dirname,
            instances: 1,
            exec_mode: 'fork',
            watch: false,
            autorestart: true,
            max_restarts: 10,
            restart_delay: 3000,
            env: {
                NODE_ENV: 'development',
            },
            env_production: {
                NODE_ENV: 'production',
            },
            log_date_format: 'YYYY-MM-DD HH:mm:ss',
            error_file: 'logs/backend-error.log',
            out_file: 'logs/backend-out.log',
            merge_logs: true,
        },

        // ─────────────────────────────────────────────
        // 2. Cardiot bot  (TypeScript → compiled JS)
        //    Run `npm run build` inside cardiot-bot-main
        //    before starting in production.
        // ─────────────────────────────────────────────
        {
            name: 'cardiot-bot',
            // In dev: use ts-node via npm run dev
            // In production: point to compiled output
            script: 'npm',
            args: 'run dev',
            cwd: __dirname + '/cardiot-bot-main',
            instances: 1,
            exec_mode: 'fork',
            watch: false,
            autorestart: true,
            max_restarts: 10,
            restart_delay: 3000,
            env: {
                NODE_ENV: 'development',
            },
            env_production: {
                // Override in production so pm2 uses `node dist/index.js`
                NODE_ENV: 'production',
                PM2_SCRIPT: 'dist/index.js',
            },
            log_date_format: 'YYYY-MM-DD HH:mm:ss',
            error_file: 'logs/cardiot-bot-error.log',
            out_file: 'logs/cardiot-bot-out.log',
            merge_logs: true,
        },

        // ─────────────────────────────────────────────
        // 3. Frontend  (Vite preview of production build)
        //    Run `npm run build` inside Frontend/ first.
        //    Serves the compiled React SPA on port 8080.
        // ─────────────────────────────────────────────
        {
            name: 'frontend',
            script: 'npm',
            args: 'run preview',
            cwd: __dirname + '/Frontend',
            instances: 1,
            exec_mode: 'fork',
            watch: false,
            autorestart: true,
            max_restarts: 10,
            restart_delay: 3000,
            env: {
                NODE_ENV: 'development',
            },
            env_production: {
                NODE_ENV: 'production',
            },
            log_date_format: 'YYYY-MM-DD HH:mm:ss',
            error_file: 'logs/frontend-error.log',
            out_file: 'logs/frontend-out.log',
            merge_logs: true,
        },
    ],
};
