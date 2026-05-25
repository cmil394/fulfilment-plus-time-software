import { config } from "dotenv";
config();

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

let prisma: PrismaClient;

if (!globalForPrisma.prisma) {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
    min: 2,
    max: 10,
  });

  globalForPrisma.prisma = new PrismaClient({
    adapter,
    // log: ["error", "warn", "query"],
  });
}

prisma = globalForPrisma.prisma;

export { prisma };
