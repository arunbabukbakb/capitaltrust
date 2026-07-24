import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Router } from 'express';
import path from 'path';

const options: swaggerJSDoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'CapitalTrust Fund Management API',
      version: '1.0.0',
      description: 'API documentation for CapitalTrust Underwriting, Roles, and Contributions Portal',
    },
    servers: [
      {
        url: '/',
        description: 'Current Application Host (Relative)',
      },
      {
        url: process.env.VITE_APP_URL || 'http://localhost:3000',
        description: 'Configured Environment Server',
      },
    ],
  },
  apis: [
    path.join(process.cwd(), 'server', 'routes', '*.ts'),
    path.join(process.cwd(), 'server', 'routes', '*.js'),
    path.join(process.cwd(), 'dist', 'server', 'routes', '*.ts'),
    path.join(process.cwd(), 'dist', 'server', 'routes', '*.js'),
    './server/routes/*.ts',
    './server/routes/*.js',
  ],
};

const swaggerSpec = swaggerJSDoc(options);

const router = Router();
router.use('/', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

export default router;

