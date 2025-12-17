import { existsSync } from "node:fs";
import { config } from "dotenv";

const envFiles = [".env.local", ".env"];

for (const file of envFiles) {
  if (existsSync(file)) {
    config({ path: file });
    break;
  }
}
