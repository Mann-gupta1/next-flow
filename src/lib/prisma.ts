import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaDatabaseUrl: string | undefined;
};

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Add your Neon PostgreSQL connection string to .env"
    );
  }

  const adapter = new PrismaPg(connectionString);
  return new PrismaClient({ adapter });
}

function getPrismaClient(): PrismaClient {
  const databaseUrl = process.env.DATABASE_URL;

  if (
    !globalForPrisma.prisma ||
    globalForPrisma.prismaDatabaseUrl !== databaseUrl
  ) {
    globalForPrisma.prisma = createPrismaClient();
    globalForPrisma.prismaDatabaseUrl = databaseUrl;
  }

  return globalForPrisma.prisma;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, property, receiver) {
    const client = getPrismaClient();
    const value = Reflect.get(client, property, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
