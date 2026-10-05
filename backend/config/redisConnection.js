const REDIS_URL_VARIABLES = [
  "REDIS_URL",
  "UPSTASH_REDIS_URL",
  "REDIS_CONNECTION_STRING",
  "UPSTASH_URL",
];

export const resolveRedisConnection = (env = process.env) => {
  const redisUrl = REDIS_URL_VARIABLES.map((name) => env[name]).find(Boolean);

  if (redisUrl) {
    const protocol = new URL(redisUrl).protocol;
    return {
      connection: redisUrl,
      options:
        protocol === "rediss:"
          ? { tls: { rejectUnauthorized: true } }
          : {},
    };
  }

  return {
    connection: {
      host: env.REDIS_HOST || "127.0.0.1",
      port: Number(env.REDIS_PORT) || 6379,
      password: env.REDIS_PASSWORD || undefined,
    },
    options: {},
  };
};