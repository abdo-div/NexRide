import chalk from "chalk";

/**
 * Chalk-based development console logger
 * Used alongside Pino for human-readable local output
 */
const chalkLogger = {
  success: (msg) => console.log(chalk.green(`✅ [SUCCESS] ${msg}`)),
  error: (msg) => console.log(chalk.red(`💥 [ERROR] ${msg}`)),
  warn: (msg) => console.log(chalk.yellow(`⚠️  [WARN] ${msg}`)),
  info: (msg) => console.log(chalk.cyan(`ℹ️  [INFO] ${msg}`)),
  redis: (msg) => console.log(chalk.magenta(`🔴 [REDIS] ${msg}`)),
};

export default chalkLogger;
