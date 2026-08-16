import fs from 'fs';
import path from 'path';

const logsDir = path.join(process.cwd(), 'logs');

// Ensure logs directory exists
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const errorLogPath = path.join(logsDir, 'error.log');
const combinedLogPath = path.join(logsDir, 'combined.log');

function formatLogMessage(level: string, message: string, meta?: any): string {
  const timestamp = new Date().toISOString();
  let metaString = '';

  if (meta) {
    if (meta instanceof Error) {
      metaString = `\n  Stack: ${meta.stack}`;
    } else if (typeof meta === 'object') {
      try {
        metaString = ` | Meta: ${JSON.stringify(meta)}`;
      } catch {
        metaString = ` | Meta: [Circular Object]`;
      }
    } else {
      metaString = ` | Meta: ${meta}`;
    }
  }

  return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaString}\n`;
}

function appendToFile(filePath: string, content: string) {
  fs.appendFile(filePath, content, (err) => {
    if (err) {
      console.error(`[Logger Error] Failed to write log to ${filePath}:`, err);
    }
  });
}

export const logger = {
  info: (message: string, meta?: any) => {
    const formatted = formatLogMessage('INFO', message, meta);
    console.log(`[INFO] ${message}`, meta ? (meta.stack ? '' : meta) : '');
    appendToFile(combinedLogPath, formatted);
  },

  warn: (message: string, meta?: any) => {
    const formatted = formatLogMessage('WARN', message, meta);
    console.warn(`[WARN] ${message}`, meta ? (meta.stack ? '' : meta) : '');
    appendToFile(combinedLogPath, formatted);
  },

  error: (message: string, error?: any) => {
    const formatted = formatLogMessage('ERROR', message, error);
    console.error(`[ERROR] ${message}`, error ? (error.stack || error) : '');
    appendToFile(combinedLogPath, formatted);
    appendToFile(errorLogPath, formatted);
  }
};
