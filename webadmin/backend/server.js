import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";
import rootRouter from "./src/routers/root.router.js";
import { bootstrapDatabase } from "./src/common/squelize/connect.sequelize.js";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3069);

app.use(
  helmet({
    crossOriginResourcePolicy: false,
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        "default-src": ["'self'"],
        "script-src": ["'self'", "'unsafe-inline'"],
        "script-src-attr": null,
        "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        "font-src": ["'self'", "https://fonts.gstatic.com", "data:"],
        "img-src": ["'self'", "data:", "blob:", "https:"],
        "connect-src": ["'self'", "https:", "wss:", "ws:"],
        "worker-src": ["'self'", "blob:"],
        "frame-src": ["'none'"],
        "object-src": ["'none'"],
      },
    },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
    frameguard: { action: "deny" },
    xssFilter: true,
    noSniff: true,
    permittedCrossDomainPolicies: { policy: "none" },
  }),
);

const defaultOrigins = [
  "https://rductest.vercel.app",
  "https://rduc.onrender.com",
  "http://localhost:5173",
  "http://localhost:3000",
  "http://localhost:3069",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3069",
];

const envOrigins = (process.env.CORS || "")
  .split(",")
  .map((origin) => origin.trim().replace(/\/+$/, ""))
  .filter(Boolean);

const allowedOrigins = Array.from(new Set([...defaultOrigins, ...envOrigins]));

const isOriginAllowed = (origin) => {
  if (!origin) return true;
  const clean = origin.replace(/\/+$/, "");
  if (allowedOrigins.includes(clean)) return true;
  if (/^https?:\/\/localhost(:\d+)?$/.test(clean)) return true;
  if (/^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(clean)) return true;
  if (/\.vercel\.app$/.test(clean)) return true;
  if (/\.onrender\.com$/.test(clean)) return true;
  if (
    clean.startsWith("file://") ||
    clean.startsWith("devtools://") ||
    clean.startsWith("chrome-extension://")
  ) {
    return true;
  }
  return false;
};

const corsOptions = {
  origin: (requestOrigin, callback) => {
    if (isOriginAllowed(requestOrigin)) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 120,
    skip: (req) => req.method === "OPTIONS",
    standardHeaders: true,
    legacyHeaders: false,
    message: "Too many requests from this IP, please try again later.",
  }),
);

app.use(express.json({ limit: "1mb" }));

const releaseDir = path.resolve(process.cwd(), "../../appdesktop/release");

app.get("/health", (req, res) => {
  res.json({ success: true, message: "Backend is running" });
});

app.use("/updates", express.static(releaseDir));
app.get("/updates", (req, res) => {
  res.json({
    success: true,
    message: "Update directory is active.",
    path: releaseDir,
    files: [],
  });
});

app.use("/api", rootRouter);

app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    success: false,
    message: err?.message || "Internal Server Error",
  });
});

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: corsOptions,
  transports: ["polling", "websocket"],
  allowEIO3: true,
  pingTimeout: 30000,
  pingInterval: 25000,
});

app.set("io", io);

io.engine.use((req, res, next) => {
  const origin = (req.headers.origin || req.headers.referer || "").toString();
  if (!isOriginAllowed(origin)) {
    console.warn(
      `[SOCKET.IO] Blocked connection from non-allowed origin: ${origin || "unknown"}`,
    );
    const err = new Error("Origin not allowed");
    err.code = "ORIGIN_DENIED";
    return next(err);
  }
  next();
});

httpServer.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`Backend cannot start: port ${PORT} is already in use.`);
    console.error("Stop the existing backend process or set a different PORT in .env.");
    process.exitCode = 1;
    return;
  }

  console.error("Backend server error:", error);
  process.exitCode = 1;
});

io.on("connection", (socket) => {
  const origin = socket.handshake.headers.origin || socket.handshake.headers.referer || "local";
  const ip =
    socket.handshake.headers["x-forwarded-for"] ||
    socket.handshake.address ||
    socket.conn.remoteAddress ||
    "unknown";
  console.log(`[SOCKET.IO] Client connected id=${socket.id} origin=${origin} ip=${ip}`);
  
  socket.on("disconnect", (reason) => {
    console.log(`[SOCKET.IO] Client disconnected id=${socket.id} reason=${reason}`);
  });
});

await bootstrapDatabase();

httpServer.listen(PORT, () => {
  console.log(`License backend is running on http://localhost:${PORT}`);
});
