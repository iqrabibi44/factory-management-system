const mongoose = require('mongoose');

const purchaseItemSchema = new mongoose.Schema({
    rawMaterial: { type: mongoose.Schema.Types.ObjectId, ref: 'RawMaterial', required: true },
    quantity: { type: Number, required: true, min: 1 },
    rate: { type: Number, required: true, min: 0 },
    batchNumber: { type: String, required: true },
});

const purchaseSchema = new mongoose.Schema({
    // New: reference to Vendor Master
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', default: null },
    // Legacy: plain text supplier (kept for backward compatibility with old records)
    supplier: { type: String, trim: true },
    invoiceNo: { type: String, trim: true },
    date: { type: Date, default: Date.now },
    items: [purchaseItemSchema],
    totalCost: { type: Number, default: 0 },
    amountPaid: { type: Number, default: 0 },
    notes: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// Auto-calculate totalCost before saving
purchaseSchema.pre('save', function (next) {
    this.totalCost = this.items.reduce((sum, item) => sum + item.quantity * item.rate, 0);
    next();
});

module.exports = mongoose.model('Purchase', purchaseSchema);
