const express = require('express');
const router = express.Router();
const { getCustomers, getCustomer, createCustomer, updateCustomer, deleteCustomer } = require('../controllers/customerController');
const { protect, authorize } = require('../middleware/auth');

router.route('/')
    .get(protect, getCustomers)
    .post(protect, authorize('admin', 'sales_manager'), createCustomer);

router.route('/:id')
    .get(protect, getCustomer)
    .put(protect, authorize('admin', 'sales_manager'), updateCustomer)
    .delete(protect, authorize('admin'), deleteCustomer);

module.exports = router;
