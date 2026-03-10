import { Hono } from 'hono';
import { stream } from 'hono/streaming';
import type { AppEnv } from '../../worker-types';
import { requireAdmin } from '../../auth/auth-middleware';
import { handleRunSingleIngestion } from '../ingestion/ingestion-handlers';

export const adminRouter = new Hono<AppEnv>();

// Protect all admin routes
adminRouter.use('*', requireAdmin);

// SSE endpoint for realtime ingestion events
adminRouter.get('/ingestion/events', (c) => {
  return stream(c, async (stream) => {
    // Set SSE headers
    c.header('Content-Type', 'text/event-stream');
    c.header('Cache-Control', 'no-cache');
    c.header('Connection', 'keep-alive');

    // Send initial connection message
    await stream.writeln('data: {"status":"connected","timestamp":"' + new Date().toISOString() + '"}\n');

    // For now, this is a simple keepalive
    // In a production environment, you would connect to a Durable Object
    // or use a pub/sub system to stream real events
    const interval = setInterval(async () => {
      try {
        await stream.writeln('data: {"type":"heartbeat","timestamp":"' + new Date().toISOString() + '"}\n');
      } catch {
        clearInterval(interval);
      }
    }, 30000); // Heartbeat every 30 seconds

    // Keep connection open
    await stream.sleep(1000000);
    clearInterval(interval);
  });
});

// Run ingestion endpoint (admin-protected version)
adminRouter.post('/ingestion/run-once', async (c) => {
  return handleRunSingleIngestion(c);
});
