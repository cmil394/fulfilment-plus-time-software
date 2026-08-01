import { Router } from "express";
import { authMiddleware, adminMiddleware } from "../middleware/auth.middleware";
import * as timeEntryController from "../controllers/time-entry.controller";
import { readLimiter, writeLimiter } from "../middleware/rate-limiting.middleware";

const router = Router();

// Timer(auth)
router.post("/time-entries/start", authMiddleware, writeLimiter, timeEntryController.startTimer);
router.patch("/time-entries/active/stop", authMiddleware, writeLimiter, timeEntryController.stopTimer);
router.get("/time-entries/active", authMiddleware, readLimiter, timeEntryController.getActiveTimer);

// User(auth)
router.get("/time-entries", authMiddleware, readLimiter, timeEntryController.getMyEntries);

// Admin
router.get("/time-entries/user/:userId", authMiddleware, adminMiddleware, readLimiter, timeEntryController.getEntriesByUser);
router.get("/time-entries/customer/:customerId", authMiddleware, adminMiddleware, readLimiter, timeEntryController.getEntriesByCustomer);
router.get("/time-entries/active/all", authMiddleware, adminMiddleware, readLimiter, timeEntryController.getAllActiveTimers);
router.patch("/time-entries/active/stop-all", authMiddleware, adminMiddleware, writeLimiter, timeEntryController.adminStopAllTimers);
router.patch("/time-entries/user/:userId/stop", authMiddleware, adminMiddleware, writeLimiter, timeEntryController.adminStopTimer);
router.get("/time-entries/:entryId", authMiddleware, adminMiddleware, readLimiter, timeEntryController.getEntryById);
router.post("/time-entries/admin/create", authMiddleware, adminMiddleware, writeLimiter, timeEntryController.adminCreateEntry);
router.patch("/time-entries/:entryId", authMiddleware, writeLimiter, timeEntryController.updateEntry);
router.delete("/time-entries/:entryId", authMiddleware, writeLimiter, timeEntryController.deleteEntry);
router.delete("/time-entries/user/:userId", authMiddleware, adminMiddleware, writeLimiter, timeEntryController.deleteEntriesByUser);
router.delete("/time-entries/customer/:customerId", authMiddleware, adminMiddleware, writeLimiter, timeEntryController.deleteEntriesByCustomer);

export default router;