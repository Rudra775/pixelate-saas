import { Redis } from "ioredis";

const getRedisConnection = () => {
  // 1. Log (hidden) to prove we see the variable
  if (process.env.REDIS_URL) {
    console.log("🔌 Redis: Connecting to Cloud URL...");
    return new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: null,
    });
  }

  // 2. Fallback for Localhost (Only if no Cloud URL)
  console.log("⚠️ Redis: Fallback to Localhost (127.0.0.1)");
  return new Redis({
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    maxRetriesPerRequest: null,
  });
};

export const redisConfig = getRedisConnection();