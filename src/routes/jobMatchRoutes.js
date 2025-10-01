const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');
const ctrl = require('../controllers/jobMatchController');

router.get('/match', authenticate, ctrl.match);

module.exports = router;