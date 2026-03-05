const express = require('express');
const router = express.Router();
const { getProductions, createProduction, checkMaterialAvailability } = require('../controllers/productionController');
const { protect, authorize } = require('../middleware/auth');

router.route('/')
    .get(protect, getProductions)
    .post(protect, authorize('admin', 'production_manager'), createProduction);

router.post('/check', protect, checkMaterialAvailability);

module.exports = router;
