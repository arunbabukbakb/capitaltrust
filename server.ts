import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { logger } from './server/logger';

const isBundled = typeof __filename !== 'undefined' && (__filename.endsWith('server.cjs') || __dirname.includes('dist'));
const defaultEnv = isBundled ? 'production' : 'development';
const nodeEnv = process.env.NODE_ENV || defaultEnv;
process.env.NODE_ENV = nodeEnv;

const envFile = nodeEnv === 'production' ? '.env.production' : '.env.development';
const envPath = path.join(process.cwd(), envFile);

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
  logger.info(`Loaded environment configuration from ${envFile} (mode: ${nodeEnv})`);
} else {
  dotenv.config(); // fallback to standard .env
  logger.info(`Loaded default environment configuration (mode: ${nodeEnv})`);
}

// Hook process-level uncaught error listeners to file logger
process.on('uncaughtException', (error: Error) => {
  logger.error('UNCAUGHT EXCEPTION! Synchronous error caught at process level.', error);
});

process.on('unhandledRejection', (reason: any) => {
  logger.error('UNHANDLED REJECTION! Promise rejection caught at process level.', reason);
});

import { initDatabase } from './server/database';
import { runSeeders } from './server/seeders';
import { createApp } from './server/app';

const PORT: number = Number(process.env.PORT) || 3000;

async function startServer() {
  try {
    // 1. Initialize Database & Schema
    const db = await initDatabase();

    // 2. Run database seeders if empty
    await runSeeders(db);

    // 3. Bootstrap Express Application
    const app = await createApp();

    // 4. Start listening on PORT
    app.listen(PORT, "0.0.0.0", () => {
      logger.info(`CapitalTrust Server running on http://localhost:${PORT}`);
      logger.info(`API Swagger documentation available at http://localhost:${PORT}/api-docs`);
    });
  } catch (error) {
    logger.error("Failed to start CapitalTrust server", error);
    process.exit(1);
  }
}

startServer();
