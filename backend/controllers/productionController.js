const Production = require('../models/Production');
const ProductionSession = require('../models/ProductionSession');
const ProductModel = require('../models/ProductModel');
const RawMaterial = require('../models/RawMaterial');
const FinishedGood = require('../models/FinishedGood');
const InventoryBatch = require('../models/InventoryBatch');

// @desc    Get the current active open session
// @route   GET /api/production/session/active
const getActiveSession = async (req, res) => {
    try {
        const session = await ProductionSession.findOne({ status: 'open' })
            .populate('createdBy', 'name');

        if (!session) {
            return res.json(null);
        }

        // Fetch all manufacturing entries linked to this session
        const entries = await Production.find({ session: session._id })
            .populate({ path: 'model', populate: { path: 'product', select: 'name category' } })
            .populate('materialsUsed.rawMaterial', 'name unit costPerUnit');

        res.json({ session, entries });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Start a new production session
// @route   POST /api/production/session/start
const startSession = async (req, res) => {
    try {
        // Check for existing open session
        const existingSession = await ProductionSession.findOne({ status: 'open' });
        if (existingSession) {
            return res.status(400).json({ message: 'A production session is already active. End it first.' });
        }

        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const sessionCount = await ProductionSession.countDocuments({
            startTime: {
                $gte: new Date().setHours(0, 0, 0, 0),
                $lt: new Date().setHours(23, 59, 59, 999)
            }
        });

        const sessionNumber = `SES-${dateStr}-${String(sessionCount + 1).padStart(3, '0')}`;

        const session = await ProductionSession.create({
            sessionNumber,
            status: 'open',
            startTime: new Date(),
            notes: req.body.notes || '',
            createdBy: req.user._id
        });

        const populated = await ProductionSession.findById(session._id).populate('createdBy', 'name');
        res.status(201).json({ session: populated, entries: [] });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Add manufacturing entry to active production session (FIFO stock decrement)
// @route   POST /api/production/session/entry
const addSessionEntry = async (req, res) => {
    try {
        const { model: modelId, quantity, actualWeight, startTime, endTime, materials: actualInputs, notes } = req.body;

        const activeSession = await ProductionSession.findOne({ status: 'open' });
        if (!activeSession) {
            return res.status(400).json({ message: 'No active production session found. Start a session first.' });
        }

        // Fetch product model with BOM
        const model = await ProductModel.findById(modelId).populate('bom.rawMaterial');
        if (!model) return res.status(404).json({ message: 'Product model not found' });
        if (!model.bom || model.bom.length === 0) {
            return res.status(400).json({ message: 'No BOM defined for this product model. Set BOM first.' });
        }

        const materialsUsed = [];
        let totalEntryCost = 0;

        // Perform stock check & FIFO consumption
        for (const bomItem of model.bom) {
            const rawMatId = bomItem.rawMaterial._id;
            const standardQty = Number(bomItem.quantity) * Number(quantity);

            // Find actual input submitted by operator, default to standard if not specified
            const userAct = actualInputs && actualInputs.find(i => String(i.rawMaterial) === String(rawMatId));
            const actualQty = userAct ? Number(userAct.actualQuantity) : standardQty;

            const material = await RawMaterial.findById(rawMatId);
            if (!material || material.quantity < actualQty) {
                return res.status(400).json({
                    message: `Insufficient stock for raw material: ${material ? material.name : 'Unknown'}. Required: ${actualQty}, Available: ${material ? material.quantity : 0}`
                });
            }

            // Consume actualQuantity from inventory batches in FIFO order
            let remainingToConsume = actualQty;
            const activeBatches = await InventoryBatch.find({
                rawMaterial: rawMatId,
                remainingQuantity: { $gt: 0 }
            }).sort({ purchaseDate: 1 }); // Oldest first

            for (const batch of activeBatches) {
                if (remainingToConsume <= 0) break;

                if (batch.remainingQuantity >= remainingToConsume) {
                    batch.remainingQuantity -= remainingToConsume;
                    remainingToConsume = 0;
                } else {
                    remainingToConsume -= batch.remainingQuantity;
                    batch.remainingQuantity = 0;
                }
                await batch.save();
            }

            // Recalculate remaining inventory & weighted average cost for the material
            const allActiveBatches = await InventoryBatch.find({
                rawMaterial: rawMatId,
                remainingQuantity: { $gt: 0 }
            });

            const totalRemaining = allActiveBatches.reduce((sum, b) => sum + b.remainingQuantity, 0);
            const totalCost = allActiveBatches.reduce((sum, b) => sum + (b.remainingQuantity * b.purchaseRate), 0);
            const newAverageCost = totalRemaining > 0 ? (totalCost / totalRemaining) : material.costPerUnit;

            const roundedAverage = Math.round(newAverageCost * 100) / 100;
            await RawMaterial.findByIdAndUpdate(rawMatId, {
                quantity: totalRemaining,
                costPerUnit: roundedAverage
            });

            // Calculate cost for this entry based on average cost
            const matCost = Math.round(actualQty * material.costPerUnit * 100) / 100;
            totalEntryCost += matCost;

            // Log details
            materialsUsed.push({
                rawMaterial: rawMatId,
                standardQuantity: standardQty,
                actualQuantity: actualQty,
                waste: actualQty - standardQty,
                cost: matCost
            });
        }

        // Increase finished goods stock
        await FinishedGood.findOneAndUpdate(
            { model: modelId },
            { $inc: { quantity: Number(quantity) } },
            { upsert: true, new: true }
        );

        // Record production entry linked to active session
        const entry = await Production.create({
            session: activeSession._id,
            model: modelId,
            quantity: Number(quantity),
            actualWeight: Number(actualWeight || 0),
            startTime: startTime || new Date(),
            endTime: endTime || new Date(),
            materialsUsed,
            totalManufacturingCost: totalEntryCost,
            notes,
            status: 'completed',
            createdBy: req.user._id,
        });

        // Recalculate active session totals
        const allEntries = await Production.find({ session: activeSession._id });
        activeSession.totalManufacturingCost = allEntries.reduce((sum, e) => sum + e.totalManufacturingCost, 0);
        activeSession.totalProductsManufactured = allEntries.reduce((sum, e) => sum + e.quantity, 0);
        await activeSession.save();

        const populatedEntry = await Production.findById(entry._id)
            .populate({ path: 'model', populate: { path: 'product', select: 'name category' } })
            .populate('materialsUsed.rawMaterial', 'name unit costPerUnit');

        res.status(201).json(populatedEntry);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    End active production session with physical remaining inputs and waste calculations
// @route   POST /api/production/session/end
const endSession = async (req, res) => {
    try {
        const { physicalRemainingInputs, notes } = req.body; // Array of { rawMaterial: id, physicalRemaining: number }

        const activeSession = await ProductionSession.findOne({ status: 'open' });
        if (!activeSession) {
            return res.status(400).json({ message: 'No active production session found' });
        }

        // Fetch all manufacturing entries linked to this session
        const entries = await Production.find({ session: activeSession._id })
            .populate('materialsUsed.rawMaterial');

        // Compile total materials used across all entries
        const compiledUsage = {}; // matId -> { name, unit, standardQuantity, totalUsed, cost, rawMaterialObj }
        entries.forEach(entry => {
            (entry.materialsUsed || []).forEach(item => {
                if (!item.rawMaterial) return;
                const matId = item.rawMaterial._id.toString();
                if (!compiledUsage[matId]) {
                    compiledUsage[matId] = {
                        rawMaterial: item.rawMaterial._id,
                        name: item.rawMaterial.name,
                        unit: item.rawMaterial.unit,
                        standardQuantity: 0,
                        totalUsed: 0,
                        cost: 0,
                        rawMaterialObj: item.rawMaterial
                    };
                }
                compiledUsage[matId].standardQuantity += item.standardQuantity || 0;
                compiledUsage[matId].totalUsed += item.actualQuantity || 0;
                compiledUsage[matId].cost += item.cost || 0;
            });
        });

        // Compute materialsSummary with physicalRemaining counts and waste
        const materialsSummary = [];
        Object.values(compiledUsage).forEach(usage => {
            const userInput = physicalRemainingInputs && physicalRemainingInputs.find(i => String(i.rawMaterial) === String(usage.rawMaterial));
            const physicalRemaining = userInput ? Number(userInput.physicalRemaining) : 0;
            
            // Waste = Material Used - Material Remaining
            const waste = usage.totalUsed - physicalRemaining;
            const wastePercentage = usage.totalUsed > 0 ? Math.round((waste / usage.totalUsed) * 10000) / 100 : 0;

            materialsSummary.push({
                rawMaterial: usage.rawMaterial,
                standardQuantity: usage.standardQuantity,
                totalUsed: usage.totalUsed,
                physicalRemaining,
                waste,
                wastePercentage,
                cost: usage.cost
            });
        });

        activeSession.status = 'closed';
        activeSession.endTime = new Date();
        activeSession.closedAt = new Date();
        activeSession.materialsSummary = materialsSummary;
        activeSession.totalManufacturingCost = entries.reduce((sum, e) => sum + e.totalManufacturingCost, 0);
        activeSession.totalProductsManufactured = entries.reduce((sum, e) => sum + e.quantity, 0);
        if (notes) activeSession.notes = notes;

        await activeSession.save();

        const populatedSession = await ProductionSession.findById(activeSession._id)
            .populate('createdBy', 'name')
            .populate('materialsSummary.rawMaterial', 'name unit costPerUnit');

        res.json({ session: populatedSession, entries });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Reopen a closed production session (authorized Admin only)
// @route   POST /api/production/session/reopen/:id
const reopenSession = async (req, res) => {
    try {
        const { id } = req.params;

        // Check if there is already an open session
        const activeSession = await ProductionSession.findOne({ status: 'open' });
        if (activeSession) {
            return res.status(400).json({ message: 'A production session is already active. End it first.' });
        }

        const session = await ProductionSession.findById(id);
        if (!session) {
            return res.status(404).json({ message: 'Production session not found' });
        }

        if (session.status === 'open') {
            return res.status(400).json({ message: 'Session is already open' });
        }

        session.status = 'open';
        session.endTime = undefined;
        session.closedAt = undefined;
        session.materialsSummary = [];
        await session.save();

        const populated = await ProductionSession.findById(session._id)
            .populate('createdBy', 'name');

        const entries = await Production.find({ session: session._id })
            .populate({ path: 'model', populate: { path: 'product', select: 'name category' } })
            .populate('materialsUsed.rawMaterial', 'name unit costPerUnit');

        res.json({ session: populated, entries });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all production sessions (paginated)
// @route   GET /api/production/sessions
const getProductions = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const total = await ProductionSession.countDocuments();
        const sessions = await ProductionSession.find({})
            .populate('createdBy', 'name')
            .populate('materialsSummary.rawMaterial', 'name unit costPerUnit')
            .sort({ createdAt: -1 })
            .skip(skip).limit(limit);

        res.json({ sessions, total, page, pages: Math.ceil(total / limit) });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get session details by ID
// @route   GET /api/production/session/:id
const getSessionDetail = async (req, res) => {
    try {
        const { id } = req.params;
        const session = await ProductionSession.findById(id)
            .populate('createdBy', 'name')
            .populate('materialsSummary.rawMaterial', 'name unit costPerUnit');

        if (!session) {
            return res.status(404).json({ message: 'Production session not found' });
        }

        const entries = await Production.find({ session: session._id })
            .populate({ path: 'model', populate: { path: 'product', select: 'name category' } })
            .populate('materialsUsed.rawMaterial', 'name unit costPerUnit');

        res.json({ session, entries });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Legacy support: Check material availability for production (preview)
const checkMaterialAvailability = async (req, res) => {
    try {
        const { model: modelId, quantity } = req.body;
        const model = await ProductModel.findById(modelId).populate('bom.rawMaterial');
        if (!model) return res.status(404).json({ message: 'Product model not found' });

        const availability = model.bom.map(bomItem => {
            const required = Number(bomItem.quantity) * Number(quantity);
            const available = bomItem.rawMaterial.quantity;
            return {
                rawMaterial: bomItem.rawMaterial._id,
                name: bomItem.rawMaterial.name,
                unit: bomItem.rawMaterial.unit,
                required,
                available,
                sufficient: available >= required,
            };
        });

        const canProduce = availability.every(a => a.sufficient);
        res.json({ canProduce, availability });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getActiveSession,
    startSession,
    addSessionEntry,
    endSession,
    reopenSession,
    getProductions, // exports the list of sessions
    getSessionDetail,
    checkMaterialAvailability
};
