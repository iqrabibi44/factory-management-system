const Customer = require('../models/Customer');
const Sale = require('../models/Sale');

// Helper to calculate outstanding balance for a customer
const getOutstandingBalance = async (customerId, openingBalance) => {
    const sales = await Sale.find({ customerRef: customerId });
    const totalSold = sales.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
    const totalPaid = sales.reduce((sum, s) => sum + (s.amountPaid || 0), 0);
    return (openingBalance || 0) + totalSold - totalPaid;
};

// @desc    Get all customers (with optional search)
// @route   GET /api/customers
const getCustomers = async (req, res) => {
    try {
        const search = req.query.search;
        let query = { isActive: true };
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { companyName: { $regex: search, $options: 'i' } },
                { mobile: { $regex: search, $options: 'i' } },
            ];
        }
        const customers = await Customer.find(query).sort({ name: 1 });
        
        // Calculate outstanding balance for each customer
        const customersWithBalance = await Promise.all(customers.map(async (c) => {
            const outstandingBalance = await getOutstandingBalance(c._id, c.openingBalance);
            return {
                ...c.toObject(),
                outstandingBalance
            };
        }));

        res.json(customersWithBalance);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get single customer
// @route   GET /api/customers/:id
const getCustomer = async (req, res) => {
    try {
        const customer = await Customer.findById(req.params.id);
        if (!customer) return res.status(404).json({ message: 'Customer not found' });
        
        const outstandingBalance = await getOutstandingBalance(customer._id, customer.openingBalance);
        res.json({
            ...customer.toObject(),
            outstandingBalance
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create customer
// @route   POST /api/customers
const createCustomer = async (req, res) => {
    try {
        const { name, companyName, mobile, email, address, ntn, openingBalance, notes } = req.body;
        if (!name) return res.status(400).json({ message: 'Customer name is required' });

        const customer = await Customer.create({
            name, companyName, mobile, email, address, ntn, openingBalance, notes,
        });
        res.status(201).json(customer);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update customer
// @route   PUT /api/customers/:id
const updateCustomer = async (req, res) => {
    try {
        const customer = await Customer.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!customer) return res.status(404).json({ message: 'Customer not found' });
        res.json(customer);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete customer (soft delete)
// @route   DELETE /api/customers/:id
const deleteCustomer = async (req, res) => {
    try {
        const customer = await Customer.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
        if (!customer) return res.status(404).json({ message: 'Customer not found' });
        res.json({ message: 'Customer removed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getCustomers, getCustomer, createCustomer, updateCustomer, deleteCustomer };
