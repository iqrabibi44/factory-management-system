const mongoose = require('mongoose');

// BOM item sub-schema
const bomItemSchema = new mongoose.Schema({
    rawMaterial: { type: mongoose.Schema.Types.ObjectId, ref: 'RawMaterial', required: true },
    quantity: { type: Number, required: true, min: 0 },
});

const productModelSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    description: { type: String },
    price: { type: Number, required: true, min: 0 },
    productionCost: { type: Number, default: 0, min: 0 },
    manufacturingCost: { type: Number, required: true, min: 0 },
    image: { type: String, default: '' },
    bom: [bomItemSchema], // Bill of Materials
}, { timestamps: true });

module.exports = mongoose.model('ProductModel', productModelSchema);
