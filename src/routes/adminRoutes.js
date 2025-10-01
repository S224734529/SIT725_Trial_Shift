const express = require("express");
const router = express.Router();

const adminController = require("../controllers/adminController");
const { authenticate, authorize } = require("../middleware/authMiddleware");

// Profile requests
router.get("/profile-requests", authenticate, authorize("admin"), adminController.getPendingProfileRequests);

// Approve requests
router.put("/profile-requests/:id/approve", authenticate, authorize("admin"), adminController.approveProfileUpdate);

// Decline requests
router.put("/profile-requests/:id/decline", authenticate, authorize("admin"), adminController.declineProfileUpdate);

module.exports = router;