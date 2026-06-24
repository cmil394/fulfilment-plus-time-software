import { Router } from "express";
import cors from "cors";
import { authMiddleware, adminMiddleware } from "../middleware/auth.middleware";
import { readLimiter } from "../middleware/rate-limiting.middleware";
import * as reportController from "../controllers/report.controller";

const router = Router();

// Public endpoint
router.get(
  "/reports/pick-stats",
  cors({ origin: "*" }),
  readLimiter,
  reportController.getPickStats,
);

router.get(
  "/reports/employee/me/summary",
  authMiddleware,
  readLimiter,
  reportController.getEmployeeReportSummary,
);

router.get(
  "/reports/employee/me",
  authMiddleware,
  readLimiter,
  reportController.getEmployeeReport,
);

router.get(
  "/reports/customer/:customerId",
  authMiddleware,
  adminMiddleware,
  readLimiter,
  reportController.getCustomerReport,
);

export default router;
