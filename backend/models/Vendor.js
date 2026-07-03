const mongoose = require('mongoose');

const vendorSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    companyName: { type: String, trim: true },
    contactPerson: { type: String, trim: true },
    mobile: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    address: { type: String, trim: true },
    ntn: { type: String, trim: true },      // NTN / GST number
    paymentTerms: { type: String, trim: true, default: 'Cash' },
    openingBalance: { type: Number, default: 0 }, // for payable ledger
    notes: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });

// Full-text search index on name and companyName
vendorSchema.index({ name: 'text', companyName: 'text' });

module.exports = mongoose.model('Vendor', vendorSchema);
