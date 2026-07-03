const express = require('express');
const router = express.Router();
const { getVendors, getVendor, createVendor, updateVendor, deleteVendor } = require('../controllers/vendorController');
const { protect, authorize } = require('../middleware/auth');

router.route('/')
    .get(protect, getVendors)
    .post(protect, authorize('admin', 'store_manager'), createVendor);

router.route('/:id')
    .get(protect, getVendor)
    .put(protect, authorize('admin', 'store_manager'), updateVendor)
    .delete(protect, authorize('admin'), deleteVendor);

module.exports = router;
