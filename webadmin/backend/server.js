import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";
import rootRouter from "./src/routers/root.router.js";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3069);

app.use(
  helmet({
    crossOriginResourcePolicy: false,
    contentSecurityPolicy: false,
  }),
);

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
    message: "Too many requests from this IP, please try again later.",
  }),
);

app.use(express.json({ limit: "1mb" }));
const allowedOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsOptions = {
  origin: (requestOrigin, callback) => {
    if (!requestOrigin || allowedOrigins.includes(requestOrigin)) {
      return callback(null, true);
    }
    return callback(new Error("Origin không được phép bởi CORS."));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));

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
});

app.set("io", io);

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
  console.log("Client connected via socket:", socket.id);
  
  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

httpServer.listen(PORT, () => {
  console.log(`License backend is running on http://localhost:${PORT}`);
});
