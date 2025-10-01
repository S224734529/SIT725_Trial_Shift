// unit tests for job creation, updates, and deletions

// jobCrud.spec.js
const request = require('supertest'); // Test HTTP requests to the Express app
const app = require('../src/app'); // Adjust path based on your project structure
const mongoose = require('mongoose');
const Job = require('../../src/models/job');

describe('Job CRUD API', () => {
  let server;

  beforeAll(async () => {
    // Start the server
    server = app.startServer(3001); // Use a different port to avoid conflicts
    await mongoose.connect(process.env.MONGODB_URI_TEST || 'mongodb://localhost/test_db');
  });

 //  cleans up by closing the connection.
  afterAll(async () => {
    await mongoose.connection.close();
    server.close();
  });

   // ensures a clean slate for each test by deleting all jobs.
  beforeEach(async () => 
    {
     await Job.deleteMany(); // Clear the collection before each test
    });

  // Test cases will go here

  //Test Case for Job Creation
  it('should create a new job', async () => {
  const jobData = {
    title: 'Test Job',
    category: 'kitchenhand',
    location: 'Burwood',
    shiftDetails: '8 AM - 4 PM',
  };

  const res = await request(server)
    .post('/api/jobs')
    .send(jobData)
    .expect(201);

  expect(res.body.title).toBe(jobData.title);
  expect(res.body.location).toBe(jobData.location);
  expect(res.body.shiftDetails).toBe(jobData.shiftDetails);

  const job = await Job.findOne({ title: 'Test Job' });
  expect(job).toBeTruthy();
  expect(job.category).toBeDefined();
});
});