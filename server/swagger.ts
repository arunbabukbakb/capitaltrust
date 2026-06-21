import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Router } from 'express';

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
        url: 'http://localhost:3000',
        description: 'Development Server',
      },
    ],
  },
  apis: ['./server/routes/*.ts', './server/routes/*.js'],
};

const swaggerSpec = swaggerJSDoc(options);

const router = Router();
router.use('/', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

export default router;
