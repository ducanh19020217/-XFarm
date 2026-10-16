import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '../../..');
process.loadEnvFile?.(path.join(rootDir, '.env'));

const port = new URL(process.env.WEB_URL || 'http://localhost:3100').port || '3100';
const child = spawn('next', ['dev', '-p', port], {
  cwd: path.resolve(rootDir, 'apps/web'),
  stdio: 'inherit',
  shell: true,
  env: process.env,
});

const forwardSignal = (signal) => child.kill(signal);
process.on('SIGINT', () => forwardSignal('SIGINT'));
process.on('SIGTERM', () => forwardSignal('SIGTERM'));
child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 1);
});
