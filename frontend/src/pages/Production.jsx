import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    getActiveSession,
    startSession,
    addSessionEntry,
    endSession,
    reopenSession,
    getSessionsList,
    getSessionDetail,
    getAllModels,
    checkMaterialAvailability,
    getRawMaterials
} from '../services/api';
import Modal from '../components/Modal';
import { SkeletonTable } from '../components/Skeleton';
import { useAuth } from '../context/AuthContext';
import {
    MdAdd, MdFactory, MdCheckCircle, MdCancel, MdTimer, MdClose,
    MdRefresh, MdHistory, MdInfo, MdOutlineTrendingFlat, MdOutlineScale, MdLockOpen
} from 'react-icons/md';
import toast from 'react-hot-toast';

const Production = () => {
    const { user, hasRole } = useAuth();
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // Active session state: { session, entries }
    const [activeSession, setActiveSession] = useState(null);
    const [historySessions, setHistorySessions] = useState([]);
    const [models, setModels] = useState([]);
    const [rawMaterialsList, setRawMaterialsList] = useState([]);

    // Modals
    const [startModalOpen, setStartModalOpen] = useState(false);
    const [entryModalOpen, setEntryModalOpen] = useState(false);
    const [endModalOpen, setEndModalOpen] = useState(false);
    const [detailModal, setDetailModal] = useState({ open: false, data: null, entries: [] });

    // Forms
    const [sessionNotes, setSessionNotes] = useState('');
    const [entryForm, setEntryForm] = useState({
        model: '',
        quantity: 1,
        actualWeight: 0,
        startTime: '',
        endTime: '',
        notes: '',
        materials: []
    });
    const [endForm, setEndForm] = useState({
        physicalInputs: [], // Array of { rawMaterial, name, unit, totalUsed, systemRemaining, physicalRemaining }
        notes: ''
    });

    const [checkingAvailability, setCheckingAvailability] = useState(false);
    const [availability, setAvailability] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    const fetchAllData = async () => {
        setLoading(true);
        try {
            const [activeRes, historyRes, modelsRes, rawRes] = await Promise.all([
                getActiveSession(),
                getSessionsList({ page, limit: 10 }),
                getAllModels(),
                getRawMaterials({ limit: 100 })
            ]);

            setActiveSession(activeRes.data);
            setHistorySessions(historyRes.data.sessions || []);
            setTotalPages(historyRes.data.pages || 1);
            setModels(modelsRes.data || []);
            setRawMaterialsList(rawRes.data.rawMaterials || []);
        } catch (e) {
            console.error(e);
            toast.error('Failed to load session workflow');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAllData();
    }, [page]);

    // Handle standard material updates in the entry form
    useEffect(() => {
        if (!entryForm.model) {
            setEntryForm(f => ({ ...f, materials: [] }));
            setAvailability(null);
            return;
        }

        const selectedModel = models.find(m => m._id === entryForm.model);
        if (selectedModel && selectedModel.bom) {
            const qty = Number(entryForm.quantity || 0);
            const mats = selectedModel.bom.map(bomItem => {
                const stdQty = Number(bomItem.quantity) * qty;
                return {
                    rawMaterial: bomItem.rawMaterial._id,
                    name: bomItem.rawMaterial.name,
                    unit: bomItem.rawMaterial.unit,
                    standardQuantity: stdQty,
                    actualQuantity: stdQty,
                    costPerUnit: bomItem.rawMaterial.costPerUnit || 0
                };
            });
            setEntryForm(f => ({ ...f, materials: mats }));
        }
    }, [entryForm.model, entryForm.quantity, models]);

    const handleStartSession = async () => {
        setSubmitting(true);
        try {
            const res = await startSession({ notes: sessionNotes });
            setActiveSession(res.data);
            setStartModalOpen(false);
            setSessionNotes('');
            toast.success(`Production Session started successfully!`);
            fetchAllData();
        } catch (e) {
            toast.error(e.response?.data?.message || 'Failed to start session');
        } finally {
            setSubmitting(false);
        }
    };

    const handleCheckAvailability = async () => {
        if (!entryForm.model || !entryForm.quantity) return;
        setCheckingAvailability(true);
        try {
            const { data } = await checkMaterialAvailability({
                model: entryForm.model,
                quantity: Number(entryForm.quantity)
            });
            setAvailability(data);
        } catch (e) {
            toast.error(e.response?.data?.message || 'Error checking stock availability');
        } finally {
            setCheckingAvailability(false);
        }
    };

    const handleActualChange = (index, value) => {
        setEntryForm(f => {
            const updated = [...f.materials];
            updated[index] = { ...updated[index], actualQuantity: Number(value || 0) };
            return { ...f, materials: updated };
        });
    };

    const handleAddEntry = async () => {
        if (!entryForm.model || !entryForm.quantity) {
            toast.error('Please select product and quantity');
            return;
        }
        setSubmitting(true);
        try {
            const res = await addSessionEntry({
                model: entryForm.model,
                quantity: Number(entryForm.quantity),
                actualWeight: Number(entryForm.actualWeight || 0),
                startTime: entryForm.startTime || new Date().toISOString(),
                endTime: entryForm.endTime || new Date().toISOString(),
                materials: entryForm.materials.map(m => ({
                    rawMaterial: m.rawMaterial,
                    actualQuantity: m.actualQuantity
                })),
                notes: entryForm.notes
            });
            toast.success('Manufacturing entry recorded! Stock deducted.');
            setEntryForm({
                model: '',
                quantity: 1,
                actualWeight: 0,
                startTime: '',
                endTime: '',
                notes: '',
                materials: []
            });
            setAvailability(null);
            setEntryModalOpen(false);
            fetchAllData();
        } catch (e) {
            toast.error(e.response?.data?.message || 'Recording entry failed');
        } finally {
            setSubmitting(false);
        }
    };

    const prepareEndSession = () => {
        if (!activeSession || !activeSession.entries) return;

        // Compile total materials used across all entries in the active session
        const usage = {};
        activeSession.entries.forEach(entry => {
            (entry.materialsUsed || []).forEach(item => {
                if (!item.rawMaterial) return;
                const matId = item.rawMaterial._id.toString();
                if (!usage[matId]) {
                    const storeMat = rawMaterialsList.find(rm => rm._id === matId);
                    usage[matId] = {
                        rawMaterial: item.rawMaterial._id,
                        name: item.rawMaterial.name,
                        unit: item.rawMaterial.unit,
                        totalUsed: 0,
                        systemRemaining: storeMat ? storeMat.quantity : 0
                    };
                }
                usage[matId].totalUsed += item.actualQuantity || 0;
            });
        });

        // Initialize form with compiled totals and default physical remaining to system remaining
        const physicalInputs = Object.values(usage).map(item => ({
            ...item,
            physicalRemaining: Math.round(item.systemRemaining * 100) / 100
        }));

        setEndForm({
            physicalInputs,
            notes: ''
        });
        setEndModalOpen(true);
    };

    const handlePhysicalRemainingChange = (index, value) => {
        setEndForm(f => {
            const updated = [...f.physicalInputs];
            updated[index] = { ...updated[index], physicalRemaining: Number(value || 0) };
            return { ...f, physicalInputs: updated };
        });
    };

    const handleEndSession = async () => {
        setSubmitting(true);
        try {
            await endSession({
                physicalRemainingInputs: endForm.physicalInputs.map(p => ({
                    rawMaterial: p.rawMaterial,
                    physicalRemaining: p.physicalRemaining
                })),
                notes: endForm.notes
            });
            toast.success('Production Session closed and audited successfully!');
            setEndModalOpen(false);
            setActiveSession(null);
            fetchAllData();
        } catch (e) {
            toast.error(e.response?.data?.message || 'Failed to end session');
        } finally {
            setSubmitting(false);
        }
    };

    const handleReopenSession = async (sessionId) => {
        const loadToast = toast.loading('Reopening production session...');
        try {
            const res = await reopenSession(sessionId);
            setActiveSession(res.data);
            setDetailModal({ open: false, data: null, entries: [] });
            toast.success('Production Session reopened successfully!', { id: loadToast });
            fetchAllData();
        } catch (e) {
            toast.error(e.response?.data?.message || 'Reopening failed', { id: loadToast });
        }
    };

    const handleViewDetail = async (session) => {
        try {
            const { data } = await getSessionDetail(session._id);
            setDetailModal({
                open: true,
                data: data.session,
                entries: data.entries || []
            });
        } catch (e) {
            toast.error('Failed to retrieve session breakdown');
        }
    };

    const totalEntryCost = entryForm.materials.reduce((sum, m) => sum + (m.actualQuantity * m.costPerUnit), 0);

    return (
        <div className="space-y-6">
            {/* Header section */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold gradient-text font-display">Extrusion Sessions</h1>
                    <p className="text-slate-500 mt-1">Audit materials, waste variations, and daily pipe runs.</p>
                </div>
                {!activeSession && hasRole('admin', 'production_manager') && (
                    <button onClick={() => setStartModalOpen(true)} className="btn-primary flex items-center gap-2">
                        <MdFactory size={20} /> Start New Session
                    </button>
                )}
            </div>

            {/* Active Session Dashboard View */}
            {activeSession && (
                <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="glass-card border-indigo-200 border shadow-indigo-100/50 shadow-lg overflow-hidden">
                    <div className="bg-gradient-to-r from-indigo-900 to-slate-900 text-white p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-1">
                            <span className="bg-indigo-500 text-white font-bold text-xs uppercase px-2.5 py-0.5 rounded-full tracking-wider animate-pulse">
                                Active Run Session
                            </span>
                            <h2 className="text-2xl font-bold font-mono">{activeSession.session.sessionNumber}</h2>
                            <p className="text-indigo-200 text-xs flex items-center gap-1.5 pt-0.5">
                                <MdTimer size={14} /> Started: {new Date(activeSession.session.startTime).toLocaleString()} | Operator: <span className="font-semibold text-white">{activeSession.session.createdBy?.name || 'Store'}</span>
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                            <button onClick={() => {
                                setEntryForm({
                                    model: '',
                                    quantity: 1,
                                    actualWeight: 0,
                                    startTime: new Date().toISOString().substring(0, 16),
                                    endTime: new Date().toISOString().substring(0, 16),
                                    notes: '',
                                    materials: []
                                });
                                setAvailability(null);
                                setEntryModalOpen(true);
                            }} className="bg-white hover:bg-slate-100 text-indigo-900 font-bold py-2 px-4 rounded-xl text-sm flex items-center gap-2 shadow-sm transition-all">
                                <MdAdd size={18} /> Record Entry
                            </button>
                            <button onClick={prepareEndSession} className="bg-rose-500 hover:bg-rose-600 text-white font-bold py-2 px-4 rounded-xl text-sm flex items-center gap-2 shadow-sm transition-all">
                                <MdClose size={18} /> End Session
                            </button>
                        </div>
                    </div>

                    <div className="p-6 space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                            <h3 className="font-bold text-slate-800 text-sm">Manufacturing Logs ({activeSession.entries?.length || 0} entries)</h3>
                            <span className="text-xs text-indigo-600 font-semibold bg-indigo-50 px-3 py-1 rounded-lg">
                                Subtotal Cost: Rs. {Number(activeSession.session.totalManufacturingCost || 0).toLocaleString()}
                            </span>
                        </div>

                        <div className="table-responsive">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Output Time</th>
                                        <th>Pipe Product</th>
                                        <th>Manufactured</th>
                                        <th>Finished Weight</th>
                                        <th>Session Cost Contribution</th>
                                        <th>Operator Notes</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {activeSession.entries?.map((entry, idx) => (
                                        <tr key={entry._id}>
                                            <td className="text-slate-500 font-medium text-xs font-mono">
                                                {new Date(entry.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </td>
                                            <td>
                                                <p className="font-semibold text-slate-800">{entry.model?.name}</p>
                                            </td>
                                            <td className="text-indigo-600 font-bold font-mono">{entry.quantity} pipes</td>
                                            <td className="font-semibold text-slate-700">{entry.actualWeight} kg</td>
                                            <td className="text-amber-600 font-bold">Rs. {Number(entry.totalManufacturingCost || 0).toLocaleString()}</td>
                                            <td className="text-slate-400 italic text-xs max-w-xs truncate">{entry.notes || '—'}</td>
                                        </tr>
                                    ))}
                                    {!activeSession.entries?.length && (
                                        <tr>
                                            <td colSpan={6} className="text-center py-10 text-slate-400">
                                                <p className="font-medium text-sm">No manufacturing entries logged under this session yet.</p>
                                                <p className="text-xs text-slate-400 mt-1">Click "Record Entry" above to add logs.</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Sessions History List */}
            <div className="glass-card p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                        <MdHistory size={22} className="text-slate-500" /> Session History Audit
                    </h3>
                    <button onClick={fetchAllData} className="p-2 rounded-lg bg-slate-50 text-slate-600 hover:bg-slate-100 transition-all">
                        <MdRefresh size={18} />
                    </button>
                </div>

                {loading ? <SkeletonTable rows={5} cols={5} /> : (
                    <>
                        <div className="table-responsive">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Session Number</th>
                                        <th>Date / Period</th>
                                        <th>Logs</th>
                                        <th>Output (Pipes)</th>
                                        <th>Audit Cost</th>
                                        <th>Audit Status</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {historySessions.map(sess => (
                                        <tr key={sess._id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="font-mono font-bold text-indigo-700 text-sm">{sess.sessionNumber}</td>
                                            <td className="text-slate-500 text-xs">
                                                <p className="font-medium text-slate-700">{new Date(sess.startTime).toLocaleDateString()}</p>
                                                <p className="text-[10px] text-slate-400">
                                                    {new Date(sess.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    {sess.endTime && ` - ${new Date(sess.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                                                </p>
                                            </td>
                                            <td className="font-bold text-slate-600">{sess.totalProductsManufactured > 0 ? 'Multi-Entry' : 'No logs'}</td>
                                            <td className="font-bold text-indigo-600">{sess.totalProductsManufactured} pipes</td>
                                            <td className="font-bold text-amber-600">Rs. {Number(sess.totalManufacturingCost || 0).toLocaleString()}</td>
                                            <td>
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider ${
                                                    sess.status === 'open' ? 'bg-indigo-100 text-indigo-800' : 'bg-emerald-100 text-emerald-800'
                                                }`}>
                                                    {sess.status === 'open' ? 'Active Run' : 'Audited'}
                                                </span>
                                            </td>
                                            <td>
                                                <button onClick={() => handleViewDetail(sess)} className="text-xs btn-secondary py-1 px-3">
                                                    Breakdown
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {!historySessions.length && (
                                        <tr>
                                            <td colSpan={7} className="text-center py-8 text-slate-400 text-sm">
                                                No historical sessions compiled yet.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        {totalPages > 1 && (
                            <div className="flex justify-center gap-2 pt-4">
                                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                                    <button key={p} onClick={() => setPage(p)} className={`w-8 h-8 rounded-lg text-sm font-bold transition-all ${page === p ? 'bg-navy-700 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>{p}</button>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Start Session Modal */}
            <Modal isOpen={startModalOpen} onClose={() => setStartModalOpen(false)} title="Initialize New Production Run Session" size="md">
                <div className="space-y-4">
                    <p className="text-xs text-slate-500">
                        Initializing a new session locks manufacturing operations under a tracked session run ID. You can record multiple extruder outputs and audit total raw material waste upon closing.
                    </p>
                    <div>
                        <label className="block text-slate-600 text-sm font-medium mb-1">Session Logs / extruder details</label>
                        <textarea value={sessionNotes} onChange={e => setSessionNotes(e.target.value)} className="form-input" rows={3} placeholder="Specify extruder machine #, temperature set, line details..." />
                    </div>
                    <div className="flex gap-3">
                        <button onClick={handleStartSession} disabled={submitting} className="btn-primary flex-1 flex items-center justify-center gap-2">
                            <MdFactory size={18} /> {submitting ? 'Starting...' : 'Start Active Run'}
                        </button>
                        <button onClick={() => setStartModalOpen(false)} className="btn-secondary flex-1">Cancel</button>
                    </div>
                </div>
            </Modal>

            {/* Add Manufacturing Entry Modal */}
            <Modal isOpen={entryModalOpen} onClose={() => setEntryModalOpen(false)} title="Record Extrusion Output Entry" size="xl">
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-slate-600 text-sm font-medium mb-1">Select Pipe Product *</label>
                            <select value={entryForm.model} onChange={e => setEntryForm(f => ({ ...f, model: e.target.value }))} className="form-input">
                                <option value="">Choose pipe model...</option>
                                {models.map(m => <option key={m._id} value={m._id}>{m.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-slate-600 text-sm font-medium mb-1">Number of Pipes Manufactured *</label>
                            <input type="number" value={entryForm.quantity} onChange={e => setEntryForm(f => ({ ...f, quantity: Math.max(1, Number(e.target.value)) }))} className="form-input font-bold" min={1} />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-slate-600 text-sm font-medium mb-1">Finished product weight (kg)</label>
                            <input type="number" value={entryForm.actualWeight} onChange={e => setEntryForm(f => ({ ...f, actualWeight: Math.max(0, Number(e.target.value)) }))} className="form-input" placeholder="e.g. 50" min={0} />
                        </div>
                        <div>
                            <label className="block text-slate-600 text-sm font-medium mb-1">Run Start Time</label>
                            <input type="datetime-local" value={entryForm.startTime} onChange={e => setEntryForm(f => ({ ...f, startTime: e.target.value }))} className="form-input text-sm" />
                        </div>
                        <div>
                            <label className="block text-slate-600 text-sm font-medium mb-1">Run End Time</label>
                            <input type="datetime-local" value={entryForm.endTime} onChange={e => setEntryForm(f => ({ ...f, endTime: e.target.value }))} className="form-input text-sm" />
                        </div>
                    </div>

                    {entryForm.model && (
                        <button onClick={handleCheckAvailability} disabled={checkingAvailability} className="btn-secondary w-full flex items-center justify-center gap-2">
                            {checkingAvailability ? <><span className="animate-spin">⟳</span> Checking raw stocks...</> : '🔍 Check Stock & Availability'}
                        </button>
                    )}

                    <AnimatePresence>
                        {availability && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                <p className={`font-bold mb-2 flex items-center gap-2 ${availability.canProduce ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    {availability.canProduce ? <MdCheckCircle size={20} /> : <MdCancel size={20} />}
                                    {availability.canProduce ? 'Standard raw material stock is fully available' : 'Warning: Standard raw materials are below required limits!'}
                                </p>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {entryForm.materials.length > 0 && (
                        <div className="space-y-3">
                            <h3 className="text-slate-700 text-sm font-bold border-b border-slate-100 pb-1">Raw Material Consumption (Entry BOM)</h3>
                            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                                {entryForm.materials.map((m, i) => {
                                    const waste = m.actualQuantity - m.standardQuantity;
                                    return (
                                        <div key={i} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="font-semibold text-slate-700">{m.name}</span>
                                                <span className="text-slate-400 font-mono">Avg Cost: Rs. {m.costPerUnit}/kg</span>
                                            </div>
                                            <div className="grid grid-cols-3 gap-3 items-center">
                                                <div>
                                                    <span className="text-[10px] text-slate-400 block mb-1">Standard BOM</span>
                                                    <span className="font-medium text-slate-700 text-sm">{m.standardQuantity.toFixed(2)} {m.unit}</span>
                                                </div>
                                                <div>
                                                    <label className="text-[10px] text-slate-400 block mb-1 font-semibold text-primary-600">Actual Loaded ({m.unit})</label>
                                                    <input
                                                        type="number"
                                                        value={m.actualQuantity}
                                                        onChange={e => handleActualChange(i, e.target.value)}
                                                        className="form-input py-1 px-2 text-xs font-bold"
                                                        min={0}
                                                    />
                                                </div>
                                                <div>
                                                    <span className="text-[10px] text-slate-400 block mb-1">Standard Waste</span>
                                                    <span className={`font-bold text-xs ${waste > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                                        {waste > 0 ? `+${waste.toFixed(2)}` : waste.toFixed(2)} {m.unit}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="block text-slate-600 text-sm font-medium mb-1">Operator run notes</label>
                        <textarea value={entryForm.notes} onChange={e => setEntryForm(f => ({ ...f, notes: e.target.value }))} className="form-input" rows={2} placeholder="Specify notes for this specific extrusion line..." />
                    </div>

                    {entryForm.materials.length > 0 && (
                        <div className="flex items-center justify-between py-3 px-4 bg-slate-50 rounded-xl border border-slate-200 text-sm font-medium">
                            <span className="text-slate-500">Entry cost contribution:</span>
                            <span className="text-amber-600 font-bold text-lg">Rs. {Math.round(totalEntryCost).toLocaleString()}</span>
                        </div>
                    )}

                    <div className="flex gap-3">
                        <button onClick={handleAddEntry} disabled={submitting} className="btn-primary flex-1 flex items-center justify-center gap-2">
                            <MdFactory size={18} /> {submitting ? 'Recording entry...' : 'Confirm & Add Entry'}
                        </button>
                        <button onClick={() => setEntryModalOpen(false)} className="btn-secondary flex-1">Cancel</button>
                    </div>
                </div>
            </Modal>

            {/* End Session & Audit Modal */}
            <Modal isOpen={endModalOpen} onClose={() => setEndModalOpen(false)} title="Audit & Close Production Run Session" size="xl">
                <div className="space-y-4">
                    <p className="text-xs text-slate-500">
                        Review the compiled materials loaded during this session. Physically recount the warehouse remaining stock and input it below. The system automatically computes final session waste variances.
                    </p>

                    <div className="table-responsive max-h-72 overflow-y-auto border border-slate-100 rounded-xl">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Material Description</th>
                                    <th>Total Used In Run</th>
                                    <th>System Est. Stock</th>
                                    <th>Physical Count Remaining *</th>
                                </tr>
                            </thead>
                            <tbody>
                                {endForm.physicalInputs.map((item, idx) => (
                                    <tr key={item.rawMaterial}>
                                        <td className="font-semibold text-slate-800 text-sm">{item.name}</td>
                                        <td className="font-bold text-indigo-600 text-xs">{item.totalUsed.toFixed(1)} {item.unit}</td>
                                        <td className="text-slate-500 font-mono text-xs">{item.systemRemaining.toFixed(1)} {item.unit}</td>
                                        <td>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="number"
                                                    value={item.physicalRemaining}
                                                    onChange={e => handlePhysicalRemainingChange(idx, e.target.value)}
                                                    className="form-input py-1.5 px-3 max-w-[120px] font-bold text-xs"
                                                    min={0}
                                                />
                                                <span className="text-slate-400 font-medium text-xs">{item.unit}</span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div>
                        <label className="block text-slate-600 text-sm font-medium mb-1">Final audit / close notes</label>
                        <textarea value={endForm.notes} onChange={e => setEndForm(f => ({ ...f, notes: e.target.value }))} className="form-input" rows={2} placeholder="Explain recount discrepancies, bulk waste logs..." />
                    </div>

                    <div className="flex gap-3">
                        <button onClick={handleEndSession} disabled={submitting} className="btn-primary flex-1 flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-700">
                            <MdCheckCircle size={18} /> {submitting ? 'Auditing and closing...' : 'Audited & End Session'}
                        </button>
                        <button onClick={() => setEndModalOpen(false)} className="btn-secondary flex-1">Cancel</button>
                    </div>
                </div>
            </Modal>

            {/* Session Detail Modal (Historical view) */}
            <Modal isOpen={detailModal.open} onClose={() => setDetailModal({ open: false, data: null, entries: [] })} title="Production Session Summary Sheet" size="xl">
                {detailModal.data && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs">
                            <div className="space-y-1">
                                <p className="text-slate-400">Session ID</p>
                                <p className="font-mono font-bold text-slate-800">{detailModal.data._id}</p>
                                <p className="text-[10px] text-indigo-600 font-bold">{detailModal.data.sessionNumber}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-slate-400">Session period</p>
                                <p className="font-semibold text-slate-700">
                                    Start: {new Date(detailModal.data.startTime).toLocaleString()}
                                </p>
                                <p className="font-semibold text-slate-700">
                                    End: {detailModal.data.endTime ? new Date(detailModal.data.endTime).toLocaleString() : 'Active'}
                                </p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-slate-400">Totals summary</p>
                                <p className="font-bold text-slate-800">Manufacturing Cost: Rs. {Number(detailModal.data.totalManufacturingCost || 0).toLocaleString()}</p>
                                <p className="font-bold text-indigo-600">Pipes Manufactured: {detailModal.data.totalProductsManufactured} units</p>
                                <p className="text-slate-500">Operator: {detailModal.data.createdBy?.name || 'Store Manager'}</p>
                            </div>
                        </div>

                        {/* Audited Waste summary */}
                        {detailModal.data.status === 'closed' && (
                            <div className="space-y-3">
                                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                                    <MdOutlineScale size={18} className="text-slate-500" /> Audited Raw Material Remaining & Waste Variance
                                </h3>
                                <div className="table-responsive border border-slate-100 rounded-xl overflow-hidden">
                                    <table className="data-table">
                                        <thead>
                                            <tr>
                                                <th>Material</th>
                                                <th>Material Used</th>
                                                <th>Material Remaining</th>
                                                <th>Waste</th>
                                                <th>Waste %</th>
                                                <th>Cost Valuation</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {detailModal.data.materialsSummary?.map(item => (
                                                <tr key={item._id}>
                                                    <td className="font-semibold text-slate-800">{item.rawMaterial?.name}</td>
                                                    <td>{item.totalUsed?.toFixed(1)} {item.rawMaterial?.unit}</td>
                                                    <td>{item.physicalRemaining?.toFixed(1)} {item.rawMaterial?.unit}</td>
                                                    <td className={`font-bold ${item.waste > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                                        {item.waste?.toFixed(1)} {item.rawMaterial?.unit}
                                                    </td>
                                                    <td className="font-mono font-bold text-slate-700">{item.wastePercentage}%</td>
                                                    <td className="font-bold text-amber-600">Rs. {Number(item.cost || 0).toLocaleString()}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Session entries */}
                        <div className="space-y-3">
                            <h3 className="font-bold text-slate-800 text-sm">Session Line Output Entries ({detailModal.entries?.length || 0} entries)</h3>
                            <div className="table-responsive border border-slate-100 rounded-xl overflow-hidden">
                                <table className="data-table text-xs">
                                    <thead>
                                        <tr>
                                            <th>Time</th>
                                            <th>Product Model</th>
                                            <th>Quantity</th>
                                            <th>Weight</th>
                                            <th>Mfg Cost</th>
                                            <th>Operator Notes</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {detailModal.entries?.map(entry => (
                                            <tr key={entry._id}>
                                                <td className="font-mono text-slate-500">
                                                    {new Date(entry.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </td>
                                                <td className="font-semibold">{entry.model?.name}</td>
                                                <td className="font-bold text-indigo-600">{entry.quantity} units</td>
                                                <td>{entry.actualWeight} kg</td>
                                                <td className="font-bold text-amber-600">Rs. {Number(entry.totalManufacturingCost || 0).toLocaleString()}</td>
                                                <td className="italic text-slate-400">{entry.notes || '—'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {detailModal.data.notes && (
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs">
                                <p className="font-bold text-slate-700 mb-1">Session Logs & Notes:</p>
                                <p className="text-slate-500 italic whitespace-pre-wrap">{detailModal.data.notes}</p>
                            </div>
                        )}

                        <div className="flex gap-3">
                            {detailModal.data.status === 'closed' && hasRole('admin') && (
                                <button onClick={() => handleReopenSession(detailModal.data._id)} className="btn-secondary flex-1 flex items-center justify-center gap-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-200">
                                    <MdLockOpen size={18} /> Reopen Session (Admin Only)
                                </button>
                            )}
                            <button onClick={() => setDetailModal({ open: false, data: null, entries: [] })} className="btn-primary flex-1">
                                Close summary
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default Production;
