const express = require('express');
const router = express.Router();
const {
    getActiveSession,
    startSession,
    addSessionEntry,
    endSession,
    reopenSession,
    getProductions,
    getSessionDetail,
    checkMaterialAvailability
} = require('../controllers/productionController');
const { protect, authorize } = require('../middleware/auth');

// Session Operations
router.get('/session/active', protect, getActiveSession);
router.post('/session/start', protect, authorize('admin', 'production_manager'), startSession);
router.post('/session/entry', protect, authorize('admin', 'production_manager'), addSessionEntry);
router.post('/session/end', protect, authorize('admin', 'production_manager'), endSession);
router.post('/session/reopen/:id', protect, authorize('admin'), reopenSession);

// Session Queries
router.get('/sessions', protect, getProductions);
router.get('/session/:id', protect, getSessionDetail);

// Legacy/Compatibility Endpoint
router.post('/check', protect, checkMaterialAvailability);

module.exports = router;
