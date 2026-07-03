const mongoose = require('mongoose');

const sessionMaterialSummarySchema = new mongoose.Schema({
    rawMaterial: { type: mongoose.Schema.Types.ObjectId, ref: 'RawMaterial', required: true },
    standardQuantity: { type: Number, required: true, default: 0 },
    totalUsed: { type: Number, required: true, default: 0 },
    physicalRemaining: { type: Number, required: true, default: 0 },
    waste: { type: Number, required: true, default: 0 },
    wastePercentage: { type: Number, required: true, default: 0 },
    cost: { type: Number, required: true, default: 0 },
});

const productionSessionSchema = new mongoose.Schema({
    sessionNumber: { type: String, required: true, unique: true },
    status: { type: String, enum: ['open', 'closed'], default: 'open' },
    startTime: { type: Date, default: Date.now },
    endTime: { type: Date },
    closedAt: { type: Date },
    materialsSummary: [sessionMaterialSummarySchema],
    totalManufacturingCost: { type: Number, default: 0 },
    totalProductsManufactured: { type: Number, default: 0 },
    notes: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

module.exports = mongoose.model('ProductionSession', productionSessionSchema);
