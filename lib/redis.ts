import { Redis } from "ioredis";

const getRedisConfiguration = () => {
  if (process.env.REDIS_URL) {
    try {
      const parsed = new URL(process.env.REDIS_URL);
      const hostname = parsed.hostname;

      // If the URL points to localhost / 127.0.0.1 treat it as a local plain-redis
      const isLocal = hostname === "127.0.0.1" || hostname === "localhost";

      if (isLocal) {
        console.log("🔌 Redis: Using provided local Redis (no TLS)");
        return {
          url: process.env.REDIS_URL,
          options: {
            maxRetriesPerRequest: null,
            enableReadyCheck: false,
          },
        };
      }

      // Otherwise assume a cloud Redis that requires TLS
      console.log("🔌 Redis: Using Cloud Connection (SSL)");
      return {
        url: process.env.REDIS_URL,
        options: {
          maxRetriesPerRequest: null,
          enableReadyCheck: false,
          // 🛑 CRITICAL: This fixes the ECONNRESET on Render
          tls: {
            rejectUnauthorized: false,
          },
        },
      };
    } catch (e) {
      // Fallback to previous behavior if URL parsing fails
      console.log("🔌 Redis: Using provided REDIS_URL (fallback)");
      return {
        url: process.env.REDIS_URL,
        options: {
          maxRetriesPerRequest: null,
          enableReadyCheck: false,
          tls: {
            rejectUnauthorized: false,
          },
        },
      };
    }
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

// Log Redis connection errors so worker doesn't spam unhandled exceptions
connection.on("error", (err) => {
  // Keep message short and actionable
  console.error('[redis] connection error:', err && err.message ? err.message : err);
});

connection.on("connect", () => {
  console.log('[redis] connected to', config.url);
});
