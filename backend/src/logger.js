/**
 * logger.js — pino JSON logger singleton.
 * In development, pino-pretty formats output for readability.
 * In production, raw JSON goes to stdout → CloudWatch.
 */

import pino from 'pino';
import env from './config/env.js';

const logger = pino({
  level: env.LOG_LEVEL,
  ...(env.NODE_ENV === 'development' && {
    transport: {
      target: 'pino-pretty',
      options: { colorize: true, translateTime: 'SYS:standard', ignore: 'pid,hostname' },
    },
  }),
});

export default logger;
