import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { prisma } from "./lib/prisma";
import authRoutes from "./routes/auth.routes";
import customerRoutes from "./routes/customer.routes";
import taskRoutes from "./routes/task.routes";
import timeEntryRoutes from "./routes/time-entry.routes";
import taskTemplateRoutes from "./routes/task-template.routes";
import reportRoutes from "./routes/report.routes";
import { errorHandler } from "./utils/errors";
import path from "path";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3001;

// Middleware
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGIN || "http://localhost:5173",
    credentials: true,
  }),
);
app.use(express.json());

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Backend is running!" });
});

// Routes
app.use("/api", authRoutes);
app.use("/api", customerRoutes);
app.use("/api", taskRoutes);
app.use("/api", timeEntryRoutes);
app.use("/api", taskTemplateRoutes);
app.use("/api", reportRoutes);
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.use(errorHandler);

// Startup
const startServer = async () => {
  try {
    await prisma.$connect();
    console.log("Database connected");


    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error("Startup failure:", error);
    process.exit(1);
  }
};

startServer();
