const express = require('express');
const router = express.Router();
const {
    getDashboard,
    getSalesReport,
    getProductionReport,
    getBatchesReport,
    getWasteReport,
    getValuationReport,
    getFullReport
} = require('../controllers/reportController');
const { protect } = require('../middleware/auth');

router.get('/dashboard', protect, getDashboard);
router.get('/sales', protect, getSalesReport);
router.get('/production', protect, getProductionReport);
router.get('/batches', protect, getBatchesReport);
router.get('/waste', protect, getWasteReport);
router.get('/valuation', protect, getValuationReport);
router.get('/full', protect, getFullReport);

module.exports = router;
