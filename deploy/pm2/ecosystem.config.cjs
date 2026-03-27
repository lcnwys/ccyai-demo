module.exports = {
  apps: [
    {
      name: "chcy-api",
      cwd: "/root/ccyai-demo",
      script: "npm",
      args: "run start -w @chcy/api",
      env: {
        NODE_ENV: "production",
        PORT: 3002,
        DATABASE_URL: "mysql://chcy:chcy123@127.0.0.1:3307/chcyai",
        REDIS_URL: "redis://127.0.0.1:6380",
        REDIS_HOST: "127.0.0.1",
        REDIS_PORT: "6380"
      }
    },
    {
      name: "chcy-worker",
      cwd: "/root/ccyai-demo",
      script: "npm",
      args: "run start -w @chcy/worker",
      env: {
        NODE_ENV: "production",
        DATABASE_URL: "mysql://chcy:chcy123@127.0.0.1:3307/chcyai",
        REDIS_URL: "redis://127.0.0.1:6380",
        REDIS_HOST: "127.0.0.1",
        REDIS_PORT: "6380"
      }
    },
    {
      name: "chcy-web",
      cwd: "/root/ccyai-demo",
      script: "npm",
      args: "run start -w @chcy/web",
      env: {
        NODE_ENV: "production",
        PORT: 3001,
        NEXT_PUBLIC_API_BASE_URL: "/api"
      }
    }
  ]
};

