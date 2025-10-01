const express = require('express');
const multer = require('multer');
const path = require('path');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');
const router = express.Router();
const courseController = require('../controllers/courseController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

const assetStorage = new CloudinaryStorage({
  cloudinary,
  params: (req, file) => {
    const isPdf = file.mimetype === 'application/pdf';
    const baseName = path.parse(file.originalname).name.replace(/[^a-zA-Z0-9-_]/g, '-');
    const params = {
      folder: 'course_assets',
      resource_type: isPdf ? 'raw' : 'image',
      public_id: `course-${Date.now()}-${baseName}`,
    };
    if (isPdf) params.format = 'pdf';
    return params;
  },
});

const uploadAsset = multer({
  storage: assetStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

const maybeUploadAsset = (req, res, next) => {
  const contentType = req.headers['content-type'] || '';
  if (contentType.includes('multipart/form-data')) {
    uploadAsset.single('file')(req, res, (err) => {
      if (err) return next(err);
      next();
    });
  } else {
    next();
  }
};

// Admin: Create a new module
router.post('/modules', authenticate, authorize('admin'), courseController.createModule);

// Admin: Upload assets to a module
router.post(
  '/modules/:id/assets',
  authenticate,
  authorize('admin'),
  maybeUploadAsset,
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

// Admin: Remove a specific asset
router.delete(
  '/modules/:id/assets/:assetId',
  authenticate,
  authorize('admin'),
  courseController.deleteAsset
);

module.exports = router;
