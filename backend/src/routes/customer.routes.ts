import express from "express";
import {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  uploadCustomerAvatar,
  reorderCustomers,
} from "../controllers/customer.controller";
import { authMiddleware, adminMiddleware } from "../middleware/auth.middleware";
import { uploadAvatar } from "../middleware/upload.middleware";
import { readLimiter, writeLimiter, uploadLimiter } from "../middleware/rate-limiting.middleware";

const router = express.Router();

// Get reqs(auth)

router.get("/customers", authMiddleware, readLimiter, getCustomers);
router.get("/customers/:id", authMiddleware, readLimiter, getCustomerById);

// Admin
router.patch("/customers/reorder", authMiddleware, adminMiddleware, writeLimiter, reorderCustomers);
router.post("/customers", authMiddleware, adminMiddleware, uploadAvatar.single("avatar"), createCustomer);
router.patch("/customers/:id", authMiddleware, adminMiddleware, writeLimiter, updateCustomer);
router.delete("/customers/:id", authMiddleware, adminMiddleware, writeLimiter, deleteCustomer);
router.patch("/customers/:id/avatar", authMiddleware, adminMiddleware, uploadAvatar.single("avatar"), uploadLimiter, uploadCustomerAvatar);

export default router;
