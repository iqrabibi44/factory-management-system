const mongoose = require('mongoose');

const rawMaterialSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true, unique: true },
    quantity: { type: Number, default: 0, min: 0 },
    unit: { type: String, required: true, default: 'pcs' },
    costPerUnit: { type: Number, required: true, min: 0 },
    lowStockThreshold: { type: Number, default: 10 },
}, { timestamps: true });

// Virtual: isLowStock
rawMaterialSchema.virtual('isLowStock').get(function () {
    return this.quantity <= this.lowStockThreshold;
});

rawMaterialSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('RawMaterial', rawMaterialSchema);
