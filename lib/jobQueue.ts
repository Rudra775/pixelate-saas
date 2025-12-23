import { Queue } from "bullmq";
import { redisConfig } from "./redis";

// Singleton pattern to prevent creating too many connections in Next.js dev mode
const globalForQueue = global as unknown as { videoQueue: Queue };

export const videoQueue =
  globalForQueue.videoQueue ||
  new Queue("video-processing", {
    connection: redisConfig,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 1000,
      },
      removeOnComplete: {
        age: 24 * 3600, // Keep jobs for 24 hours
        count: 1000,
      },
      removeOnFail: {
        age: 24 * 7 * 3600, // Keep failed jobs for 7 days
      },
    },
  });

if (process.env.NODE_ENV !== "production") globalForQueue.videoQueue = videoQueue;