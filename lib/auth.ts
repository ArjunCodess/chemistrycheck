import { betterAuth } from "better-auth/minimal";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { db } from "@/db";
import { schema } from "@/db/schema";
import { nextCookies } from "better-auth/next-js";

const authBaseUrl =
  process.env.BETTER_AUTH_URL ||
  process.env.APP_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL &&
    `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`) ||
  (process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`) ||
  "http://localhost:3000";
const authSecret =
  process.env.BETTER_AUTH_SECRET ||
  (process.env.VERCEL
    ? undefined
    : "local-development-secret-for-chemistrycheck");
const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

export const auth = betterAuth({
  baseURL: authBaseUrl,
  secret: authSecret,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: schema,
  }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
  },
  socialProviders:
    googleClientId && googleClientSecret
      ? {
          google: {
            clientId: googleClientId,
            clientSecret: googleClientSecret,
            scope: ["profile", "email"],
            profile: {
              name: "name",
              email: "email",
              image: "picture",
            },
          },
        }
      : undefined,
  plugins: [nextCookies()],
});
