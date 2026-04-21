import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import { createServer } from "http";
import { Server as SocketIO } from "socket.io";

import { authRouter } from "./modules/auth/auth.router.js";
import { usersRouter } from "./modules/users/users.router.js";
import { feedRouter } from "./modules/feed/feed.router.js";
import { projectsRouter } from "./modules/projects/projects.router.js";
import { matchingRouter } from "./modules/matching/matching.router.js";
import { collabRouter } from "./modules/collaboration/collab.router.js";
import { creditsRouter } from "./modules/credits/credits.router.js";
import { messagingRouter } from "./modules/messaging/messaging.router.js";
import { notificationsRouter } from "./modules/notifications/notifications.router.js";
import { paymentsRouter } from "./modules/payments/payments.router.js";
import { workspaceRouter } from "./modules/workspace/workspace.router.js";
import { uploadRouter } from "./modules/upload/upload.router.js";
import { analyticsRouter } from "./modules/analytics/analytics.router.js";
import { setupSocketHandlers } from "./modules/messaging/socket.handler.js";
import { errorHandler } from "./shared/middleware/errorHandler.js";
import { generalLimiter, authLimiter, aiLimiter } from "./shared/middleware/rateLimiter.js";

const app = express();
const httpServer = createServer(app);

const ALLOWED_ORIGINS = [
  process.env.FRONTEND_URL ?? "http://localhost:5173",
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:3000",
];

export const io = new SocketIO(httpServer, {
  cors: { origin: ALLOWED_ORIGINS, methods: ["GET","POST"], credentials: true },
  transports: ["websocket","polling"],
});
setupSocketHandlers(io);

// ── Middleware ─────────────────────────────────────────────
app.use(helmet({ crossOriginEmbedderPolicy: false, contentSecurityPolicy: false }));
app.use(compression() as express.RequestHandler);
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    cb(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
  methods: ["GET","POST","PUT","PATCH","DELETE","OPTIONS"],
  allowedHeaders: ["Content-Type","Authorization","X-Requested-With"],
}));
app.options("*", cors());

// Stripe webhook needs raw body
app.use("/api/payments/webhook", express.raw({ type: "application/json" }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
if (process.env.NODE_ENV !== "production") app.use(morgan("dev"));

// ── Rate limiting ──────────────────────────────────────────
app.use("/api/", generalLimiter);
app.use("/api/auth/", authLimiter);
app.use("/api/matching/", aiLimiter);

// ── Health ─────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    version: "2.0.0",
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV ?? "development",
    supabase: !!process.env.SUPABASE_URL,
    anthropic: !!process.env.ANTHROPIC_API_KEY,
    stripe: !!process.env.STRIPE_SECRET_KEY,
  });
});

// ── Routes ─────────────────────────────────────────────────
app.use("/api/auth",          authRouter);
app.use("/api/users",         usersRouter);
app.use("/api/feed",          feedRouter);
app.use("/api/projects",      projectsRouter);
app.use("/api/matching",      matchingRouter);
app.use("/api/collab",        collabRouter);
app.use("/api/credits",       creditsRouter);
app.use("/api/messages",      messagingRouter);
app.use("/api/notifications", notificationsRouter);
app.use("/api/payments",      paymentsRouter);
app.use("/api/workspace",     workspaceRouter);
app.use("/api/upload",        uploadRouter);
app.use("/api/analytics",     analyticsRouter);

// ── 404 ────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Not found: ${req.method} ${req.path}` });
});

// ── Error handler ──────────────────────────────────────────
app.use(errorHandler);

// ── Start ──────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT ?? "3001", 10);
httpServer.listen(PORT, "0.0.0.0", () => {
  console.log("\n╔══════════════════════════════════════════╗");
  console.log(`║  TechIT Network API v2.0                 ║`);
  console.log(`║  http://localhost:${PORT}                   ║`);
  console.log(`║  Supabase : ${(process.env.SUPABASE_URL      ? "Connected   " : "NOT SET     ")}                ║`);
  console.log(`║  Anthropic: ${(process.env.ANTHROPIC_API_KEY ? "Connected   " : "NOT SET     ")}                ║`);
  console.log(`║  Stripe   : ${(process.env.STRIPE_SECRET_KEY ? "Connected   " : "NOT SET     ")}                ║`);
  console.log("╚══════════════════════════════════════════╝\n");
});

export default app;
