const express = require('express');
const router = express.Router();
const { getPurchases, getPurchase, createPurchase, deletePurchase } = require('../controllers/purchaseController');
const { protect, authorize } = require('../middleware/auth');

router.route('/')
    .get(protect, getPurchases)
    .post(protect, authorize('admin', 'store_manager'), createPurchase);

router.route('/:id')
    .get(protect, getPurchase)
    .delete(protect, authorize('admin'), deletePurchase);

module.exports = router;
