const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const { register, login, getProfile, updateProfile, deleteProfilePicture, uploadProfilePic } = require("../controllers/userController");
const adminController = require("../controllers/adminController");
const { authenticate, authorize } = require("../middleware/authMiddleware");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "profile_pics",
    allowed_formats: ["jpg", "png", "jpeg"],
    public_id: (req, file) => Date.now() + "-" + file.originalname,
  },
});
const upload = multer({ storage });

// Public
router.post("/register", register);
router.post("/login", login);

// Protected Routes
router.get("/dashboard", authenticate, (req, res) => {
  res.json({ message: `Welcome ${req.user.name}, Role: ${req.user.role}` });
});

// Admin-only
router.get("/admin", authenticate, authorize("admin"), (req, res) => {
  res.json({ message: "Admin dashboard" });
});

// Employer-only
router.get("/employer", authenticate, authorize("employer"), (req, res) => {
  res.json({ message: "Employer dashboard" });
});

// ======================
//  Profile Management
// ======================

// Get profile
router.get("/profile", authenticate, getProfile);

// Update profile (requires admin approval)
router.put("/profile", authenticate, upload.single("profilePic"), updateProfile);

// Delete profile picture
router.delete("/profile/picture", authenticate, deleteProfilePicture);

// Upload profile picture
router.post(
  "/upload/profile-pic",
  authenticate,
  upload.single("file"),
  uploadProfilePic 
);

module.exports = router;
