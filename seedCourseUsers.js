const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const { loginCredentials } = require("./testing/test-data/course-data");
const User = require("./src/models/user");

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("Missing MONGODB_URI in environment. Aborting seeding.");
  process.exit(1);
}

const seedUsers = [
  {
    name: "Course Admin",
    state: "Victoria",
    active: true,
    ...loginCredentials.admin,
  },
  {
    name: "Course Jobseeker",
    state: "New South Wales",
    active: true,
    ...loginCredentials.jobseeker,
  },
  {
    name: "Course Employer",
    state: "Queensland",
    active: true,
    ...loginCredentials.employer,
  },
];

async function upsertUser(user) {
  const hashedPassword = await bcrypt.hash(user.password, 12);
  return User.findOneAndUpdate(
    { email: user.email },
    { ...user, password: hashedPassword },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

async function seedCourseUsers() {
  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    for (const user of seedUsers) {
      const doc = await upsertUser(user);
      console.log(`Seeded ${doc.role} user: ${doc.email}`);
    }
  } catch (error) {
    console.error("Failed to seed course users:", error);
  } finally {
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  seedCourseUsers()
    .then(() => {
      console.log("Course user seeding complete.");
      process.exit(0);
    })
    .catch(() => {
      process.exit(1);
    });
}

module.exports = { seedCourseUsers };