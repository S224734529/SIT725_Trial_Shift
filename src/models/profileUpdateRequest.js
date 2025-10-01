const mongoose = require("mongoose");
const ProfileUpdateRequestSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updates: Object,
    status: { type: String, enum: ["pending", "approved", "declined"], default: "pending" },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reviewedAt: Date,
    requestedAt: { type: Date, default: Date.now },
    reason: String
});
module.exports = mongoose.model("ProfileUpdateRequest", ProfileUpdateRequestSchema);