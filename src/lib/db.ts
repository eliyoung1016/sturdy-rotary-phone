import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import type { PrismaClient as PrismaClientType } from "@prisma/client/extension";

import { PrismaClient } from "@/generated/client/client";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL,
});

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter,
  } as PrismaClientType);

globalForPrisma.prisma = prisma;
