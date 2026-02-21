import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import * as timeEntryController from "../controllers/time-entry.controller";

const router = Router();

router.use(authMiddleware);

router.get("/", timeEntryController.getMyEntries);
router.post("/start", timeEntryController.startTimer);
router.get("/active", timeEntryController.getActiveTimer);
router.patch("/active/stop", timeEntryController.stopTimer);

export default router;
