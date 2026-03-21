import { Router } from "express";
import { authMiddleware, adminMiddleware } from "../middleware/auth.middleware";
import * as timeEntryController from "../controllers/time-entry.controller";

const router = Router();

router.use(authMiddleware);

// Timer(auth)
router.post("/time-entries/start", timeEntryController.startTimer);
router.patch("/time-entries/active/stop", timeEntryController.stopTimer);
router.get("/time-entries/active", timeEntryController.getActiveTimer);

// User(auth)
router.get("/time-entries", timeEntryController.getMyEntries);

// Admin
router.get("/time-entries/user/:userId", adminMiddleware, timeEntryController.getEntriesByUser);
router.get("/time-entries/customer/:customerId", adminMiddleware, timeEntryController.getEntriesByCustomer);
router.post("/time-entries/admin/create", adminMiddleware, timeEntryController.adminCreateEntry);
router.delete("/time-entries", adminMiddleware, timeEntryController.deleteAllEntries);
router.delete("/time-entries/user/:userId", adminMiddleware, timeEntryController.deleteEntriesByUser);
router.delete("/time-entries/customer/:customerId", adminMiddleware, timeEntryController.deleteEntriesByCustomer);

export default router;