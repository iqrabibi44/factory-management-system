const express = require('express');
const router = express.Router();
const {
    getProducts, getProduct, createProduct, updateProduct, deleteProduct,
    getProductModels, getAllModels, getModel, createModel, updateModel, deleteModel,
} = require('../controllers/productController');
const { protect, authorize } = require('../middleware/auth');

// Product routes
router.route('/')
    .get(protect, getProducts)
    .post(protect, authorize('admin', 'production_manager'), createProduct);

router.route('/:id')
    .get(protect, getProduct)
    .put(protect, authorize('admin', 'production_manager'), updateProduct)
    .delete(protect, authorize('admin'), deleteProduct);

router.get('/:id/models', protect, getProductModels);

module.exports = router;
