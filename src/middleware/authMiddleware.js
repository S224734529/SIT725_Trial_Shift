const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Authenticate user
exports.authenticate = async (req, res, next) => {
  try {
    let token = null;

    // 1. Read from Authorization header (Bearer token)
    if (req.headers["authorization"]?.startsWith("Bearer ")) {
      token = req.headers["authorization"].split(" ")[1];
    }

    // 2. Fallback - read from cookies
    if (!token && req.headers.cookie) {
      const cookies = Object.fromEntries(
        req.headers.cookie.split(";").map((p) => {
          const i = p.indexOf("=");
          const k = decodeURIComponent(p.slice(0, i).trim());
          const v = decodeURIComponent(p.slice(i + 1));
          return [k, v];
        })
      );
      token = cookies.token || null;
    }

    // 3. No token → Unauthorized
    if (!token) {
      return res.status(401).json({ error: "No token provided" });
    }

    // 4. Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    // 5. Check user still exists
    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    req.user = user; // attach user to request
    next();
  } catch (err) {
    console.error("Auth error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Role-based access control
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Access denied" });
    }
    next();
  };
};
