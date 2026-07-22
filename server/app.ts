import express from 'express';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import apiRoutes from './routes';
import swaggerRouter from './swagger';

export async function createApp() {
  const app = express();

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));
  app.use(cookieParser());

  // Serve uploaded profile images
  const uploadsPath = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsPath)) {
    fs.mkdirSync(uploadsPath, { recursive: true });
  }
  app.use('/uploads', express.static(uploadsPath));

  // Swagger docs
  app.use('/api-docs', swaggerRouter);

  // API routing registry
  app.use('/api', apiRoutes);

  // --- VITE AND STATIC ASSET SERVING ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const candidatePaths = [
      path.join(process.cwd(), 'dist', 'dist'),
      path.join(process.cwd(), 'dist'),
      path.join(process.cwd(), 'dist', 'public'),
      path.join(process.cwd(), 'public'),
      path.join(__dirname, 'dist'),
      path.join(__dirname, 'public'),
      process.cwd()
    ];

    const staticPath = candidatePaths.find(p => fs.existsSync(path.join(p, 'index.html'))) || process.cwd();

    app.use(express.static(staticPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(staticPath, 'index.html'));
    });
  }

  return app;
}
