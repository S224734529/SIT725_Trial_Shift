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
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await User.findById(req.user.id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check for pending profile update request
    const pendingRequest = await ProfileUpdateRequest.findOne({
      user: req.user.id,
      status: "pending",
    });

    // Ensure pendingApproval flag is always returned
    const userObj = user.toObject();
    userObj.pendingApproval = !!pendingRequest;

    return res.status(200).json(userObj);
  } catch (err) {
    console.error("Get profile error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};


// Update profile (requires admin approval)
exports.updateProfile = async (req, res) => {
  try {
    if (req.user.role === "admin") {
      return res.status(403).json({ message: "Admins cannot update profile." });
    }

    const { name, state, profilePic } = req.body;

    // Validate input
    const updates = {};
    if (name) updates.name = name;
    if (state) {
      if (typeof state !== "string") {
        return res.status(400).json({ message: "Invalid data format" });
      }
      updates.state = state;
    }
    if (profilePic) updates.profilePic = profilePic;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "No valid fields provided" });
    }

    // Save pending update to user
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { pendingApproval: updates },
      { new: true }
    );

    if (!user) {
      return res.status(401).json({ error: "User not found" }); 
    }

    // Create a profile update request
    await ProfileUpdateRequest.create({
      user: req.user.id,
      updates,
      status: "pending",
    });

    res.status(200).json({ message: "Profile update submitted for admin approval." });
  } catch (err) {
    console.error("Update error:", err);
    res.status(500).json({ message: "Update failed." });
  }
};

// Upload profile picture
exports.uploadProfilePic = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const fileUrl = req.file.path || `/uploads/${req.file.originalname}`;

    return res.status(200).json({ url: fileUrl });
  } catch (err) {
    console.error("Upload error:", err);
    return res
      .status(500)
      .json({ message: "Image upload failed due to a server error" });
  }
};


// Delete profile picture
exports.deleteProfilePicture = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (req.user.role === "admin") {
      return res
        .status(403)
        .json({ message: "Admins cannot update profile." });
    }

    const updated = await User.findByIdAndUpdate(
      req.user.id,
      { $unset: { profilePic: "" } },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({ message: "Profile picture deleted." });
  } catch (err) {
    console.error("Delete picture error:", err);
    return res.status(500).json({ message: "Failed to delete picture." });
  }
};
