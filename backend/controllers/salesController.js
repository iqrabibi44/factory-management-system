const Sale = require('../models/Sale');
const FinishedGood = require('../models/FinishedGood');
const ProductModel = require('../models/ProductModel');
const Customer = require('../models/Customer');

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
            .populate('customerRef', 'name companyName mobile address ntn')
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
            .populate('customerRef', 'name companyName mobile address ntn')
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
        const { customerRef: customerId, customer, customerPhone, customerAddress, items, discount, amountPaid, notes } = req.body;

        // If customerRef provided, validate and auto-fill details from Customer Master
        let resolvedCustomer = customer;
        let resolvedPhone = customerPhone;
        let resolvedAddress = customerAddress;

        if (customerId) {
            const cust = await Customer.findById(customerId);
            if (!cust) return res.status(404).json({ message: 'Customer not found' });
            resolvedCustomer = cust.name;
            resolvedPhone = customerPhone || cust.mobile;
            resolvedAddress = customerAddress || cust.address;
        }

        if (!resolvedCustomer) return res.status(400).json({ message: 'Customer name is required' });

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
            customerRef: customerId || null,
            customer: resolvedCustomer,
            customerPhone: resolvedPhone,
            customerAddress: resolvedAddress,
            items,
            discount,
            amountPaid: Number(amountPaid || 0),
            notes,
            createdBy: req.user._id,
        });

        // Deduct finished goods
        for (const item of items) {
            await FinishedGood.findOneAndUpdate({ model: item.model }, { $inc: { quantity: -item.quantity } });
        }

        const populated = await Sale.findById(sale._id)
            .populate({ path: 'items.model', populate: { path: 'product', select: 'name category' } })
            .populate('customerRef', 'name companyName mobile address ntn');

        res.status(201).json(populated);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getSales, getSale, createSale };
