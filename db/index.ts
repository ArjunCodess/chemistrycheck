import { drizzle } from "drizzle-orm/neon-http";
import { chatAnalysis, user, messageEmbeddings } from "./schema";

const databaseUrl =
  process.env.DATABASE_URL || "postgresql://user:password@localhost:5432/db";

export const db = drizzle(databaseUrl);

export { chatAnalysis, user, messageEmbeddings };
