/* eslint-disable no-console */
const fs = require("node:fs");
const path = require("node:path");
const { Client } = require("pg");
const dotenv = require("dotenv");

const envFile = fs.existsSync(".env.local") ? ".env.local" : ".env";
if (fs.existsSync(envFile)) {
  dotenv.config({ path: envFile });
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.warn(
    "Database init skipped: DATABASE_URL is missing. Add it to your .env.local/.env.",
  );
  process.exit(0);
}

const schemaPath = path.join(__dirname, "..", "..", "db", "schema.sql");
if (!fs.existsSync(schemaPath)) {
  console.error("Database init failed: schema file missing at db/schema.sql");
  process.exit(1);
}

const schemaSql = fs.readFileSync(schemaPath, "utf8");

async function main() {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    if (process.env.DB_RESET === "true") {
      console.warn(
        "DB_RESET=true detected: dropping and recreating public schema (dev-only).",
      );
      await client.query(
        "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO postgres; GRANT ALL ON SCHEMA public TO public;",
      );
    }
    await client.query(schemaSql);
    console.log("Database schema ensured.");
  } catch (error) {
    console.error("Database init failed:", error.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main();
