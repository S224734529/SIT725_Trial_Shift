const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const express = require("express");
const mongoose = require("mongoose");

const app = express();
const PORT = process.env.PORT || 3000;

// Admin-only manage courses page
const { authenticate, authorize } = require("./middleware/authMiddleware");

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
  res.sendFile(path.join(__dirname, "views", "/job-apply.html"));
});
app.get("/courses", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "courses.html"));
});
app.get("/job-edit", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "job-edit.html"));
});
app.get("/category-manage", authenticate, authorize("admin"), (req, res) => {
  res.sendFile(path.join(__dirname, "views", "category-manage.html"));
});
app.get("/category-edit", authenticate, authorize("admin"), (req, res) => {
  res.sendFile(path.join(__dirname, "views", "category-edit.html"));
});
app.get("/courses/manage", authenticate, authorize("admin"), (req, res) => {
  res.sendFile(path.join(__dirname, "views", "courses.html"));
});

// API routes
const userRoutes = require("./routes/userRoutes");
app.use("/api/users", userRoutes);
const jobRoutes = require("./routes/jobRoutes");
app.use("/api", jobRoutes);
const jobPreferenceRoutes = require("./routes/jobPreferenceRoutes");
app.use("/api/job-preferences", jobPreferenceRoutes);
const courseRoutes = require("./routes/courseRoutes");
app.use("/api/courses", courseRoutes);
const adminUserRoutes = require("./routes/adminUserRoutes");
app.use("/api/admin", adminUserRoutes);
const adminRoutes = require("./routes/adminRoutes");
app.use("/api/admin", adminRoutes);

// MongoDB connection
mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("MongoDB connected to:", mongoose.connection.db.databaseName);
  })
  .catch((err) => console.error("MongoDB connection error:", err));

let server;
function startServer(port = PORT) {
  if (server) {
    return server;
  }

  server = app.listen(port, () => {
    const address = server.address();
    const resolvedPort = typeof address === "string" ? address : address?.port;
    console.log(`Server running at http://localhost:${resolvedPort ?? port}`);
  });

  app.locals.server = server;
  return server;
}

if (require.main === module) {
  startServer();
}

module.exports = app;
module.exports.startServer = startServer;