const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    companyName: { type: String, trim: true },
    mobile: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    address: { type: String, trim: true },
    ntn: { type: String, trim: true },
    openingBalance: { type: Number, default: 0 }, // for receivable ledger
    notes: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });

// Full-text search index
customerSchema.index({ name: 'text', companyName: 'text' });

module.exports = mongoose.model('Customer', customerSchema);
