const express = require('express');
const router = express.Router();
const {
    getRawMaterials, getRawMaterial, createRawMaterial, updateRawMaterial, deleteRawMaterial,
    getFinishedGoods,
} = require('../controllers/inventoryController');
const { protect, authorize } = require('../middleware/auth');

// Raw Materials
router.route('/raw-materials')
    .get(protect, getRawMaterials)
    .post(protect, authorize('admin', 'store_manager'), createRawMaterial);

router.route('/raw-materials/:id')
    .get(protect, getRawMaterial)
    .put(protect, authorize('admin', 'store_manager'), updateRawMaterial)
    .delete(protect, authorize('admin'), deleteRawMaterial);

// Finished Goods
router.get('/finished-goods', protect, getFinishedGoods);

module.exports = router;
