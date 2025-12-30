import { Redis } from "ioredis";

const getRedisConfiguration = () => {
  if (process.env.REDIS_URL) {
    console.log("🔌 Redis: Using Cloud Connection (SSL)");
    return {
      url: process.env.REDIS_URL,
      options: {
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
        // 🛑 CRITICAL: This fixes the ECONNRESET on Render
        tls: {
          rejectUnauthorized: false
        }
      }
    };
  }

  // Fallback for Localhost
  console.log("⚠️ Redis: Using Localhost");
  return {
    url: "redis://127.0.0.1:6379",
    options: {
      maxRetriesPerRequest: null,
    }
  };
};

const config = getRedisConfiguration();

// 1. Export the options so the Worker can create its own connections
export const redisConnectionOptions = {
  ...config.options,
};

// 2. Export the URL separately if needed
export const redisUrl = config.url;

// 3. Export a SHARED instance for the API/Producer
export const connection = new Redis(config.url, config.options);