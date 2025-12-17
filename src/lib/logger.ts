export type LogLevel = "debug" | "info" | "warn" | "error";

const levelPriority: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const activeLevel = (process.env.NEXT_PUBLIC_LOG_LEVEL || "info") as LogLevel;

export function log(level: LogLevel, message: string, metadata?: unknown) {
  if (levelPriority[level] < levelPriority[activeLevel]) {
    return;
  }

  const time = new Date().toISOString();
  const payload = metadata ? JSON.stringify(metadata) : "";
  // eslint-disable-next-line no-console -- central logging utility
  console[level](`[${time}] ${level.toUpperCase()}: ${message} ${payload}`);
}
