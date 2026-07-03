const mongoose = require('mongoose');

const inventoryBatchSchema = new mongoose.Schema({
    rawMaterial: { type: mongoose.Schema.Types.ObjectId, ref: 'RawMaterial', required: true },
    batchNumber: { type: String, required: true },
    purchaseDate: { type: Date, default: Date.now },
    quantityPurchased: { type: Number, required: true, min: 0 },
    remainingQuantity: { type: Number, required: true, min: 0 },
    purchaseRate: { type: Number, required: true, min: 0 },
    averageInventoryCost: { type: Number, default: 0 }, // Weighted average at purchase time
}, { timestamps: true });

// Index for FIFO sorting and material queries
inventoryBatchSchema.index({ rawMaterial: 1, purchaseDate: 1 });

module.exports = mongoose.model('InventoryBatch', inventoryBatchSchema);
