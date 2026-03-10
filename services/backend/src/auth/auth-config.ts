import { Hono } from 'hono';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { getDb } from '../db/client';
import { authSchema } from '../db/auth-schema';
import type { AppEnv, BackendEnv } from '../worker-types';
import { getAuthBaseUrl, getTrustedOrigins, shouldUseCrossSiteAuthCookies } from './auth-env';

export const createAuth = (env: BackendEnv, request?: Request) => betterAuth({
  secret: env.BETTER_AUTH_SECRET,
  baseURL: getAuthBaseUrl(env, request),
  trustedOrigins: (currentRequest) => getTrustedOrigins(env, currentRequest),
  advanced: {
    defaultCookieAttributes: {
      sameSite: shouldUseCrossSiteAuthCookies(env, request) ? 'none' : 'lax',
    },
  },
  database: drizzleAdapter(getDb(env), {
    provider: 'pg',
    schema: authSchema,
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 6,
  },
  user: {
    additionalFields: {
      role: {
        type: 'string',
        required: false,
        defaultValue: 'user',
      },
    },
  },
});

export const authRouter = new Hono<AppEnv>().all('*', (c) => {
  const auth = createAuth(c.env, c.req.raw);
  return auth.handler(c.req.raw);
});