import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";
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
app.use(cors({ origin: true, credentials: true }));

app.get("/health", (req, res) => {
  res.json({ success: true, message: "Backend is running" });
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
  cors: { origin: true, credentials: true },
});

app.set("io", io);

io.on("connection", (socket) => {
  console.log("Client connected via socket:", socket.id);
  
  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

httpServer.listen(PORT, () => {
  console.log(`License backend is running on http://localhost:${PORT}`);
});
