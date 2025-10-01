// src/controllers/jobController.test.js
const jobController = require('./jobController');

describe('Job Controller Tests', () => {
  test('should create a new job', async () => {
    const req = {
      body: {
        title: 'Test Job',
        description: 'A test job description', // Included but not returned
        category: 'Test Category',
        employerId: '123',
        location: 'Test Location',
        shiftDetails: 'Test Shift Details',
      },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    await jobController.createJob(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Test Job',
      location: 'Test Location',
      shiftDetails: 'Test Shift Details',
    }));
  });
});