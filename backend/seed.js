/**
 * Seed script - populates the database with sample data
 * Run: node seed.js
 */
const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const User = require('./models/User');
const Product = require('./models/Product');
const ProductModel = require('./models/ProductModel');
const RawMaterial = require('./models/RawMaterial');

const seed = async () => {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Product.deleteMany({});
    await ProductModel.deleteMany({});
    await RawMaterial.deleteMany({});

    // Create users — use create() so the pre-save password hashing middleware runs
    await User.create({ name: 'Admin User', email: 'admin@factory.com', password: 'Fms@Admin#2024', role: 'admin' });
    await User.create({ name: 'Store Manager', email: 'store@factory.com', password: 'Fms@Store#2024', role: 'store_manager' });
    await User.create({ name: 'Production Manager', email: 'prod@factory.com', password: 'Fms@Prod#2024', role: 'production_manager' });
    await User.create({ name: 'Sales Manager', email: 'sales@factory.com', password: 'Fms@Sales#2024', role: 'sales_manager' });
    console.log('✅ Users seeded');

    // Create raw materials
    const materials = await RawMaterial.insertMany([
        { name: 'Steel Sheet', quantity: 500, unit: 'kg', costPerUnit: 150, lowStockThreshold: 50 },
        { name: 'Copper Wire', quantity: 200, unit: 'meters', costPerUnit: 80, lowStockThreshold: 30 },
        { name: 'Plastic Housing', quantity: 300, unit: 'pcs', costPerUnit: 200, lowStockThreshold: 40 },
        { name: 'Motor Assembly', quantity: 100, unit: 'pcs', costPerUnit: 1500, lowStockThreshold: 10 },
        { name: 'Fan Blade', quantity: 400, unit: 'pcs', costPerUnit: 120, lowStockThreshold: 50 },
        { name: 'Capacitor', quantity: 600, unit: 'pcs', costPerUnit: 50, lowStockThreshold: 100 },
        { name: 'Drum Tank', quantity: 80, unit: 'pcs', costPerUnit: 2500, lowStockThreshold: 10 },
        { name: 'Rubber Seal', quantity: 250, unit: 'pcs', costPerUnit: 30, lowStockThreshold: 30 },
    ]);
    console.log('✅ Raw materials seeded');

    // Create products
    const products = await Product.insertMany([
        {
            name: 'Room Cooler',
            description: 'High-efficiency evaporative room coolers for residential and commercial use',
            category: 'Room Cooler',
            image: 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=400',
        },
        {
            name: 'Fan',
            description: 'Premium quality ceiling, table, and pedestal fans',
            category: 'Fan',
            image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400',
        },
        {
            name: 'Washing Machine',
            description: 'Fully automatic and semi-automatic washing machines',
            category: 'Washing Machine',
            image: 'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?w=400',
        },
        {
            name: 'Spinner',
            description: 'High-speed cloth spinners for efficient drying',
            category: 'Spinner',
            image: 'https://images.unsplash.com/photo-1545173168-9f1947eebb7f?w=400',
        },
    ]);
    console.log('✅ Products seeded');

    // Create models with BOM
    await ProductModel.insertMany([
        {
            name: 'Cooler Pro 3000',
            product: products[0]._id,
            description: '3000 CFM heavy-duty room cooler',
            price: 18000,
            productionCost: 6450,
            manufacturingCost: 9000,
            image: 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=300',
            bom: [
                { rawMaterial: materials[0]._id, quantity: 5 },
                { rawMaterial: materials[2]._id, quantity: 1 },
                { rawMaterial: materials[3]._id, quantity: 1 },
                { rawMaterial: materials[5]._id, quantity: 2 },
            ],
        },
        {
            name: 'Cooler Lite 1500',
            product: products[0]._id,
            description: '1500 CFM compact room cooler',
            price: 10000,
            productionCost: 2850,
            manufacturingCost: 5000,
            image: 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=300',
            bom: [
                { rawMaterial: materials[0]._id, quantity: 3 },
                { rawMaterial: materials[2]._id, quantity: 1 },
                { rawMaterial: materials[3]._id, quantity: 1 },
            ],
        },
        {
            name: 'Ceiling Fan Deluxe',
            product: products[1]._id,
            description: '56-inch premium ceiling fan',
            price: 5500,
            productionCost: 290,
            manufacturingCost: 3000,
            image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=300',
            bom: [
                { rawMaterial: materials[1]._id, quantity: 10 },
                { rawMaterial: materials[4]._id, quantity: 3 },
                { rawMaterial: materials[3]._id, quantity: 1 },
                { rawMaterial: materials[5]._id, quantity: 1 },
            ],
        },
        {
            name: 'Table Fan Standard',
            product: products[1]._id,
            description: '16-inch table fan',
            price: 2200,
            productionCost: 330,
            manufacturingCost: 900,
            image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=300',
            bom: [
                { rawMaterial: materials[1]._id, quantity: 5 },
                { rawMaterial: materials[4]._id, quantity: 1 },
                { rawMaterial: materials[5]._id, quantity: 1 },
            ],
        },
        {
            name: 'WashPro 8kg Automatic',
            product: products[2]._id,
            description: '8kg fully automatic top-load washing machine',
            price: 45000,
            productionCost: 15630,
            manufacturingCost: 22000,
            image: 'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?w=300',
            bom: [
                { rawMaterial: materials[0]._id, quantity: 15 },
                { rawMaterial: materials[6]._id, quantity: 1 },
                { rawMaterial: materials[3]._id, quantity: 1 },
                { rawMaterial: materials[7]._id, quantity: 4 },
            ],
        },
        {
            name: 'SpinMaster 10kg',
            product: products[3]._id,
            description: '10kg high-speed spinner',
            price: 8500,
            productionCost: 1240,
            manufacturingCost: 4000,
            image: 'https://images.unsplash.com/photo-1545173168-9f1947eebb7f?w=300',
            bom: [
                { rawMaterial: materials[0]._id, quantity: 8 },
                { rawMaterial: materials[3]._id, quantity: 1 },
                { rawMaterial: materials[7]._id, quantity: 2 },
            ],
        },
    ]);
    console.log('✅ Product models seeded');

    console.log('\n🎉 Database seeded successfully!');
    console.log('\n📋 Login credentials:');
    console.log('  Admin:      admin@factory.com  / Fms@Admin#2024');
    console.log('  Store Mgr:  store@factory.com  / Fms@Store#2024');
    console.log('  Prod Mgr:   prod@factory.com   / Fms@Prod#2024');
    console.log('  Sales Mgr:  sales@factory.com  / Fms@Sales#2024');

    process.exit(0);
};

seed().catch(err => {
    console.error(err);
    process.exit(1);
});
