#!/usr/bin/env node
/**
 * TechIT Network — Automated Setup Script
 * Run: node setup.js
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const green = (s) => `\x1b[32m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;
const cyan = (s) => `\x1b[36m${s}\x1b[0m`;
const bold = (s) => `\x1b[1m${s}\x1b[0m`;

console.log(bold(cyan("\n🚀 TechIT Network — Setup\n")));

// Check .env
const envPath = path.join(__dirname, "frontend", ".env");
if (!fs.existsSync(envPath)) {
  console.log(yellow("⚠️  No .env found. Copying from .env.example..."));
  fs.copyFileSync(path.join(__dirname, "frontend", ".env.example"), envPath);
  console.log(yellow("📝 Edit frontend/.env and add your Supabase credentials!\n"));
} else {
  console.log(green("✅ .env found"));
}

// Install frontend
console.log(cyan("\n📦 Installing frontend dependencies..."));
try {
  execSync("npm install --legacy-peer-deps", { cwd: path.join(__dirname, "frontend"), stdio: "inherit" });
  console.log(green("✅ Frontend installed"));
} catch (e) {
  console.error("❌ Frontend install failed:", e.message);
}

// Install backend
console.log(cyan("\n📦 Installing backend dependencies..."));
try {
  execSync("npm install", { cwd: path.join(__dirname, "backend"), stdio: "inherit" });
  console.log(green("✅ Backend installed"));
} catch (e) {
  console.error("❌ Backend install failed:", e.message);
}

console.log(bold(green("\n✅ Setup complete!\n")));
console.log("Next steps:");
console.log("  1. Run the SQL in " + cyan("backend/supabase/schema.sql") + " in your Supabase dashboard");
console.log("  2. Run the SQL in " + cyan("backend/supabase/schema_v2.sql") + " as well");
console.log("  3. Start the frontend: " + cyan("npm run dev"));
console.log("  4. (Optional) Start the backend: " + cyan("npm run dev:backend"));
console.log("\n🌍 Open: http://localhost:5173\n");
