const jwt = require("jsonwebtoken");
const User = require("../models/user");
const ProfileUpdateRequest = require("../models/profileUpdateRequest");
const cloudinary = require("../config/cloudinary");

// Generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );
};

// Register
exports.register = async (req, res) => {
  try {
    const { name, email, password, role, state } = req.body;

    // prevent admin registration from frontend
    if (role === "admin") {
      return res.status(403).json({ message: "Admin accounts cannot be self-registered" });
    }

    const user = new User({ name, email, password, role, state });
    await user.save();
    res.status(201).json({ message: "User registered successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(400).json({ message: "Invalid credentials" });
    }
    const token = generateToken(user);
    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        state: user.state,
        active: user.active,
        profilePicture: user.profilePicture || null,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get profile
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    // Check for pending profile update request
    const pendingRequest = await ProfileUpdateRequest.findOne({
      user: req.user.id,
      status: "pending"
    });

    // Add a flag to the response
    const userObj = user.toObject();
    userObj.pendingApproval = !!pendingRequest;

    res.json(userObj);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// Update profile (requires admin approval)
exports.updateProfile = async (req, res) => {
  try {
    if (req.user.role === "admin") {
      return res.status(403).json({ message: "Admins cannot update profile." });
    }

    const updates = {
      name: req.body.name,
      state: req.body.state,
      profilePic: req.body.profilePic
    };

    // Save pending update to user
    console.log("Profile update requested:", updates);
    await User.findByIdAndUpdate(req.user.id, { pendingApproval: updates });

    // Create a profile update request
    await ProfileUpdateRequest.create({
      user: req.user.id,
      updates
    });

    res.json({ message: "Profile update submitted for admin approval." });
  } catch (err) {
    res.status(500).json({ message: "Update failed." });
  }
};

// Delete profile picture
exports.deleteProfilePicture = async (req, res) => {
  try {
    if (req.user.role === "admin") {
      return res.status(403).json({ message: "Admins cannot update profile." });
    }

    await User.findByIdAndUpdate(req.user.id, { $unset: { profilePic: "" } });

    res.json({ message: "Profile picture deleted." });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete picture." });
  }
};
