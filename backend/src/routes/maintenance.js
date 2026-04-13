const express = require('express');
const { createRequest, getRequests, updateRequest } = require('../controllers/maintenanceController');
const { authenticate, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

router.get('/', authenticate, getRequests);
router.post('/', authenticate, authorize('tenant'), upload.array('images', 5), createRequest);
router.put('/:id', authenticate, authorize('owner', 'admin'), updateRequest);

module.exports = router;
