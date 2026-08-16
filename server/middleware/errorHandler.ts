import { Request, Response, NextFunction } from 'express';
import { logger } from '../logger';

export const errorHandler = (err: any, req: Request, res: Response, _next: NextFunction) => {
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Internal Server Error';
  const tenantId = (req.headers['x-tenant-id'] as string) || 'N/A';
  const userIp = req.ip || req.socket.remoteAddress || 'Unknown';

  const contextMeta = {
    method: req.method,
    url: req.originalUrl || req.url,
    statusCode,
    tenantId,
    ip: userIp,
    params: req.params,
    query: req.query,
    stack: err.stack
  };

  logger.error(`HTTP ${req.method} ${req.originalUrl || req.url} - ${message}`, contextMeta);

  if (res.headersSent) {
    return _next(err);
  }

  return res.status(statusCode).json({
    error: statusCode === 500 ? 'Internal Server Error' : message,
    message: message,
    timestamp: new Date().toISOString()
  });
};
