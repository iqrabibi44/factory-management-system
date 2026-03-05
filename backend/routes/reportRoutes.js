const express = require('express');
const router = express.Router();
const { getDashboard, getSalesReport, getProductionReport, getFullReport } = require('../controllers/reportController');
const { protect } = require('../middleware/auth');

router.get('/dashboard', protect, getDashboard);
router.get('/sales', protect, getSalesReport);
router.get('/production', protect, getProductionReport);
router.get('/full', protect, getFullReport);

module.exports = router;
