import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { getPurchases, createPurchase, getRawMaterials } from '../services/api';
import Modal from '../components/Modal';
import { SkeletonTable } from '../components/Skeleton';
import { MdAdd, MdDelete, MdLocalShipping } from 'react-icons/md';
import toast from 'react-hot-toast';

const emptyPurchase = { supplier: '', date: new Date().toISOString().split('T')[0], items: [{ rawMaterial: '', quantity: 1, rate: 0 }], notes: '' };

const Purchases = () => {
    const [purchases, setPurchases] = useState([]);
    const [rawMaterials, setRawMaterials] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState({ open: false, data: emptyPurchase });
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const fetchAll = async () => {
        setLoading(true);
        try {
            const [p, rm] = await Promise.all([getPurchases({ page, limit: 10 }), getRawMaterials()]);
            setPurchases(p.data.purchases || []);
            setTotalPages(p.data.pages || 1);
            setRawMaterials(rm.data || []);
        } catch { toast.error('Failed to load'); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchAll(); }, [page]);

    const addItem = () => setModal(p => ({ ...p, data: { ...p.data, items: [...p.data.items, { rawMaterial: '', quantity: 1, rate: 0 }] } }));
    const removeItem = (i) => setModal(p => ({ ...p, data: { ...p.data, items: p.data.items.filter((_, idx) => idx !== i) } }));
    const updateItem = (i, field, value) => setModal(p => {
        const items = [...p.data.items];
        items[i] = { ...items[i], [field]: value };
        return { ...p, data: { ...p.data, items } };
    });

    const totalCost = modal.data.items.reduce((s, i) => s + (Number(i.quantity) * Number(i.rate)), 0);

    const savePurchase = async () => {
        try {
            await createPurchase(modal.data);
            toast.success('Purchase recorded & stock updated!');
            setModal({ open: false, data: emptyPurchase });
            fetchAll();
        } catch (e) { toast.error(e.response?.data?.message || 'Error'); }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold gradient-text">Purchases</h1>
                    <p className="text-slate-500 mt-1">Truck incoming & raw material purchases</p>
                </div>
                <button onClick={() => setModal({ open: true, data: emptyPurchase })} className="btn-primary flex items-center gap-2">
                    <MdAdd size={20} /> New Purchase
                </button>
            </div>

            {loading ? <SkeletonTable rows={5} cols={5} /> : (
                <div className="glass-card overflow-hidden">
                    <div className="table-responsive">
                        <table className="data-table">
                            <thead><tr><th>Date</th><th>Supplier</th><th>Items</th><th>Total Cost</th></tr></thead>
                            <tbody>
                                {purchases.map(p => (
                                    <motion.tr key={p._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                        <td className="text-slate-500">{new Date(p.date).toLocaleDateString()}</td>
                                        <td className="font-semibold text-slate-800 flex items-center gap-2"><MdLocalShipping className="text-primary-600" />{p.supplier}</td>
                                        <td>
                                            <div className="flex flex-wrap gap-1">
                                                {p.items.map((item, i) => (
                                                    <span key={i} className="badge-slate text-[10px]">{item.rawMaterial?.name} ×{item.quantity}</span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="text-emerald-600 font-bold">Rs. {Number(p.totalCost).toLocaleString()}</td>
                                    </motion.tr>
                                ))}
                                {!purchases.length && <tr><td colSpan={4} className="text-center text-slate-400 py-8">No purchases yet</td></tr>}
                            </tbody>
                        </table>
                    </div>
                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex justify-center gap-2 p-4 border-t border-slate-100">
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                                <button key={p} onClick={() => setPage(p)} className={`w-8 h-8 rounded-lg text-sm font-bold transition-all ${page === p ? 'bg-navy-700 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>{p}</button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* New Purchase Modal */}
            <Modal isOpen={modal.open} onClose={() => setModal({ open: false, data: emptyPurchase })} title="New Purchase Entry" size="lg">
                <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div><label className="block text-slate-600 text-sm font-medium mb-1">Supplier Name</label><input value={modal.data.supplier} onChange={e => setModal(p => ({ ...p, data: { ...p.data, supplier: e.target.value } }))} className="form-input" placeholder="Supplier name" /></div>
                        <div><label className="block text-slate-600 text-sm font-medium mb-1">Date</label><input type="date" value={modal.data.date} onChange={e => setModal(p => ({ ...p, data: { ...p.data, date: e.target.value } }))} className="form-input" /></div>
                    </div>

                    {/* Items */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-slate-600 text-sm font-bold">Purchase Items</label>
                            <button onClick={addItem} className="text-xs btn-secondary py-1 px-3">+ Add Item</button>
                        </div>
                        <div className="space-y-2">
                            {modal.data.items.map((item, i) => (
                                <div key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_80px_100px_36px] gap-2 items-center p-3 bg-slate-50 rounded-xl sm:bg-transparent sm:p-0 sm:rounded-none">
                                    <select value={item.rawMaterial} onChange={e => updateItem(i, 'rawMaterial', e.target.value)} className="form-input py-2 text-sm">
                                        <option value="">Select material</option>
                                        {rawMaterials.map(rm => <option key={rm._id} value={rm._id}>{rm.name} ({rm.unit})</option>)}
                                    </select>
                                    <div className="flex gap-2 sm:contents">
                                        <input type="number" value={item.quantity} onChange={e => updateItem(i, 'quantity', e.target.value)} className="form-input py-2 text-sm flex-1" placeholder="Qty" min={1} />
                                        <input type="number" value={item.rate} onChange={e => updateItem(i, 'rate', e.target.value)} className="form-input py-2 text-sm flex-1" placeholder="Rate" min={0} />
                                        <button onClick={() => removeItem(i)} className="p-2 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100"><MdDelete size={16} /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div><label className="block text-dark-300 text-sm mb-1">Notes</label><textarea value={modal.data.notes} onChange={e => setModal(p => ({ ...p, data: { ...p.data, notes: e.target.value } }))} className="form-input" rows={2} /></div>

                    <div className="flex items-center justify-between py-3 px-4 bg-slate-50 rounded-xl border border-slate-200">
                        <span className="text-slate-600 font-medium">Total Cost:</span>
                        <span className="text-emerald-600 font-bold text-lg">Rs. {totalCost.toLocaleString()}</span>
                    </div>

                    <div className="flex gap-3">
                        <button onClick={savePurchase} className="btn-primary flex-1">Record Purchase</button>
                        <button onClick={() => setModal({ open: false, data: emptyPurchase })} className="btn-secondary flex-1">Cancel</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default Purchases;
