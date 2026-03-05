const Sale = require('../models/Sale');
const FinishedGood = require('../models/FinishedGood');
const ProductModel = require('../models/ProductModel');

// @desc    Get all sales
// @route   GET /api/sales
const getSales = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        let query = {};
        if (req.query.search) query.customer = { $regex: req.query.search, $options: 'i' };
        if (req.query.from && req.query.to) {
            query.date = { $gte: new Date(req.query.from), $lte: new Date(req.query.to) };
        }

        const total = await Sale.countDocuments(query);
        const sales = await Sale.find(query)
            .populate({ path: 'items.model', populate: { path: 'product', select: 'name category' } })
            .populate('createdBy', 'name')
            .sort({ date: -1 })
            .skip(skip).limit(limit);
        res.json({ sales, total, page, pages: Math.ceil(total / limit) });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get single sale
// @route   GET /api/sales/:id
const getSale = async (req, res) => {
    try {
        const sale = await Sale.findById(req.params.id)
            .populate({ path: 'items.model', populate: { path: 'product', select: 'name category image' } })
            .populate('createdBy', 'name');
        if (!sale) return res.status(404).json({ message: 'Sale not found' });
        res.json(sale);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create sale and deduct finished goods stock
// @route   POST /api/sales
const createSale = async (req, res) => {
    try {
        const { customer, customerPhone, customerAddress, items, discount, notes } = req.body;

        // Check finished goods availability
        const insufficientGoods = [];
        for (const item of items) {
            const fg = await FinishedGood.findOne({ model: item.model });
            if (!fg || fg.quantity < item.quantity) {
                const model = await ProductModel.findById(item.model).select('name');
                insufficientGoods.push({
                    model: model?.name || item.model,
                    required: item.quantity,
                    available: fg ? fg.quantity : 0,
                });
            }
        }

        if (insufficientGoods.length > 0) {
            return res.status(400).json({ message: 'Insufficient finished goods stock', insufficientGoods });
        }

        // Create sale
        const sale = await Sale.create({
            customer, customerPhone, customerAddress, items, discount, notes,
            createdBy: req.user._id,
        });

        // Deduct finished goods
        for (const item of items) {
            await FinishedGood.findOneAndUpdate({ model: item.model }, { $inc: { quantity: -item.quantity } });
        }

        const populated = await Sale.findById(sale._id)
            .populate({ path: 'items.model', populate: { path: 'product', select: 'name category' } });

        res.status(201).json(populated);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getSales, getSale, createSale };
