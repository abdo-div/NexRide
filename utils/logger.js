import chalk from "chalk";

const logger = {
  success: (msg) => console.log(chalk.bold.green("✔  ") + chalk.green(msg)),
  info: (msg) => console.log(chalk.bold.cyan("ℹ  ") + chalk.cyan(msg)),
  warn: (msg) => console.log(chalk.bold.yellow("⚠️  ") + chalk.yellow(msg)),
  error: (msg) => console.log(chalk.bold.red("💥 ") + chalk.red(msg)),
  database: (msg) =>
    console.log(chalk.bold.magenta("🍃 [MongoDB] ") + chalk.white(msg)),
  redis: (msg) =>
    console.log(chalk.bold.redBright("🔴 [Redis] ") + chalk.white(msg)),
};

export default logger;
