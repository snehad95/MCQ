module.exports = {
  apps : [{
    name: 'exam-portal-server',
    script: 'server/server.js',
    instances: 'max', // Use all CPU cores
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
    },
    max_memory_restart: '1G'
  }]
};
