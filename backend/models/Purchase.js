const mongoose = require('mongoose');

const purchaseItemSchema = new mongoose.Schema({
    rawMaterial: { type: mongoose.Schema.Types.ObjectId, ref: 'RawMaterial', required: true },
    quantity: { type: Number, required: true, min: 1 },
    rate: { type: Number, required: true, min: 0 },
});

const purchaseSchema = new mongoose.Schema({
    supplier: { type: String, required: true, trim: true },
    date: { type: Date, default: Date.now },
    items: [purchaseItemSchema],
    totalCost: { type: Number, default: 0 },
    notes: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// Auto-calculate totalCost before saving
purchaseSchema.pre('save', function (next) {
    this.totalCost = this.items.reduce((sum, item) => sum + item.quantity * item.rate, 0);
    next();
});

module.exports = mongoose.model('Purchase', purchaseSchema);
