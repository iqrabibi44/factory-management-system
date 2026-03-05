const express = require('express');
const router = express.Router();
const {
    getAllModels, getModel, createModel, updateModel, deleteModel,
} = require('../controllers/productController');
const { protect, authorize } = require('../middleware/auth');

router.route('/')
    .get(protect, getAllModels)
    .post(protect, authorize('admin', 'production_manager'), createModel);

router.route('/:id')
    .get(protect, getModel)
    .put(protect, authorize('admin', 'production_manager'), updateModel)
    .delete(protect, authorize('admin'), deleteModel);

module.exports = router;
