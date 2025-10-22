module.exports = {
  apps: [
    {
      name: 'chamos-barber',
      script: 'server.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      // Configuración de logs
      log_file: './logs/app.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // Configuración de reinicio automático
      watch: false,
      ignore_watch: ['node_modules', 'logs', '*.log'],
      
      // Configuración de memoria
      max_memory_restart: '1G',
      
      // Configuración de reinicio en caso de error
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s'
    }
  ]
}