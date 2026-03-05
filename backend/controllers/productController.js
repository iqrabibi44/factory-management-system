const Product = require('../models/Product');
const ProductModel = require('../models/ProductModel');

// ========== PRODUCTS ==========

// @desc    Get all products
// @route   GET /api/products
const getProducts = async (req, res) => {
    try {
        const { search, category } = req.query;
        let query = {};
        if (search) query.name = { $regex: search, $options: 'i' };
        if (category) query.category = category;

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const total = await Product.countDocuments(query);
        const products = await Product.find(query).skip(skip).limit(limit).sort({ createdAt: -1 });
        res.json({ products, total, page, pages: Math.ceil(total / limit) });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get single product
// @route   GET /api/products/:id
const getProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ message: 'Product not found' });
        res.json(product);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create product
// @route   POST /api/products
const createProduct = async (req, res) => {
    try {
        const product = await Product.create(req.body);
        res.status(201).json(product);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update product
// @route   PUT /api/products/:id
const updateProduct = async (req, res) => {
    try {
        const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!product) return res.status(404).json({ message: 'Product not found' });
        res.json(product);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete product
// @route   DELETE /api/products/:id
const deleteProduct = async (req, res) => {
    try {
        const product = await Product.findByIdAndDelete(req.params.id);
        if (!product) return res.status(404).json({ message: 'Product not found' });
        // Also delete associated models
        await ProductModel.deleteMany({ product: req.params.id });
        res.json({ message: 'Product and its models deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ========== PRODUCT MODELS ==========

// @desc    Get all models for a product
// @route   GET /api/products/:id/models
const getProductModels = async (req, res) => {
    try {
        const models = await ProductModel.find({ product: req.params.id })
            .populate('product', 'name category')
            .populate('bom.rawMaterial', 'name unit');
        res.json(models);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all models (all products)
// @route   GET /api/models
const getAllModels = async (req, res) => {
    try {
        const models = await ProductModel.find({})
            .populate('product', 'name category image')
            .populate('bom.rawMaterial', 'name unit');
        res.json(models);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get single model
// @route   GET /api/models/:id
const getModel = async (req, res) => {
    try {
        const model = await ProductModel.findById(req.params.id)
            .populate('product', 'name category')
            .populate('bom.rawMaterial', 'name unit costPerUnit');
        if (!model) return res.status(404).json({ message: 'Model not found' });
        res.json(model);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create model
// @route   POST /api/models
const createModel = async (req, res) => {
    try {
        const model = await ProductModel.create(req.body);
        res.status(201).json(model);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update model
// @route   PUT /api/models/:id
const updateModel = async (req, res) => {
    try {
        const model = await ProductModel.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!model) return res.status(404).json({ message: 'Model not found' });
        res.json(model);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete model
// @route   DELETE /api/models/:id
const deleteModel = async (req, res) => {
    try {
        const model = await ProductModel.findByIdAndDelete(req.params.id);
        if (!model) return res.status(404).json({ message: 'Model not found' });
        res.json({ message: 'Model deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getProducts, getProduct, createProduct, updateProduct, deleteProduct,
    getProductModels, getAllModels, getModel, createModel, updateModel, deleteModel,
};
