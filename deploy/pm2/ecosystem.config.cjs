const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..", "..");

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const content = fs.readFileSync(filePath, "utf8");
  const env = {};

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, "");
    env[key] = value;
  }

  return env;
}

const fileEnv = {
  ...parseEnvFile(path.join(projectRoot, ".env")),
  ...parseEnvFile(path.join(projectRoot, ".env.deploy")),
  ...parseEnvFile(path.join(projectRoot, ".env.pm2"))
};

const env = {
  ...fileEnv,
  ...process.env
};

const mysqlHost = env.MYSQL_HOST || "127.0.0.1";
const mysqlPort = env.MYSQL_PORT || "3306";
const mysqlDatabase = env.MYSQL_DATABASE || "chcyai";
const mysqlUser = env.MYSQL_USER || "chcy";
const mysqlPassword = env.MYSQL_PASSWORD || "chcy123";
const redisHost = env.REDIS_HOST || "127.0.0.1";
const redisPort = env.REDIS_PORT || "6379";

const databaseUrl =
  env.DATABASE_URL ||
  `mysql://${mysqlUser}:${mysqlPassword}@${mysqlHost}:${mysqlPort}/${mysqlDatabase}`;
const redisUrl = env.REDIS_URL || `redis://${redisHost}:${redisPort}`;

const sharedEnv = {
  NODE_ENV: env.NODE_ENV || "production",
  DATABASE_URL: databaseUrl,
  REDIS_URL: redisUrl,
  REDIS_HOST: redisHost,
  REDIS_PORT: redisPort,
  APP_LOGIN_EMAIL: env.APP_LOGIN_EMAIL || "",
  APP_LOGIN_PASSWORD: env.APP_LOGIN_PASSWORD || "",
  APP_SESSION_SECRET: env.APP_SESSION_SECRET || "change_me_before_production",
  CHCY_API_BASE_URL: env.CHCY_API_BASE_URL || "https://api.chcyai.com",
  CHCY_ACCESS_KEY: env.CHCY_ACCESS_KEY || "",
  CHCY_SECRET_KEY: env.CHCY_SECRET_KEY || "",
  CHCY_CALLBACK_BASE_URL: env.CHCY_CALLBACK_BASE_URL || "http://127.0.0.1:3001",
  ALI_OSS_REGION: env.ALI_OSS_REGION || "",
  ALI_OSS_BUCKET: env.ALI_OSS_BUCKET || "",
  ALI_OSS_ACCESS_KEY_ID: env.ALI_OSS_ACCESS_KEY_ID || "",
  ALI_OSS_ACCESS_KEY_SECRET: env.ALI_OSS_ACCESS_KEY_SECRET || ""
};

module.exports = {
  apps: [
    {
      name: env.PM2_API_NAME || "chcy-api",
      cwd: projectRoot,
      script: "npm",
      args: "run start -w @chcy/api",
      env: {
        ...sharedEnv,
        PORT: env.API_PORT || env.PORT || "3001"
      }
    },
    {
      name: env.PM2_WORKER_NAME || "chcy-worker",
      cwd: projectRoot,
      script: "npm",
      args: "run start -w @chcy/worker",
      env: sharedEnv
    },
    {
      name: env.PM2_WEB_NAME || "chcy-web",
      cwd: projectRoot,
      script: "npm",
      args: "run start -w @chcy/web",
      env: {
        NODE_ENV: env.NODE_ENV || "production",
        PORT: env.WEB_PORT || "3000",
        NEXT_PUBLIC_API_BASE_URL:
          env.NEXT_PUBLIC_API_BASE_URL || `http://127.0.0.1:${env.API_PORT || env.PORT || "3001"}/api`
      }
    }
  ]
};
