import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { getProductions, createProduction, checkMaterialAvailability, getAllModels } from '../services/api';
import Modal from '../components/Modal';
import { SkeletonTable } from '../components/Skeleton';
import { MdAdd, MdFactory, MdCheckCircle, MdCancel } from 'react-icons/md';
import toast from 'react-hot-toast';

const Production = () => {
    const [productions, setProductions] = useState([]);
    const [models, setModels] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState({ open: false });
    const [form, setForm] = useState({ model: '', quantity: 1, notes: '' });
    const [availability, setAvailability] = useState(null);
    const [checking, setChecking] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const fetchAll = async () => {
        setLoading(true);
        try {
            const [p, m] = await Promise.all([getProductions({ page, limit: 10 }), getAllModels()]);
            setProductions(p.data.productions || []);
            setTotalPages(p.data.pages || 1);
            setModels(m.data || []);
        } catch { toast.error('Failed to load'); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchAll(); }, [page]);

    const checkAvailability = async () => {
        if (!form.model || !form.quantity) return;
        setChecking(true);
        try {
            const { data } = await checkMaterialAvailability({ model: form.model, quantity: Number(form.quantity) });
            setAvailability(data);
        } catch (e) { toast.error(e.response?.data?.message || 'Error checking'); }
        finally { setChecking(false); }
    };

    const submitProduction = async () => {
        setSubmitting(true);
        try {
            await createProduction({ model: form.model, quantity: Number(form.quantity), notes: form.notes });
            toast.success('Production completed! Stock updated.');
            setModal({ open: false });
            setForm({ model: '', quantity: 1, notes: '' });
            setAvailability(null);
            fetchAll();
        } catch (e) { toast.error(e.response?.data?.message || 'Production failed'); }
        finally { setSubmitting(false); }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold gradient-text">Production</h1>
                    <p className="text-slate-500 mt-1">Manufacturing orders and history</p>
                </div>
                <button onClick={() => { setModal({ open: true }); setAvailability(null); setForm({ model: '', quantity: 1, notes: '' }); }} className="btn-primary flex items-center gap-2">
                    <MdAdd size={20} /> New Production
                </button>
            </div>

            {loading ? <SkeletonTable rows={5} cols={5} /> : (
                <div className="glass-card overflow-hidden">
                    <div className="table-responsive">
                        <table className="data-table">
                            <thead><tr><th>Date</th><th>Model</th><th>Product</th><th>Quantity</th><th>Mfg Cost</th><th>Status</th></tr></thead>
                            <tbody>
                                {productions.map(p => (
                                    <motion.tr key={p._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                        <td className="text-slate-500">{new Date(p.date).toLocaleDateString()}</td>
                                        <td className="font-semibold text-slate-800">{p.model?.name}</td>
                                        <td className="text-slate-600 font-medium">{p.model?.product?.name}</td>
                                        <td className="text-purple-600 font-bold">{p.quantity} units</td>
                                        <td className="text-amber-600 font-bold">Rs. {Number(p.totalManufacturingCost).toLocaleString()}</td>
                                        <td><span className={p.status === 'completed' ? 'badge-success' : 'badge-danger'}>{p.status}</span></td>
                                    </motion.tr>
                                ))}
                                {!productions.length && <tr><td colSpan={6} className="text-center text-slate-400 py-8">No production records yet</td></tr>}
                            </tbody>
                        </table>
                    </div>
                    {totalPages > 1 && (
                        <div className="flex justify-center gap-2 p-4 border-t border-slate-100">
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                                <button key={p} onClick={() => setPage(p)} className={`w-8 h-8 rounded-lg text-sm font-bold transition-all ${page === p ? 'bg-navy-700 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>{p}</button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* New Production Modal */}
            <Modal isOpen={modal.open} onClose={() => setModal({ open: false })} title="New Production Order" size="lg">
                <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-slate-600 text-sm font-medium mb-1">Select Model</label>
                            <select value={form.model} onChange={e => { setForm(f => ({ ...f, model: e.target.value })); setAvailability(null); }} className="form-input">
                                <option value="">Choose model...</option>
                                {models.map(m => <option key={m._id} value={m._id}>{m.name} ({m.product?.name})</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-slate-600 text-sm font-medium mb-1">Quantity</label>
                            <input type="number" value={form.quantity} onChange={e => { setForm(f => ({ ...f, quantity: e.target.value })); setAvailability(null); }} className="form-input" min={1} />
                        </div>
                    </div>

                    <button onClick={checkAvailability} disabled={!form.model || !form.quantity || checking} className="btn-secondary w-full flex items-center justify-center gap-2">
                        {checking ? <><span className="animate-spin">⟳</span> Checking...</> : '🔍 Check Material Availability'}
                    </button>

                    {/* Availability Results */}
                    {availability && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                            <p className={`font-bold mb-3 flex items-center gap-2 ${availability.canProduce ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {availability.canProduce ? <MdCheckCircle size={20} /> : <MdCancel size={20} />}
                                {availability.canProduce ? 'All materials available! Ready to produce.' : 'Insufficient materials!'}
                            </p>
                            <div className="space-y-2">
                                {availability.availability.map((item, i) => (
                                    <div key={i} className="flex items-center justify-between py-1.5 px-3 bg-white rounded-lg border border-slate-100 shadow-sm">
                                        <span className="text-slate-700 text-sm font-medium">{item.name}</span>
                                        <div className="flex items-center gap-3 text-xs">
                                            <span className="text-slate-500">Need: <span className="text-slate-700 font-bold">{item.required} {item.unit}</span></span>
                                            <span className="text-slate-500">Have: <span className={item.sufficient ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>{item.available} {item.unit}</span></span>
                                            {item.sufficient ? <MdCheckCircle className="text-emerald-500" size={16} /> : <MdCancel className="text-rose-500" size={16} />}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    <div><label className="block text-slate-600 text-sm font-medium mb-1">Notes</label><textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="form-input" rows={2} /></div>

                    <div className="flex gap-3">
                        <button onClick={submitProduction} disabled={!availability?.canProduce || submitting} className="btn-primary flex-1 flex items-center justify-center gap-2">
                            <MdFactory size={18} /> {submitting ? 'Processing...' : 'Start Production'}
                        </button>
                        <button onClick={() => setModal({ open: false })} className="btn-secondary flex-1">Cancel</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default Production;
