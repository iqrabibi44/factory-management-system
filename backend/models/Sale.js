const mongoose = require('mongoose');

const saleItemSchema = new mongoose.Schema({
    model: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductModel', required: true },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 },
});

const saleSchema = new mongoose.Schema({
    invoiceNumber: { type: String, unique: true },
    customer: { type: String, required: true, trim: true },
    customerPhone: { type: String },
    customerAddress: { type: String },
    date: { type: Date, default: Date.now },
    items: [saleItemSchema],
    totalAmount: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    notes: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// Auto-calculate totalAmount and generate invoice number
saleSchema.pre('save', async function (next) {
    if (!this.invoiceNumber) {
        const count = await mongoose.model('Sale').countDocuments();
        this.invoiceNumber = `INV-${String(count + 1).padStart(5, '0')}`;
    }
    this.totalAmount = this.items.reduce((sum, item) => sum + item.quantity * item.price, 0) - this.discount;
    next();
});

module.exports = mongoose.model('Sale', saleSchema);
