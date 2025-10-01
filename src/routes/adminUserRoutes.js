const express = require("express");
const router = express.Router();
const { authenticate, authorize } = require("../middleware/authMiddleware");
const adminUserController = require("../controllers/adminUserController");

// Get all users (admin only)
router.get("/users", authenticate, authorize("admin"), adminUserController.getAllUsers);

// Delete a user permanently (admin only)
router.delete("/users/:id", authenticate, authorize("admin"), adminUserController.deleteUser);

// Toggle user active/inactive (admin only)
router.put("/users/:id/active", authenticate, authorize("admin"), adminUserController.toggleUserActive);

// Bulk delete users (admin only)
router.post("/users/bulk-delete", authenticate, authorize("admin"), adminUserController.bulkDeleteUsers);

module.exports = router;