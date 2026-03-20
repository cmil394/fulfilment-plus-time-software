import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import * as timeEntryController from "../controllers/time-entry.controller";

const router = Router();

router.use(authMiddleware);

router.get("/time-entries", timeEntryController.getMyEntries);
router.post("/time-entries/start", timeEntryController.startTimer);
router.get("/time-entries/active", timeEntryController.getActiveTimer);
router.patch("/time-entries/active/stop", timeEntryController.stopTimer);
router.get("/time-entries/user/:userId", timeEntryController.getEntriesByUser);
router.get(
  "/time-entries/customer/:customerId",
  timeEntryController.getEntriesByCustomer,
);
router.delete("/time-entries", timeEntryController.deleteAllEntries);
router.delete(
  "/time-entries/user/:userId",
  timeEntryController.deleteEntriesByUser,
);
router.delete(
  "/time-entries/customer/:customerId",
  timeEntryController.deleteEntriesByCustomer,
);

router.post("/time-entries/admin/create", timeEntryController.adminCreateEntry);

export default router;
