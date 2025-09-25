const express = require("express");
const mongoose = require("mongoose");
const path = require("path");

const { authenticate, authorize } = require("./middleware/authMiddleware");
const userRoutes = require("./routes/userRoutes");
const jobRoutes = require("./routes/jobRoutes");
const jobPreferenceRoutes = require("./routes/jobPreferenceRoutes");
const courseRoutes = require("./routes/courseRoutes");
const adminUserRoutes = require("./routes/adminUserRoutes");

const app = express();
const DEFAULT_PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use(express.static(path.join(__dirname, "src/public")));
app.use(express.static(path.join(__dirname, "src/views/components")));
app.use(express.static(path.join(__dirname, "views")));
app.use(express.static("public"));

// Pages
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "login.html"));
});

app.get("/job-post", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "job-post.html"));
});

app.get("/category-counts", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "category-counts.html"));
});

app.get("/job-preferences", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "job-preferences.html"));
});

app.get("/job-apply", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "job-apply.html"));
});

app.get("/courses", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "courses.html"));
});

app.get("/job-edit", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "job-edit.html"));
});

// Admin-only manage courses page
app.get("/courses/manage", authenticate, authorize("admin"), (req, res) => {
  res.sendFile(path.join(__dirname, "views", "courses.html"));
});

// API routes
app.use("/api/users", userRoutes);
app.use("/api", jobRoutes);
app.use("/api/job-preferences", jobPreferenceRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/admin", adminUserRoutes);

async function connectToDatabase(uri) {
  if (!uri) {
    throw new Error("MONGODB_URI is not defined");
  }

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(uri);
  }

  return mongoose.connection;
}

async function startServer(port = DEFAULT_PORT) {
  const uri = process.env.MONGODB_URI;
  await connectToDatabase(uri);

  return app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
    if (mongoose.connection.db) {
      console.log("MongoDB connected to:", mongoose.connection.db.databaseName);
    }
  });
}

if (require.main === module) {
  require("dotenv").config();
  startServer().catch((error) => {
    console.error("Failed to start server:", error);
    mongoose.disconnect().catch(() => undefined);
    process.exit(1);
  });
}

module.exports = app;
module.exports.connectToDatabase = connectToDatabase;
module.exports.startServer = startServer;
