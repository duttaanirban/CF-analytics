import express from "express";
import cors from "cors";
import eventRoutes from "./routes/eventRoutes.js";
import mongoose from "mongoose";

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
  })
);

app.use(express.json({ limit: "100kb" }));

app.get("/api/health", (req, res) => {
  const connected = mongoose.connection.readyState === 1;

  res.status(connected ? 200 : 503).json({
    status: connected ? "ok" : "unavailable",
    database: connected ? "connected" : "disconnected",
  });
});

app.use("/api", eventRoutes);

app.use((req, res) => {
  res.status(404).json({
    error: "Route not found",
  });
});

app.use((err, req, res, next) => {
  console.error(err.message);

  const status = err.status || 500;

  res.status(status).json({
    error:
      status === 500
        ? "Internal server error"
        : err.message,
  });
});

export default app;