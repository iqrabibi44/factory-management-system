const mongoose = require('mongoose');

const finishedGoodSchema = new mongoose.Schema({
    model: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductModel', required: true, unique: true },
    quantity: { type: Number, default: 0, min: 0 },
    lowStockThreshold: { type: Number, default: 5 },
}, { timestamps: true });

finishedGoodSchema.virtual('isLowStock').get(function () {
    return this.quantity <= this.lowStockThreshold;
});

finishedGoodSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('FinishedGood', finishedGoodSchema);
