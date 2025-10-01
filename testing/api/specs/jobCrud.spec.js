const request = require('supertest');
const mongoose = require('mongoose');
const Job = require('../../../src/models/job');
const Category = require('../../../src/models/category');

describe('Job CRUD API', () => {
  let app;
  let server;
  let testCategory;
  let testJob;

  beforeAll(async () => {
    app = global.__app;
    server = global.__server;
    
    // Create a test category for job tests
    testCategory = await Category.create({
      name: 'kitchenhand',
      description: 'Kitchen Hand category for testing'
    });
  });

  afterEach(async () => {
    // Clear the jobs collection after each test
    if (mongoose.connection.readyState === 1) {
      await Job.deleteMany({});
    }
  });

  afterAll(async () => {
    // Clean up test category
    if (testCategory) {
      await Category.findByIdAndDelete(testCategory._id);
    }
  });

  describe('POST /api/jobs - Create Job', () => {
    it('should create a new job with valid data', async () => {
      const jobData = {
        title: 'Test Job Creation',
        category: 'kitchenhand',
        location: 'Melbourne',
        shiftDetails: '9 AM - 5 PM'
      };

      const res = await request(app)
        .post('/api/jobs')
        .send(jobData)
        .expect(201);

      expect(res.body.title).toBe(jobData.title);
      expect(res.body.location).toBe(jobData.location);
      expect(res.body.shiftDetails).toBe(jobData.shiftDetails);

      // Verify job was actually saved to database
      const savedJob = await Job.findOne({ title: jobData.title });
      expect(savedJob).toBeTruthy();
      expect(savedJob.category.toString()).toBe(testCategory._id.toString());
    });

    it('should return 400 when required fields are missing', async () => {
      const invalidJobData = {
        title: 'Incomplete Job'
        // Missing category, location, shiftDetails
      };

      const res = await request(app)
        .post('/api/jobs')
        .send(invalidJobData)
        .expect(400);

      expect(res.body).toHaveProperty('message');
    });

    it('should create a new category if it does not exist', async () => {
      const jobData = {
        title: 'Job with New Category',
        category: 'newcategory',
        location: 'Sydney',
        shiftDetails: '10 AM - 6 PM'
      };

      const res = await request(app)
        .post('/api/jobs')
        .send(jobData)
        .expect(201);

      // Check if new category was created
      const newCategory = await Category.findOne({ name: 'newcategory' });
      expect(newCategory).toBeTruthy();

      // Clean up the new category
      await Category.findByIdAndDelete(newCategory._id);
    });
  });

  describe('PUT /api/jobs/:id - Update Job', () => {
    beforeEach(async () => {
      // Create a job to update
      testJob = await Job.create({
        title: 'Original Job Title',
        category: testCategory._id,
        location: 'Original Location',
        shiftDetails: 'Original Shift',
        employerId: '12345'
      });
    });

    it('should update an existing job with valid data', async () => {
      const updateData = {
        title: 'Updated Job Title',
        category: 'kitchenhand',
        location: 'Updated Location',
        shiftDetails: 'Updated Shift Details'
      };

      const res = await request(app)
        .put(`/api/jobs/${testJob._id}`)
        .send(updateData)
        .expect(200);

      expect(res.body.title).toBe(updateData.title);
      expect(res.body.location).toBe(updateData.location);
      expect(res.body.shiftDetails).toBe(updateData.shiftDetails);

      // Verify job was updated in database
      const updatedJob = await Job.findById(testJob._id);
      expect(updatedJob.title).toBe(updateData.title);
    });

    it('should return 404 when updating non-existent job', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const updateData = {
        title: 'Updated Title',
        category: 'kitchenhand',
        location: 'Location',
        shiftDetails: 'Shift'
      };

      const res = await request(app)
        .put(`/api/jobs/${fakeId}`)
        .send(updateData)
        .expect(404);

      expect(res.body).toHaveProperty('message', 'Job not found or unauthorized');
    });
  });

  describe('DELETE /api/jobs/:id - Delete Job', () => {
    beforeEach(async () => {
      // Create a job to delete
      testJob = await Job.create({
        title: 'Job to Delete',
        category: testCategory._id,
        location: 'Test Location',
        shiftDetails: 'Test Shift',
        employerId: '12345'
      });
    });

    it('should delete an existing job', async () => {
      const res = await request(app)
        .delete(`/api/jobs/${testJob._id}`)
        .expect(200);

      expect(res.body).toHaveProperty('message', 'Job deleted successfully');

      // Verify job was deleted from database
      const deletedJob = await Job.findById(testJob._id);
      expect(deletedJob).toBeNull();
    });

    it('should return 404 when deleting non-existent job', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      const res = await request(app)
        .delete(`/api/jobs/${fakeId}`)
        .expect(404);

      expect(res.body).toHaveProperty('message', 'Job not found or unauthorized');
    });
  });

  describe('GET /api/jobs - Get Jobs', () => {
    beforeEach(async () => {
      // Create multiple test jobs
      await Job.create([
        {
          title: 'Job 1',
          category: testCategory._id,
          location: 'Melbourne',
          shiftDetails: 'Shift 1',
          employerId: '12345'
        },
        {
          title: 'Job 2',
          category: testCategory._id,
          location: 'Sydney',
          shiftDetails: 'Shift 2',
          employerId: '12345'
        }
      ]);
    });

    it('should get all jobs for employer', async () => {
      const res = await request(app)
        .get('/api/jobs')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(2);
      expect(res.body[0]).toHaveProperty('title');
      expect(res.body[0]).toHaveProperty('category');
      expect(res.body[0]).toHaveProperty('location');
    });
  });

  describe('GET /api/jobs/employer - Get Employer Jobs', () => {
    beforeEach(async () => {
      // Create jobs for employer
      await Job.create({
        title: 'Employer Job',
        category: testCategory._id,
        location: 'Employer Location',
        shiftDetails: 'Employer Shift',
        employerId: '12345'
      });
    });

    it('should get employer-specific jobs', async () => {
      const res = await request(app)
        .get('/api/jobs/employer')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0]).toHaveProperty('title');
      expect(res.body[0]).toHaveProperty('location');
      expect(res.body[0]).toHaveProperty('shiftDetails');
    });
  });
});