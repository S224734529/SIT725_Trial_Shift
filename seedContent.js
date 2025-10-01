require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/user');
const Module = require('./src/models/module');
const bcrypt = require('bcryptjs'); 

const MONGODB_URI = process.env.MONGODB_URI;

const users = [
  {
    name: 'Content_Dev_Admin',
    email: 'content_admin@example.com',
    password: 'admin123',
    role: 'admin',
    state: 'Victoria',
    active: true
  },
  {
    name: 'Content_Job_Seeker',
    email: 'job_seeker@example.com',
    password: 'jobseeker123',
    role: 'jobseeker',
    state: 'New South Wales',
    active: true
  },
  {
    name: 'John Employer',
    email: 'john.employer@example.com',
    password: 'password123',
    role: 'employer',
    state: 'Queensland',
    active: true
  },
  {
    name: 'Sarah Jobseeker',
    email: 'sarah.jobseeker@example.com',
    password: 'password123',
    role: 'jobseeker',
    state: 'Western Australia',
    active: true
  },
  {
    name: 'Mike Manager',
    email: 'mike.manager@example.com',
    password: 'password123',
    role: 'employer',
    state: 'South Australia',
    active: false  
  },
  {
    name: 'Lisa Developer',
    email: 'lisa.developer@example.com',
    password: 'password123',
    role: 'jobseeker',
    state: 'Tasmania',
    active: true
  },
  {
    name: 'David Recruiter',
    email: 'david.recruiter@example.com',
    password: 'password123',
    role: 'employer',
    state: 'Australian Capital Territory',
    active: true
  },
  {
    name: 'Emma Candidate',
    email: 'emma.candidate@example.com',
    password: 'password123',
    role: 'jobseeker',
    state: 'Northern Territory',
    active: false  
  }
];

const modules = [
  {
    title: 'Kitchen Basics',
    description: 'Learn the essentials of kitchen safety and hygiene.',
    assets: [
      { type: 'video', url: 'https://youtu.be/kitchen-basics', title: 'Intro Video', order: 1 },
      { type: 'pdf', url: 'https://example.com/kitchen-basics.pdf', title: 'Kitchen Basics PDF', order: 2 },
    ],
    reactions: [],
    releases: [
      { version: '1.0', notes: 'Initial release' },
    ],
    notifications: [],
  },
  {
    title: 'Accounting Standards',
    description: 'Understand Accounting protocols and standards.',
    assets: [
      { type: 'video', url: 'https://youtu.be/Accounting-standards', title: 'Accounting Video', order: 1 },
      { type: 'text', text: 'Always use gloves and approved Accounting agents.', title: 'Accounting Tips', order: 2 },
    ],
    reactions: [],
    releases: [
      { version: '1.0', notes: 'Initial release' },
    ],
    notifications: [],
  },
];

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI, { 
      useNewUrlParser: true, 
      useUnifiedTopology: true 
    });
    console.log('Connected to MongoDB');

    // Clear existing data (optional - be careful in production!)
    // await User.deleteMany({});
    // await Module.deleteMany({});

    // Upsert users with password hashing
    const userDocs = [];
    for (const user of users) {
      // Hash password before saving
      const hashedPassword = await bcrypt.hash(user.password, 12);
      
      const doc = await User.findOneAndUpdate(
        { email: user.email },
        { ...user, password: hashedPassword },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      userDocs.push(doc);
      console.log(`✓ User created/updated: ${user.name} (${user.role})`);
    }

    // Add reactions and notifications
    if (userDocs.length > 1) {
      modules[0].reactions.push({ user: userDocs[1]._id, type: 'like' });
      modules[0].notifications.push({ 
        user: userDocs[1]._id, 
        message: 'New module released: Kitchen Basics' 
      });
    }

    // Upsert modules
    for (const mod of modules) {
      await Module.findOneAndUpdate(
        { title: mod.title },
        mod,
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      console.log(`✓ Module created/updated: ${mod.title}`);
    }

    console.log('\nDatabase seeding completed successfully!');
    console.log(`Created/Updated: ${userDocs.length} users and ${modules.length} modules`);
    
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

if (require.main === module) {
  seed();
}

module.exports = { seed, users, modules };