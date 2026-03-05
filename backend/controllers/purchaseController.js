const Purchase = require('../models/Purchase');
const RawMaterial = require('../models/RawMaterial');

// @desc    Get all purchases
// @route   GET /api/purchases
const getPurchases = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const total = await Purchase.countDocuments();
        const purchases = await Purchase.find({})
            .populate('items.rawMaterial', 'name unit')
            .populate('createdBy', 'name')
            .sort({ date: -1 })
            .skip(skip).limit(limit);
        res.json({ purchases, total, page, pages: Math.ceil(total / limit) });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get single purchase
// @route   GET /api/purchases/:id
const getPurchase = async (req, res) => {
    try {
        const purchase = await Purchase.findById(req.params.id)
            .populate('items.rawMaterial', 'name unit')
            .populate('createdBy', 'name');
        if (!purchase) return res.status(404).json({ message: 'Purchase not found' });
        res.json(purchase);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create purchase and update raw material stock
// @route   POST /api/purchases
const createPurchase = async (req, res) => {
    try {
        const { supplier, date, items, notes } = req.body;

        // Validate all raw materials exist
        for (const item of items) {
            const material = await RawMaterial.findById(item.rawMaterial);
            if (!material) return res.status(404).json({ message: `Raw material not found: ${item.rawMaterial}` });
        }

        // Create purchase record
        const purchase = await Purchase.create({
            supplier, date, items, notes,
            createdBy: req.user._id,
        });

        // Update raw material stock quantities
        for (const item of items) {
            await RawMaterial.findByIdAndUpdate(item.rawMaterial, {
                $inc: { quantity: item.quantity },
            });
        }

        const populated = await Purchase.findById(purchase._id).populate('items.rawMaterial', 'name unit');
        res.status(201).json(populated);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete purchase
// @route   DELETE /api/purchases/:id
const deletePurchase = async (req, res) => {
    try {
        const purchase = await Purchase.findByIdAndDelete(req.params.id);
        if (!purchase) return res.status(404).json({ message: 'Purchase not found' });
        res.json({ message: 'Purchase deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getPurchases, getPurchase, createPurchase, deletePurchase };
