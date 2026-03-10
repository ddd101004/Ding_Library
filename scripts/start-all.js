/**
 * 生产环境启动脚本
 * 同时启动 Next.js 应用和定时任务调度器
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('========== Starting Lingang Library ==========');
console.log('NODE_ENV:', process.env.NODE_ENV);

// 启动定时任务调度器（后台）
console.log('Starting cron scheduler...');
const cronProcess = spawn('node', [
  path.join(__dirname, '../dist/scripts/scripts/scheduleTasks.js')
], {
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: 'production' }
});

cronProcess.on('error', (err) => {
  console.error('Failed to start cron scheduler:', err);
});

cronProcess.on('exit', (code) => {
  console.log(`Cron scheduler exited with code ${code}`);
});

// 启动 Next.js 应用（前台）
console.log('Starting Next.js application on port 3007...');
const nextProcess = spawn('node_modules/.bin/next', ['start', '-p', '3007'], {
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: 'production' }
});

nextProcess.on('error', (err) => {
  console.error('Failed to start Next.js:', err);
  cronProcess.kill();
  process.exit(1);
});

nextProcess.on('exit', (code) => {
  console.log(`Next.js exited with code ${code}`);
  cronProcess.kill();
  process.exit(code || 0);
});

// 优雅关闭
const shutdown = () => {
  console.log('Shutting down...');
  cronProcess.kill();
  nextProcess.kill();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
