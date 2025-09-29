const jwt = require("jsonwebtoken");
const User = require("../models/user");
const ProfileUpdateRequest = require("../models/profileUpdateRequest");
const cloudinary = require("../config/cloudinary");
const validator = require("validator");

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

    if (!name || !email || !password || !role || !state) {
      return res.status(400).json({ error: "All fields are required" });
    }

    if (role === "admin") {
      return res
        .status(403)
        .json({ message: "Admin accounts cannot be self-registered" });
    }

    if (!validator.isEmail(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    if (
      !validator.isStrongPassword(password, {
        minLength: 8,
        minLowercase: 1,
        minUppercase: 1,
        minNumbers: 1,
        minSymbols: 1,
      })
    ) {
      return res.status(400).json({
        error:
          "Password must be at least 8 characters long and include uppercase, lowercase, number, and special character",
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res
        .status(409)
        .json({ error: "User with this email already exists" });
    }

    const user = new User({ name, email, password, role, state });
    await user.save();

    res.status(201).json({ message: "User registered successfully" });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = generateToken(user);

    res.status(200).json({
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
    console.error("Login error:", err);
    res.status(500).json({ error: "Internal server error" });
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
