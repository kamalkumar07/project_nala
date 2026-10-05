/**
 * server.js — entry point. Binds the Express app to PORT.
 */

import app from './app.js';
import env from './config/env.js';
import logger from './logger.js';

const server = app.listen(env.PORT, () => {
  logger.info(
    { port: env.PORT, useMock: env.USE_MOCK, nodeEnv: env.NODE_ENV },
    'Nala Watch backend started',
  );
});

// Graceful shutdown: stop accepting new connections, let in-flight requests finish
function shutdown(signal) {
  logger.info({ signal }, 'Shutdown signal received');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
  // Force exit if graceful close takes too long
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10_000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
