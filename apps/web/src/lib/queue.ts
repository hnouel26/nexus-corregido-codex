import { Queue } from "bullmq";
import IORedis from "ioredis";

const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";

const globalForRedis = globalThis as unknown as { redisConn: IORedis | undefined };

const connection =
  globalForRedis.redisConn ??
  new IORedis(REDIS_URL, { maxRetriesPerRequest: 1, lazyConnect: true, connectTimeout: 5000, retryStrategy: (attempt) => attempt > 2 ? null : 300 });

if (process.env.NODE_ENV !== "production") globalForRedis.redisConn = connection;

export const agentQueue = new Queue("agent-runs", { connection });
