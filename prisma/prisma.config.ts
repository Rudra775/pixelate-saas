import 'dotenv/config'
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("Environment variable DATABASE_URL is not set");

export default {
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    provider: "postgresql",
    url: databaseUrl,
  }
};
