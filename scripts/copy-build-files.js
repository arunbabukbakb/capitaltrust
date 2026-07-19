import fs from 'fs';
import path from 'path';

const srcDir = process.cwd();
const destDir = path.join(srcDir, 'dist');

// Ensure dist directory exists
if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

// 1. Copy package.json with modified start script for standalone run
const pkgPath = path.join(srcDir, 'package.json');
if (fs.existsSync(pkgPath)) {
  const pkgContent = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  
  // Adjust scripts for run from within dist folder
  if (pkgContent.scripts) {
    pkgContent.scripts = {
      start: 'node server.cjs',
      // remove dev/build/lint scripts from prod package.json to keep it clean
    };
  }
  
  fs.writeFileSync(
    path.join(destDir, 'package.json'),
    JSON.stringify(pkgContent, null, 2),
    'utf8'
  );
  console.log('Copied and adjusted package.json to dist/');
}

// 2. Copy .env.example and environment specific files
const envExPath = path.join(srcDir, '.env.example');
if (fs.existsSync(envExPath)) {
  fs.copyFileSync(envExPath, path.join(destDir, '.env.example'));
  console.log('Copied .env.example to dist/');
}

const envProdPath = path.join(srcDir, '.env.production');
if (fs.existsSync(envProdPath)) {
  fs.copyFileSync(envProdPath, path.join(destDir, '.env'));
  console.log('Copied .env.production as .env to dist/');
}

const envDevPath = path.join(srcDir, '.env.development');
if (fs.existsSync(envDevPath)) {
  fs.copyFileSync(envDevPath, path.join(destDir, '.env.development'));
  console.log('Copied .env.development to dist/');
}

// 3. Copy firebase-service-account.json if it exists
const firebasePath = path.join(srcDir, 'firebase-service-account.json');
if (fs.existsSync(firebasePath)) {
  fs.copyFileSync(firebasePath, path.join(destDir, 'firebase-service-account.json'));
  console.log('Copied firebase-service-account.json to dist/');
}
