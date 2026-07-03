const mongoose = require('mongoose');

const materialsUsedSchema = new mongoose.Schema({
    rawMaterial: { type: mongoose.Schema.Types.ObjectId, ref: 'RawMaterial', required: true },
    standardQuantity: { type: Number, required: true, default: 0 }, // BOM * produced_quantity
    actualQuantity: { type: Number, required: true, default: 0 },   // Actual amount consumed
    waste: { type: Number, required: true, default: 0 },            // actualQuantity - standardQuantity
    cost: { type: Number, required: true, default: 0 },             // actualQuantity * weighted_avg_rate
});

const productionSchema = new mongoose.Schema({
    session: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductionSession', required: true },
    model: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductModel', required: true },
    quantity: { type: Number, required: true, min: 1 },             // Number of pipes produced
    actualWeight: { type: Number, default: 0 },                     // Actual weight of produced pipes in kg
    startTime: { type: Date },                                      // Session start time
    endTime: { type: Date },                                        // Session end time
    date: { type: Date, default: Date.now },
    status: { type: String, enum: ['completed', 'failed'], default: 'completed' },
    materialsUsed: [materialsUsedSchema],                           // Detailed BOM consumption breakdown
    totalManufacturingCost: { type: Number, default: 0 },            // Total cost based on average raw material cost
    notes: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('Production', productionSchema);
