import { Router } from "express";
import { authMiddleware, adminMiddleware } from "../middleware/auth.middleware";
import * as timeEntryController from "../controllers/time-entry.controller";
import { readLimiter, writeLimiter } from "../middleware/rate-limiting.middleware";

const router = Router();

router.use(authMiddleware);

// Timer(auth)
router.post("/time-entries/start", authMiddleware, writeLimiter, timeEntryController.startTimer);
router.patch("/time-entries/active/stop", authMiddleware, writeLimiter, timeEntryController.stopTimer);
router.get("/time-entries/active", authMiddleware, readLimiter, timeEntryController.getActiveTimer);

// User(auth)
router.get("/time-entries", authMiddleware, readLimiter, timeEntryController.getMyEntries);

// Admin
router.get("/time-entries/user/:userId", adminMiddleware, readLimiter, timeEntryController.getEntriesByUser);
router.get("/time-entries/customer/:customerId", adminMiddleware, readLimiter, timeEntryController.getEntriesByCustomer);
router.get("/time-entries/active/all", adminMiddleware, readLimiter, timeEntryController.getAllActiveTimers);
router.patch("/time-entries/active/stop-all", adminMiddleware, writeLimiter, timeEntryController.adminStopAllTimers);
router.patch("/time-entries/user/:userId/stop", adminMiddleware, writeLimiter, timeEntryController.adminStopTimer);
router.get("/time-entries/:entryId", adminMiddleware, readLimiter, timeEntryController.getEntryById);
router.post("/time-entries/admin/create", adminMiddleware, writeLimiter, timeEntryController.adminCreateEntry);
router.patch("/time-entries/:entryId", authMiddleware, writeLimiter, timeEntryController.updateEntry);
router.delete("/time-entries/:entryId", authMiddleware, writeLimiter, timeEntryController.deleteEntry);
router.delete("/time-entries/user/:userId", adminMiddleware, writeLimiter, timeEntryController.deleteEntriesByUser);
router.delete("/time-entries/customer/:customerId", adminMiddleware, writeLimiter, timeEntryController.deleteEntriesByCustomer);

export default router;