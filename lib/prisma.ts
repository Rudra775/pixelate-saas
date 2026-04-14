import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const connectionString = process.env.DATABASE_URL;

let prisma: PrismaClient;

if (typeof window === "undefined") {
  if (!globalForPrisma.prisma) {
    const pool = new Pool({ connectionString });
    const adapter = new PrismaPg(pool);
    globalForPrisma.prisma = new PrismaClient({
      adapter,
      log: ["error"],
    });
  }
  prisma = globalForPrisma.prisma;
} else {
  // Fallback for any client side imports (though Prisma shouldn't be used on the client)
  prisma = new PrismaClient({ log: ["error"] });
}

export const db = prisma;

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
