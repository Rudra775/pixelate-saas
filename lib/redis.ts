import { RedisOptions } from 'ioredis';

// Add this log to see what's happening when this file is imported
const host = process.env.REDIS_HOST || '127.0.0.1';
const port = process.env.REDIS_PORT || '6379';

console.log(`🔌 Redis Config Loading: Connecting to ${host}:${port}`);

export const redisConfig: RedisOptions = {
  host: host,
  port: parseInt(port),
  maxRetriesPerRequest: null, //  Important for BullMQ workers!
};