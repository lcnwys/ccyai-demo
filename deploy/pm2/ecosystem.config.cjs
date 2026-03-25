module.exports = {
  apps: [
    {
      name: 'chcy-api',
      cwd: '/srv/ccyai-demo',
      script: 'npm',
      args: 'run start -w @chcy/api',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        DATABASE_URL: 'mysql://chcy:change_me@127.0.0.1:3306/chcyai',
        REDIS_URL: 'redis://127.0.0.1:6379',
        REDIS_HOST: '127.0.0.1',
        REDIS_PORT: '6379'
      }
    },
    {
      name: 'chcy-worker',
      cwd: '/srv/ccyai-demo',
      script: 'npm',
      args: 'run start -w @chcy/worker',
      env: {
        NODE_ENV: 'production',
        DATABASE_URL: 'mysql://chcy:change_me@127.0.0.1:3306/chcyai',
        REDIS_URL: 'redis://127.0.0.1:6379',
        REDIS_HOST: '127.0.0.1',
        REDIS_PORT: '6379'
      }
    },
    {
      name: 'chcy-web',
      cwd: '/srv/ccyai-demo',
      script: 'npm',
      args: 'run start -w @chcy/web',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        NEXT_PUBLIC_API_BASE_URL: 'https://your-domain.com/api'
      }
    }
  ]
};
