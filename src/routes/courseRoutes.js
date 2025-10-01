const express = require('express');
const router = express.Router();
const courseController = require('../controllers/courseController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

// Admin: Create a new module
router.post('/modules', authenticate, authorize('admin'), courseController.createModule);

// Admin: Upload assets to a module
router.post(
	'/modules/:id/assets',
	authenticate,
	authorize('admin'),
	courseController.uploadAssets
);

// Users: Fetch all modules
router.get('/modules', authenticate, courseController.getModules);

// Admin: Bulk operations
router.delete('/modules/bulk-delete', authenticate, authorize('admin'), courseController.bulkDeleteCourses);
router.patch('/modules/bulk-archive', authenticate, authorize('admin'), courseController.bulkArchiveModules);

// Users: Fetch module details and assets
router.get('/modules/:id', authenticate, courseController.getModuleById);

// Admin: Delete a module
router.delete('/modules/:id', authenticate, authorize('admin'), courseController.deleteModule);

// Admin: Update or archive a module
router.patch('/modules/:id', authenticate, authorize('admin'), courseController.updateModule);

module.exports = router;
