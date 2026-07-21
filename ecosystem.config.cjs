/**
 * Configuration PM2 — L'Émulsion
 * Usage :
 *   pm2 start ecosystem.config.cjs
 *   pm2 restart lemulsion
 *   pm2 logs lemulsion
 */
module.exports = {
  apps: [
    {
      name: 'lemulsion',
      script: 'src/server.js',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      time: true,
      env: {
        NODE_ENV: 'production',
      },
      // On ne surcharge pas PORT ni SESSION_SECRET ici : ils viennent du .env
      // (dotenv est chargé en tête de src/server.js).
      out_file: './logs/pm2-out.log',
      error_file: './logs/pm2-err.log',
      merge_logs: true,
    },
  ],
};
