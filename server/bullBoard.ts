// server/bullBoard.ts
import express from 'express';
import { ExpressAdapter } from '@bull-board/express';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { Queue } from 'bullmq';
import { redisConfig } from '@/lib/redis';

const videoQueue = new Queue('video-processing', { connection: redisConfig });

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

createBullBoard({
  queues: [new BullMQAdapter(videoQueue)],
  serverAdapter,
});

const app = express();
app.use('/admin/queues', serverAdapter.getRouter());

// Optional auth
// app.use((req, res, next) => {
//   if (req.headers.authorization !== `Bearer ${process.env.ADMIN_TOKEN}`) {
//     return res.status(403).send('Forbidden');
//   }
//   next();
// });

const PORT = process.env.BULL_BOARD_PORT || 3030;
app.listen(PORT, () =>
  console.log(`📊 Bull Board running at http://localhost:${PORT}/admin/queues`)
);
