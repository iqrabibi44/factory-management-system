const Sale = require('../models/Sale');
const Production = require('../models/Production');
const Purchase = require('../models/Purchase');
const RawMaterial = require('../models/RawMaterial');
const FinishedGood = require('../models/FinishedGood');
const ProductModel = require('../models/ProductModel');

// @desc    Get dashboard summary
// @route   GET /api/reports/dashboard
const getDashboard = async (req, res) => {
    try {
        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const startOfYear = new Date(today.getFullYear(), 0, 1);

        // Totals
        const [totalSales, totalProduction, totalPurchases, rawMaterials, finishedGoods] = await Promise.all([
            Sale.aggregate([{ $group: { _id: null, total: { $sum: '$totalAmount' }, count: { $sum: 1 } } }]),
            Production.aggregate([{ $group: { _id: null, total: { $sum: '$quantity' }, count: { $sum: 1 } } }]),
            Purchase.aggregate([{ $group: { _id: null, total: { $sum: '$totalCost' }, count: { $sum: 1 } } }]),
            RawMaterial.find({}),
            FinishedGood.find({}).populate('model', 'name manufacturingCost'),
        ]);

        // Monthly sales
        const monthlySales = await Sale.aggregate([
            { $match: { date: { $gte: startOfYear } } },
            { $group: { _id: { month: { $month: '$date' } }, total: { $sum: '$totalAmount' }, count: { $sum: 1 } } },
            { $sort: { '_id.month': 1 } },
        ]);

        // Low stock alerts
        const lowStockRaw = rawMaterials.filter(m => m.quantity <= m.lowStockThreshold);
        const lowStockFinished = finishedGoods.filter(fg => fg.quantity <= fg.lowStockThreshold);

        // Profit/Loss calculation
        const totalRevenue = totalSales[0]?.total || 0;
        const totalManufacturingCost = await Production.aggregate([
            { $group: { _id: null, total: { $sum: '$totalManufacturingCost' } } },
        ]);
        const totalPurchaseCost = totalPurchases[0]?.total || 0;
        const profit = totalRevenue - (totalManufacturingCost[0]?.total || 0);

        res.json({
            summary: {
                totalRevenue,
                totalProduction: totalProduction[0]?.total || 0,
                totalPurchaseCost,
                profit,
                salesCount: totalSales[0]?.count || 0,
                productionCount: totalProduction[0]?.count || 0,
            },
            monthlySales,
            lowStockAlerts: {
                rawMaterials: lowStockRaw.length,
                finishedGoods: lowStockFinished.length,
                rawMaterialsList: lowStockRaw,
                finishedGoodsList: lowStockFinished,
            },
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get sales report
// @route   GET /api/reports/sales
const getSalesReport = async (req, res) => {
    try {
        const { from, to, period } = req.query;
        let matchStage = {};

        if (from && to) {
            matchStage.date = { $gte: new Date(from), $lte: new Date(to) };
        } else if (period === 'daily') {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            matchStage.date = { $gte: today };
        } else if (period === 'monthly') {
            const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
            matchStage.date = { $gte: startOfMonth };
        } else if (period === 'yearly') {
            const startOfYear = new Date(new Date().getFullYear(), 0, 1);
            matchStage.date = { $gte: startOfYear };
        }

        const sales = await Sale.find(matchStage)
            .populate({ path: 'items.model', populate: { path: 'product', select: 'name category' } })
            .sort({ date: -1 });

        const totalRevenue = sales.reduce((sum, s) => sum + s.totalAmount, 0);
        res.json({ sales, totalRevenue, count: sales.length });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get production report
// @route   GET /api/reports/production
const getProductionReport = async (req, res) => {
    try {
        const { from, to, period } = req.query;
        let matchStage = {};

        if (from && to) {
            matchStage.date = { $gte: new Date(from), $lte: new Date(to) };
        } else if (period === 'monthly') {
            const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
            matchStage.date = { $gte: startOfMonth };
        } else if (period === 'yearly') {
            const startOfYear = new Date(new Date().getFullYear(), 0, 1);
            matchStage.date = { $gte: startOfYear };
        }

        const productions = await Production.find(matchStage)
            .populate({ path: 'model', populate: { path: 'product', select: 'name category' } })
            .sort({ date: -1 });

        const totalUnits = productions.reduce((sum, p) => sum + p.quantity, 0);
        const totalCost = productions.reduce((sum, p) => sum + p.totalManufacturingCost, 0);
        res.json({ productions, totalUnits, totalCost, count: productions.length });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get full consolidated report for PDF
// @route   GET /api/reports/full
const getFullReport = async (req, res) => {
    try {
        const { from, to, period } = req.query;
        let matchStage = {};

        if (from && to) {
            matchStage.date = { $gte: new Date(from), $lte: new Date(to) };
        } else {
            const now = new Date();
            if (period === 'weekly') {
                const lastWeek = new Date(now);
                lastWeek.setDate(now.getDate() - 7);
                matchStage.date = { $gte: lastWeek };
            } else if (period === 'monthly') {
                const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                matchStage.date = { $gte: startOfMonth };
            } else if (period === 'yearly') {
                const startOfYear = new Date(now.getFullYear(), 0, 1);
                matchStage.date = { $gte: startOfYear };
            } else if (period === 'daily') {
                const today = new Date(now);
                today.setHours(0, 0, 0, 0);
                matchStage.date = { $gte: today };
            }
        }

        const [sales, productions, finishedGoods, rawMaterials] = await Promise.all([
            Sale.find(matchStage).populate({ path: 'items.model', populate: { path: 'product', select: 'name category' } }).sort({ date: -1 }),
            Production.find(matchStage).populate({ path: 'model', populate: { path: 'product', select: 'name category' } }).sort({ date: -1 }),
            FinishedGood.find({}).populate('model', 'name manufacturingCost'),
            RawMaterial.find({})
        ]);

        const totalRevenue = sales.reduce((sum, s) => sum + s.totalAmount, 0);
        const totalCost = productions.reduce((sum, p) => sum + p.totalManufacturingCost, 0);

        res.json({
            period: { from, to, period },
            sales: {
                data: sales,
                totalRevenue,
                count: sales.length
            },
            production: {
                data: productions,
                totalUnits: productions.reduce((sum, p) => sum + p.quantity, 0),
                totalCost,
                count: productions.length
            },
            inventory: {
                lowStockRaw: rawMaterials.filter(m => m.quantity <= m.lowStockThreshold),
                lowStockFinished: finishedGoods.filter(fg => fg.quantity <= fg.lowStockThreshold)
            },
            summary: {
                revenue: totalRevenue,
                cost: totalCost,
                profit: totalRevenue - totalCost
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getDashboard, getSalesReport, getProductionReport, getFullReport };
