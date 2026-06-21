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
