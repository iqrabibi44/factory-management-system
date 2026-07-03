const Purchase = require('../models/Purchase');
const RawMaterial = require('../models/RawMaterial');
const Vendor = require('../models/Vendor');
const InventoryBatch = require('../models/InventoryBatch');

// @desc    Get all purchases
// @route   GET /api/purchases
const getPurchases = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const total = await Purchase.countDocuments();
        const purchases = await Purchase.find({})
            .populate('vendor', 'name companyName mobile address ntn paymentTerms')
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
            .populate('vendor', 'name companyName mobile address ntn paymentTerms')
            .populate('items.rawMaterial', 'name unit')
            .populate('createdBy', 'name');
        if (!purchase) return res.status(404).json({ message: 'Purchase not found' });
        res.json(purchase);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create purchase and update raw material stock + batches + weighted average costs
// @route   POST /api/purchases
const createPurchase = async (req, res) => {
    try {
        const { vendor: vendorId, supplier, invoiceNo, date, items, amountPaid, notes } = req.body;

        // If vendorId is provided, validate it exists
        if (vendorId) {
            const vendorExists = await Vendor.findById(vendorId);
            if (!vendorExists) return res.status(404).json({ message: 'Vendor not found' });
        }

        // Validate all raw materials exist
        for (const item of items) {
            const material = await RawMaterial.findById(item.rawMaterial);
            if (!material) return res.status(404).json({ message: `Raw material not found: ${item.rawMaterial}` });
        }

        // Determine display supplier name (from vendor or plain text)
        let supplierName = supplier;
        if (vendorId) {
            const v = await Vendor.findById(vendorId);
            supplierName = v.name;
        }

        // Create purchase record
        const purchase = await Purchase.create({
            vendor: vendorId || null,
            supplier: supplierName,
            invoiceNo,
            date: date || new Date(),
            items,
            amountPaid: Number(amountPaid || 0),
            notes,
            createdBy: req.user._id,
        });

        // Update raw material stock quantities, create inventory batches, and compute average costs
        for (const item of items) {
            // Create a new inventory batch for this raw material
            const batch = await InventoryBatch.create({
                rawMaterial: item.rawMaterial,
                batchNumber: item.batchNumber,
                purchaseDate: date || new Date(),
                quantityPurchased: Number(item.quantity),
                remainingQuantity: Number(item.quantity),
                purchaseRate: Number(item.rate),
            });

            // Calculate the weighted average cost across all available batches for this raw material
            const activeBatches = await InventoryBatch.find({
                rawMaterial: item.rawMaterial,
                remainingQuantity: { $gt: 0 }
            });

            const totalRemaining = activeBatches.reduce((sum, b) => sum + b.remainingQuantity, 0);
            const totalCost = activeBatches.reduce((sum, b) => sum + (b.remainingQuantity * b.purchaseRate), 0);
            const weightedAverageCost = totalRemaining > 0 ? (totalCost / totalRemaining) : Number(item.rate);

            // Update main raw material quantity and costPerUnit
            const roundedAverageCost = Math.round(weightedAverageCost * 100) / 100;
            await RawMaterial.findByIdAndUpdate(item.rawMaterial, {
                quantity: totalRemaining,
                costPerUnit: roundedAverageCost
            });

            // Store average cost on the batch record
            batch.averageInventoryCost = roundedAverageCost;
            await batch.save();
        }

        const populated = await Purchase.findById(purchase._id)
            .populate('vendor', 'name companyName mobile address ntn paymentTerms')
            .populate('items.rawMaterial', 'name unit');
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
        
        // Also remove corresponding inventory batches created by this purchase items
        for (const item of purchase.items) {
            await InventoryBatch.deleteMany({
                rawMaterial: item.rawMaterial,
                batchNumber: item.batchNumber,
                quantityPurchased: item.quantity
            });

            // Re-calculate average cost for raw material
            const activeBatches = await InventoryBatch.find({
                rawMaterial: item.rawMaterial,
                remainingQuantity: { $gt: 0 }
            });
            const totalRemaining = activeBatches.reduce((sum, b) => sum + b.remainingQuantity, 0);
            const totalCost = activeBatches.reduce((sum, b) => sum + (b.remainingQuantity * b.purchaseRate), 0);
            const weightedAverageCost = totalRemaining > 0 ? (totalCost / totalRemaining) : 0;

            await RawMaterial.findByIdAndUpdate(item.rawMaterial, {
                quantity: totalRemaining,
                costPerUnit: Math.round(weightedAverageCost * 100) / 100
            });
        }

        res.json({ message: 'Purchase deleted and stock updated' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getPurchases, getPurchase, createPurchase, deletePurchase };
