const mongoose = require('mongoose');

const materialsUsedSchema = new mongoose.Schema({
    rawMaterial: { type: mongoose.Schema.Types.ObjectId, ref: 'RawMaterial' },
    quantity: { type: Number },
});

const productionSchema = new mongoose.Schema({
    model: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductModel', required: true },
    quantity: { type: Number, required: true, min: 1 },
    date: { type: Date, default: Date.now },
    status: { type: String, enum: ['completed', 'failed'], default: 'completed' },
    materialsUsed: [materialsUsedSchema],
    totalManufacturingCost: { type: Number, default: 0 },
    notes: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('Production', productionSchema);
