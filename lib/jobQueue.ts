import { Queue } from "bullmq";
import { connection } from "./redis";

export const videoQueue = new Queue("video-processing", {
  connection: connection, // Reuse the shared connection for the API
});