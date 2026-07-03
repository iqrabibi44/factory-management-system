/**
 * Seed script - populates the database with sample data for a Pipe Factory ERP
 * Run: node seed.js
 */
const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const User = require('./models/User');
const Product = require('./models/Product');
const ProductModel = require('./models/ProductModel');
const RawMaterial = require('./models/RawMaterial');
const Vendor = require('./models/Vendor');
const Customer = require('./models/Customer');
const Purchase = require('./models/Purchase');
const Sale = require('./models/Sale');
const FinishedGood = require('./models/FinishedGood');
const Production = require('./models/Production');
const ProductionSession = require('./models/ProductionSession');
const InventoryBatch = require('./models/InventoryBatch');

const seed = async () => {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Product.deleteMany({});
    await ProductModel.deleteMany({});
    await RawMaterial.deleteMany({});
    await Vendor.deleteMany({});
    await Customer.deleteMany({});
    await Purchase.deleteMany({});
    await Sale.deleteMany({});
    await FinishedGood.deleteMany({});
    await Production.deleteMany({});
    await ProductionSession.deleteMany({});
    await InventoryBatch.deleteMany({});
    console.log('🗑️ Existing tables cleared');

    // Create users
    await User.create({ name: 'Admin User', email: 'admin@factory.com', password: 'Fms@Admin#2024', role: 'admin' });
    await User.create({ name: 'Store Manager', email: 'store@factory.com', password: 'Fms@Store#2024', role: 'store_manager' });
    await User.create({ name: 'Production Manager', email: 'prod@factory.com', password: 'Fms@Prod#2024', role: 'production_manager' });
    await User.create({ name: 'Sales Manager', email: 'sales@factory.com', password: 'Fms@Sales#2024', role: 'sales_manager' });
    console.log('✅ Users seeded');

    // Create raw materials for Pipes factory
    const materials = await RawMaterial.insertMany([
        { name: 'PVC Resin (K67)', quantity: 5000, unit: 'kg', costPerUnit: 180, lowStockThreshold: 1000 },
        { name: 'Calcium Carbonate Filler', quantity: 3000, unit: 'kg', costPerUnit: 35, lowStockThreshold: 500 },
        { name: 'Heat Stabilizer (One Pack)', quantity: 400, unit: 'kg', costPerUnit: 450, lowStockThreshold: 100 },
        { name: 'Titanium Dioxide (White Pigment)', quantity: 250, unit: 'kg', costPerUnit: 600, lowStockThreshold: 50 },
        { name: 'PPRC Granules (PN20)', quantity: 2000, unit: 'kg', costPerUnit: 290, lowStockThreshold: 500 },
        { name: 'HDPE PE100 Raw Material', quantity: 4000, unit: 'kg', costPerUnit: 240, lowStockThreshold: 800 },
        { name: 'Processing Lubricants (Wax)', quantity: 300, unit: 'kg', costPerUnit: 180, lowStockThreshold: 50 },
        { name: 'Blue Pigment (Masterbatch)', quantity: 150, unit: 'kg', costPerUnit: 520, lowStockThreshold: 30 },
    ]);
    console.log('✅ Pipes Raw materials seeded');

    // Create pipe products
    const products = await Product.insertMany([
        {
            name: 'uPVC Pressure Pipes',
            description: 'Unplasticized Polyvinyl Chloride pressure pipes for water supply and drainage systems',
            category: 'uPVC Pipe',
            image: 'https://images.unsplash.com/photo-1542060748-10c28b629f6f?w=400',
        },
        {
            name: 'PPRC Hot & Cold Water Pipes',
            description: 'Polypropylene Random Copolymer pipes for hot and cold plumbing systems',
            category: 'PPRC Pipe',
            image: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=400',
        },
        {
            name: 'HDPE Industrial Pipes',
            description: 'High-Density Polyethylene pipes for industrial, gas, and potable water piping systems',
            category: 'HDPE Pipe',
            image: 'https://images.unsplash.com/photo-1615840287214-7fe58a8f3685?w=400',
        },
    ]);
    console.log('✅ Pipe Products seeded');

    // Create models with BOM (per length of pipe, e.g., 20ft / 4 meters)
    await ProductModel.insertMany([
        {
            name: 'uPVC Pipe 2" Class B (20ft)',
            product: products[0]._id,
            description: '2 inch diameter, Class B pressure rating pipe (Lightweight drainage/plumbing)',
            price: 1650,
            productionCost: 850,
            manufacturingCost: 1100,
            image: 'https://images.unsplash.com/photo-1542060748-10c28b629f6f?w=300',
            bom: [
                { rawMaterial: materials[0]._id, quantity: 4.2 }, // 4.2 kg PVC Resin
                { rawMaterial: materials[1]._id, quantity: 1.5 }, // 1.5 kg Calcium
                { rawMaterial: materials[2]._id, quantity: 0.15 }, // 0.15 kg Stabilizer
                { rawMaterial: materials[6]._id, quantity: 0.05 }, // Lubricants
            ],
        },
        {
            name: 'uPVC Pipe 4" Class C (20ft)',
            product: products[0]._id,
            description: '4 inch diameter, Class C pressure rating heavy duty pipe (Sewerage/Industrial)',
            price: 4950,
            productionCost: 2850,
            manufacturingCost: 3500,
            image: 'https://images.unsplash.com/photo-1542060748-10c28b629f6f?w=300',
            bom: [
                { rawMaterial: materials[0]._id, quantity: 14.5 },
                { rawMaterial: materials[1]._id, quantity: 3.5 },
                { rawMaterial: materials[2]._id, quantity: 0.45 },
                { rawMaterial: materials[3]._id, quantity: 0.15 }, // TiO2 for white UV resistance
                { rawMaterial: materials[6]._id, quantity: 0.1 },
            ],
        },
        {
            name: 'PPRC Pipe 25mm PN20 (13ft)',
            product: products[1]._id,
            description: '25mm outer diameter Polypropylene pipe, PN20 high pressure hot water',
            price: 780,
            productionCost: 420,
            manufacturingCost: 550,
            image: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=300',
            bom: [
                { rawMaterial: materials[4]._id, quantity: 1.4 },  // PPRC Granules
                { rawMaterial: materials[7]._id, quantity: 0.02 }, // Green/Blue Masterbatch
            ],
        },
        {
            name: 'PPRC Pipe 32mm PN20 (13ft)',
            product: products[1]._id,
            description: '32mm outer diameter Polypropylene pipe, PN20 high pressure rating',
            price: 1250,
            productionCost: 680,
            manufacturingCost: 900,
            image: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=300',
            bom: [
                { rawMaterial: materials[4]._id, quantity: 2.2 },
                { rawMaterial: materials[7]._id, quantity: 0.035 },
            ],
        },
        {
            name: 'HDPE Pipe 2" PN10 (100-meter coil)',
            product: products[2]._id,
            description: '2 inch outer diameter High-Density Polyethylene pipe coil, PN10 water rating',
            price: 38500,
            productionCost: 21500,
            manufacturingCost: 28000,
            image: 'https://images.unsplash.com/photo-1615840287214-7fe58a8f3685?w=300',
            bom: [
                { rawMaterial: materials[5]._id, quantity: 88.0 }, // HDPE Resin
                { rawMaterial: materials[7]._id, quantity: 0.8 },  // Blue color pigment
            ],
        },
    ]);
    console.log('✅ Pipe Product Models seeded');

    // Seed sample vendors and customers
    const seededVendors = await Vendor.insertMany([
        {
            name: 'Al Noor Chemicals Ltd',
            companyName: 'Al Noor Chemicals Industries',
            contactPerson: 'Mr. Khalid Mahmood',
            mobile: '0300-1234567',
            email: 'info@alnoorchemicals.com',
            address: 'Industrial Estate Phase 2, Karachi',
            ntn: '1234567-8',
            paymentTerms: 'Credit 30 Days',
            openingBalance: 150000,
        },
        {
            name: 'Pak Polymers Distributor',
            companyName: 'Pak Polymers & Chemicals',
            contactPerson: 'Mr. Saleem Ahmed',
            mobile: '0321-7654321',
            email: 'sales@pakpolymers.com',
            address: 'Jinnah Road, Lahore',
            ntn: '7654321-0',
            paymentTerms: 'Cash',
            openingBalance: 0,
        }
    ]);
    console.log('✅ Vendors seeded');

    const seededCustomers = await Customer.insertMany([
        {
            name: 'Ahmed Plastic Store',
            companyName: 'Ahmed Plastic Distributors',
            mobile: '0333-5556667',
            email: 'ahmedplastic@gmail.com',
            address: 'Gawalmandi, Rawalpindi',
            ntn: '8887776-5',
            openingBalance: 50000,
        },
        {
            name: 'Usman Piping Solutions',
            companyName: 'Usman & Sons Plumbing',
            mobile: '0345-9998887',
            email: 'usmanpipes@solution.com',
            address: 'Saddar Bazar, Peshawar',
            ntn: '2223334-9',
            openingBalance: 25000,
        }
    ]);
    console.log('✅ Customers seeded');

    console.log('\n🎉 Pipe Factory Database seeded successfully!');
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
