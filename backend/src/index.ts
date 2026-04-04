import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { prisma } from "./lib/prisma";
import authRoutes from "./routes/auth.routes";
import customerRoutes from "./routes/customer.routes";
import taskRoutes from "./routes/task.routes";
import timeEntryRoutes from "./routes/time-entry.routes";
import taskTemplateRoutes from "./routes/task-template.routes";
import { seedOwner } from "./utils/seed.owner";
import { errorHandler } from "./utils/errors";
import path from "path";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
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
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// Test database connection
app.get("/api/db-test", async (req, res) => {
  try {
    await prisma.$connect();
    res.json({
      status: "success",
      message: "Database connection successful!",
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Database connection failed",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

app.use(errorHandler);

// Startup
const startServer = async () => {
  try {
    await prisma.$connect();
    console.log("Database connected");

    await seedOwner();

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/api/health`);
      console.log(`Auth endpoints: http://localhost:${PORT}/api/auth`);
    });
  } catch (error) {
    console.error("Startup failure:", error);
    process.exit(1);
  }
};

startServer();
