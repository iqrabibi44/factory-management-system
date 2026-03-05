const express = require('express');
const router = express.Router();
const { getSales, getSale, createSale } = require('../controllers/salesController');
const { protect, authorize } = require('../middleware/auth');

router.route('/')
    .get(protect, getSales)
    .post(protect, authorize('admin', 'sales_manager'), createSale);

router.get('/:id', protect, getSale);

module.exports = router;
