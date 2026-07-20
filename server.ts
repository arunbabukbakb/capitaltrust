import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

const isBundled = typeof __filename !== 'undefined' && (__filename.endsWith('server.cjs') || __dirname.includes('dist'));
const defaultEnv = isBundled ? 'production' : 'development';
const nodeEnv = process.env.NODE_ENV || defaultEnv;
process.env.NODE_ENV = nodeEnv;

const envFile = nodeEnv === 'production' ? '.env.production' : '.env.development';
const envPath = path.join(process.cwd(), envFile);

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
  console.log(`Loaded environment configuration from ${envFile} (mode: ${nodeEnv})`);
} else {
  dotenv.config(); // fallback to standard .env
  console.log(`Loaded default environment configuration (mode: ${nodeEnv})`);
}

import { initDatabase } from './server/database';
import { runSeeders } from './server/seeders';
import { createApp } from './server/app';

const PORT: number = Number(process.env.PORT) || 3000;

async function startServer() {
  try {
    // 1. Initialize SQLite Database & Schema
    const db = await initDatabase();

    // 2. Run database seeders if empty
    await runSeeders(db);

    // 3. Bootstrap Express Application
    const app = await createApp();

    // 4. Start listening on PORT
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`CapitalTrust Server running on http://localhost:${PORT}`);
      console.log(`API Swagger documentation available at http://localhost:${PORT}/api-docs`);
    });
  } catch (error) {
    console.error("Failed to start CapitalTrust server", error);
    process.exit(1);
  }
}

startServer();
