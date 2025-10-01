const User = require("../models/user");
const jwt = require("jsonwebtoken");

// Get all users (admin only)
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find({ role: { $ne: "admin" } }).select("-password");
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch users." });
  }
};

// Delete a user permanently (admin only)
exports.deleteUser = async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: "User deleted." });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete user." });
  }
};

// Toggle user active/inactive (admin only)
exports.toggleUserActive = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "No token provided" });
    }

    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Admins only" });
    }

    const userId = req.params.id;
    const { active } = req.body;

    if (typeof active !== "boolean") {
      return res.status(400).json({ message: "Invalid value for active" });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { active },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ message: "User status updated." });
  } catch (err) {
    console.error("Toggle user active error:", err);
    res.status(500).json({ message: "Failed to update user status." });
  }
};


// Bulk delete users (admin only)
exports.bulkDeleteUsers = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: "No user IDs provided." });
    }
    await User.deleteMany({ _id: { $in: ids } });
    res.json({ message: "Selected users deleted." });
  } catch (err) {
    res.status(500).json({ message: "Failed to bulk delete users." });
  }
};