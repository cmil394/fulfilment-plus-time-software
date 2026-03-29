import express from "express";
import {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  uploadCustomerAvatar,
} from "../controllers/customer.controller";
import { authMiddleware, adminMiddleware } from "../middleware/auth.middleware";
import { uploadAvatar } from "../middleware/upload.middleware";

const router = express.Router();

// Get reqs(auth)

router.get("/customers", authMiddleware, getCustomers);
router.get("/customers/:id", authMiddleware, getCustomerById);

// Admin
router.post("/customers", authMiddleware, adminMiddleware, createCustomer);
router.patch("/customers/:id", authMiddleware, adminMiddleware, updateCustomer);
router.delete("/customers/:id", authMiddleware, adminMiddleware, deleteCustomer,);
router.patch("/customers/:id/avatar", authMiddleware, uploadAvatar.single("avatar"), uploadCustomerAvatar,);

export default router;
