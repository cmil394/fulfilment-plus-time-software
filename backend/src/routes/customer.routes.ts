import express from "express";
import {
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getCustomers,
  getCustomerById,
} from "../controllers/customer.controller";

import { authMiddleware, adminMiddleware } from "../middleware/auth.middleware";

const router = express.Router();

// Admin-only routes
router.post("/", authMiddleware, adminMiddleware, createCustomer);
router.patch("/:id", authMiddleware, adminMiddleware, updateCustomer);
router.delete("/:id", authMiddleware, adminMiddleware, deleteCustomer);

// Read routes (accessible to authenticated users)
router.get("/", authMiddleware, getCustomers);
router.get("/:id", authMiddleware, getCustomerById);

export default router;
