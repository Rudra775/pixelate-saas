import { Queue } from "bullmq";
import { redisConfig } from "./redis";

// Queue name must match the one in your worker ("video-processing")
export const videoQueue = new Queue("video-processing", {
  connection: redisConfig,
});