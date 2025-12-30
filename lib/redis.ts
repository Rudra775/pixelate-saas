import { Redis } from "ioredis";

const getRedisConnection = () => {
  const url = process.env.REDIS_URL;

  if (url) {
    console.log("🔌 Redis: Connecting to Cloud URL...");
    return new Redis(url, {
      maxRetriesPerRequest: null,
      // ⚠️ CRITICAL FOR RENDER + UPSTASH
      tls: {
        rejectUnauthorized: false // Fixes "self-signed certificate" errors
      }
    });
  }

  console.log("⚠️ Redis: Fallback to Localhost");
  return new Redis({
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    maxRetriesPerRequest: null,
  });
};

export const redisConfig = getRedisConnection();
