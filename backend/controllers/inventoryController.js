const RawMaterial = require('../models/RawMaterial');
const FinishedGood = require('../models/FinishedGood');

// ========== RAW MATERIALS ==========

// @desc    Get all raw materials
// @route   GET /api/inventory/raw-materials
const getRawMaterials = async (req, res) => {
    try {
        const { search, lowStock } = req.query;
        let materials = await RawMaterial.find({}).sort({ name: 1 });
        if (search) materials = materials.filter(m => m.name.toLowerCase().includes(search.toLowerCase()));
        if (lowStock === 'true') materials = materials.filter(m => m.isLowStock);
        res.json(materials);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get single raw material
// @route   GET /api/inventory/raw-materials/:id
const getRawMaterial = async (req, res) => {
    try {
        const material = await RawMaterial.findById(req.params.id);
        if (!material) return res.status(404).json({ message: 'Raw material not found' });
        res.json(material);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create raw material
// @route   POST /api/inventory/raw-materials
const createRawMaterial = async (req, res) => {
    try {
        const material = await RawMaterial.create(req.body);
        res.status(201).json(material);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update raw material
// @route   PUT /api/inventory/raw-materials/:id
const updateRawMaterial = async (req, res) => {
    try {
        const material = await RawMaterial.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!material) return res.status(404).json({ message: 'Raw material not found' });
        res.json(material);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete raw material
// @route   DELETE /api/inventory/raw-materials/:id
const deleteRawMaterial = async (req, res) => {
    try {
        const material = await RawMaterial.findByIdAndDelete(req.params.id);
        if (!material) return res.status(404).json({ message: 'Raw material not found' });
        res.json({ message: 'Raw material deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ========== FINISHED GOODS ==========

// @desc    Get all finished goods
// @route   GET /api/inventory/finished-goods
const getFinishedGoods = async (req, res) => {
    try {
        const goods = await FinishedGood.find({})
            .populate({ path: 'model', populate: { path: 'product', select: 'name category image' } });
        res.json(goods);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getRawMaterials, getRawMaterial, createRawMaterial, updateRawMaterial, deleteRawMaterial,
    getFinishedGoods,
};
