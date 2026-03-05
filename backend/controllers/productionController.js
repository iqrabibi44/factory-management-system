const Production = require('../models/Production');
const ProductModel = require('../models/ProductModel');
const RawMaterial = require('../models/RawMaterial');
const FinishedGood = require('../models/FinishedGood');

// @desc    Get all production records
// @route   GET /api/production
const getProductions = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const total = await Production.countDocuments();
        const productions = await Production.find({})
            .populate({ path: 'model', populate: { path: 'product', select: 'name category' } })
            .populate('materialsUsed.rawMaterial', 'name unit')
            .populate('createdBy', 'name')
            .sort({ date: -1 })
            .skip(skip).limit(limit);
        res.json({ productions, total, page, pages: Math.ceil(total / limit) });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create production order
// @route   POST /api/production
// Logic: Check BOM, verify raw material stock, deduct materials, add finished goods
const createProduction = async (req, res) => {
    try {
        const { model: modelId, quantity, notes } = req.body;

        // Get model with BOM
        const model = await ProductModel.findById(modelId).populate('bom.rawMaterial');
        if (!model) return res.status(404).json({ message: 'Model not found' });
        if (!model.bom || model.bom.length === 0) {
            return res.status(400).json({ message: 'No BOM defined for this model. Please define BOM first.' });
        }

        // Check raw material availability
        const materialsUsed = [];
        const insufficientMaterials = [];

        for (const bomItem of model.bom) {
            const required = bomItem.quantity * quantity;
            const material = await RawMaterial.findById(bomItem.rawMaterial._id);
            if (!material || material.quantity < required) {
                insufficientMaterials.push({
                    name: bomItem.rawMaterial.name,
                    required,
                    available: material ? material.quantity : 0,
                });
            } else {
                materialsUsed.push({ rawMaterial: bomItem.rawMaterial._id, quantity: required });
            }
        }

        if (insufficientMaterials.length > 0) {
            return res.status(400).json({
                message: 'Insufficient raw materials',
                insufficientMaterials,
            });
        }

        // Deduct raw materials
        for (const item of materialsUsed) {
            await RawMaterial.findByIdAndUpdate(item.rawMaterial, { $inc: { quantity: -item.quantity } });
        }

        // Add to finished goods
        await FinishedGood.findOneAndUpdate(
            { model: modelId },
            { $inc: { quantity } },
            { upsert: true, new: true }
        );

        // Save production record
        const totalManufacturingCost = model.manufacturingCost * quantity;
        const production = await Production.create({
            model: modelId,
            quantity,
            materialsUsed,
            totalManufacturingCost,
            notes,
            status: 'completed',
            createdBy: req.user._id,
        });

        const populated = await Production.findById(production._id)
            .populate({ path: 'model', populate: { path: 'product', select: 'name category' } })
            .populate('materialsUsed.rawMaterial', 'name unit');

        res.status(201).json(populated);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Check material availability for a production order (preview)
// @route   POST /api/production/check
const checkMaterialAvailability = async (req, res) => {
    try {
        const { model: modelId, quantity } = req.body;
        const model = await ProductModel.findById(modelId).populate('bom.rawMaterial');
        if (!model) return res.status(404).json({ message: 'Model not found' });

        const availability = model.bom.map(bomItem => {
            const required = bomItem.quantity * quantity;
            const available = bomItem.rawMaterial.quantity;
            return {
                name: bomItem.rawMaterial.name,
                unit: bomItem.rawMaterial.unit,
                required,
                available,
                sufficient: available >= required,
            };
        });

        const canProduce = availability.every(a => a.sufficient);
        res.json({ canProduce, availability });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getProductions, createProduction, checkMaterialAvailability };
