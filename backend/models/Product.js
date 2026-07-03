const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    description: { type: String },
    category: {
        type: String,
        enum: ['uPVC Pipe', 'PPRC Pipe', 'HDPE Pipe'],
        required: true,
    },
    image: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);
