const express = require('express');
const router = express.Router();
const jobController = require('../controllers/jobController');

// Protect these routes with authentication middleware (to be added later)
router.post('/jobs', jobController.createJob); // route for job post
router.put('/jobs/:id', jobController.updateJob); // route for update
router.delete('/jobs/bulk', jobController.bulkDeleteJobs); // route for bulk delete
router.delete('/jobs/:id', jobController.deleteJob); // route for deleting
router.get('/categories/counts', jobController.getCategoryCounts); // route for category counts

router.post('/jobs/apply', jobController.applyForJob); // route for job application
router.get('/jobs', jobController.getJobs); // route for getting available jobs
router.get('/jobs/employer', jobController.getEmployerJobs); // route for getting employer jobs

// New category routes
router.get('/categories', jobController.getCategories);
router.post('/categories', jobController.createCategory);
router.put('/categories/:id', jobController.updateCategory);
router.delete('/categories/:id', jobController.deleteCategory);

module.exports = router;