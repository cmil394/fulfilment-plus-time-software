import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.routes";
import customerRoutes from "./routes/customer.routes";
import taskRoutes from "./routes/task.routes";
import timeEntryRoutes from "./routes/time-entry.routes";
import taskTemplateRoutes from "./routes/task-template.routes";
import reportRoutes from "./routes/report.routes";
import { errorHandler } from "./utils/errors";
import path from "path";

const app = express();

app.use(
  cors({
    origin: process.env.ALLOWED_ORIGIN || "http://localhost:5173",
    credentials: true,
  }),
);
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Backend is running!" });
});

app.use("/api", authRoutes);
app.use("/api", customerRoutes);
app.use("/api", taskRoutes);
app.use("/api", timeEntryRoutes);
app.use("/api", taskTemplateRoutes);
app.use("/api", reportRoutes);
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.use(errorHandler);

export default app;
