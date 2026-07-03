const Vendor = require('../models/Vendor');
const Purchase = require('../models/Purchase');

// Helper to calculate outstanding balance for a vendor
const getOutstandingBalance = async (vendorId, openingBalance) => {
    const purchases = await Purchase.find({ vendor: vendorId });
    const totalPurchased = purchases.reduce((sum, p) => sum + (p.totalCost || 0), 0);
    const totalPaid = purchases.reduce((sum, p) => sum + (p.amountPaid || 0), 0);
    return (openingBalance || 0) + totalPurchased - totalPaid;
};

// @desc    Get all vendors (with optional search)
// @route   GET /api/vendors
const getVendors = async (req, res) => {
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
        const vendors = await Vendor.find(query).sort({ name: 1 });
        
        // Calculate outstanding balance for each vendor
        const vendorsWithBalance = await Promise.all(vendors.map(async (v) => {
            const outstandingBalance = await getOutstandingBalance(v._id, v.openingBalance);
            return {
                ...v.toObject(),
                outstandingBalance
            };
        }));

        res.json(vendorsWithBalance);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get single vendor
// @route   GET /api/vendors/:id
const getVendor = async (req, res) => {
    try {
        const vendor = await Vendor.findById(req.params.id);
        if (!vendor) return res.status(404).json({ message: 'Vendor not found' });
        
        const outstandingBalance = await getOutstandingBalance(vendor._id, vendor.openingBalance);
        res.json({
            ...vendor.toObject(),
            outstandingBalance
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create vendor
// @route   POST /api/vendors
const createVendor = async (req, res) => {
    try {
        const { name, companyName, contactPerson, mobile, email, address, ntn, paymentTerms, openingBalance, notes } = req.body;
        if (!name) return res.status(400).json({ message: 'Vendor name is required' });

        const vendor = await Vendor.create({
            name, companyName, contactPerson, mobile, email,
            address, ntn, paymentTerms, openingBalance, notes,
        });
        res.status(201).json(vendor);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update vendor
// @route   PUT /api/vendors/:id
const updateVendor = async (req, res) => {
    try {
        const vendor = await Vendor.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!vendor) return res.status(404).json({ message: 'Vendor not found' });
        res.json(vendor);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete vendor (soft delete)
// @route   DELETE /api/vendors/:id
const deleteVendor = async (req, res) => {
    try {
        const vendor = await Vendor.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
        if (!vendor) return res.status(404).json({ message: 'Vendor not found' });
        res.json({ message: 'Vendor removed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getVendors, getVendor, createVendor, updateVendor, deleteVendor };
