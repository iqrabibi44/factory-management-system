import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { getRawMaterials, createRawMaterial, updateRawMaterial, deleteRawMaterial, getFinishedGoods } from '../services/api';
import Modal from '../components/Modal';
import { SkeletonTable } from '../components/Skeleton';
import { MdAdd, MdEdit, MdDelete, MdSearch, MdWarning } from 'react-icons/md';
import toast from 'react-hot-toast';

const emptyMaterial = { name: '', quantity: 0, unit: 'pcs', costPerUnit: 0, lowStockThreshold: 10 };

const Inventory = () => {
    const [rawMaterials, setRawMaterials] = useState([]);
    const [finishedGoods, setFinishedGoods] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('raw');
    const [search, setSearch] = useState('');
    const [showLowStock, setShowLowStock] = useState(false);
    const [modal, setModal] = useState({ open: false, data: emptyMaterial, editing: null });

    const fetchAll = async () => {
        setLoading(true);
        try {
            const [rm, fg] = await Promise.all([getRawMaterials(), getFinishedGoods()]);
            setRawMaterials(rm.data || []);
            setFinishedGoods(fg.data || []);
        } catch { toast.error('Failed to load inventory'); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchAll(); }, []);

    const saveMaterial = async () => {
        try {
            if (modal.editing) { await updateRawMaterial(modal.editing, modal.data); toast.success('Updated'); }
            else { await createRawMaterial(modal.data); toast.success('Created'); }
            setModal({ open: false, data: emptyMaterial, editing: null });
            fetchAll();
        } catch (e) { toast.error(e.response?.data?.message || 'Error'); }
    };

    const removeMaterial = async (id) => {
        if (!confirm('Delete this raw material?')) return;
        try { await deleteRawMaterial(id); toast.success('Deleted'); fetchAll(); }
        catch { toast.error('Error'); }
    };

    const filtered = rawMaterials
        .filter(m => m.name.toLowerCase().includes(search.toLowerCase()))
        .filter(m => !showLowStock || m.isLowStock);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold gradient-text">Inventory</h1>
                    <p className="text-slate-500 mt-1">Raw materials and finished goods stock</p>
                </div>
                {activeTab === 'raw' && (
                    <button onClick={() => setModal({ open: true, data: emptyMaterial, editing: null })} className="btn-primary flex items-center gap-2 text-sm px-3 md:px-5">
                        <MdAdd size={20} /> <span className="hidden sm:inline">Add Material</span><span className="sm:hidden">Add</span>
                    </button>
                )}
            </div>

            {/* Tabs */}
            <div className="tabs-container">
                {[{ id: 'raw', label: 'Raw Materials' }, { id: 'finished', label: 'Finished Goods' }].map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                        className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}>
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Filters */}
            {activeTab === 'raw' && (
                <div className="flex gap-3 items-center">
                    <div className="relative flex-1 max-w-sm">
                        <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search materials..." className="form-input pl-10" />
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={showLowStock} onChange={e => setShowLowStock(e.target.checked)} className="w-4 h-4 accent-amber-500" />
                        <span className="text-amber-400 text-sm flex items-center gap-1"><MdWarning size={16} /> Low Stock Only</span>
                    </label>
                </div>
            )}

            {/* Raw Materials Table */}
            {activeTab === 'raw' && (
                loading ? <SkeletonTable rows={5} cols={5} /> : (
                    <div className="glass-card overflow-hidden">
                        <div className="table-responsive">
                            <table className="data-table">
                                <thead><tr><th>Name</th><th>Quantity</th><th>Unit</th><th>Cost/Unit</th><th>Status</th><th>Actions</th></tr></thead>
                                <tbody>
                                    {filtered.map(m => (
                                        <motion.tr key={m._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                            <td className="font-semibold text-slate-800">{m.name}</td>
                                            <td className={`font-bold ${m.isLowStock ? 'text-amber-600' : 'text-emerald-600'}`}>{m.quantity}</td>
                                            <td className="text-slate-500">{m.unit}</td>
                                            <td className="text-slate-600">Rs. {Number(m.costPerUnit).toLocaleString()}</td>
                                            <td>
                                                {m.isLowStock
                                                    ? <span className="badge-warning flex items-center gap-1 w-fit"><MdWarning size={12} /> Low Stock</span>
                                                    : <span className="badge-success">In Stock</span>}
                                            </td>
                                            <td>
                                                <div className="flex gap-2">
                                                    <button onClick={() => setModal({ open: true, data: { name: m.name, quantity: m.quantity, unit: m.unit, costPerUnit: m.costPerUnit, lowStockThreshold: m.lowStockThreshold }, editing: m._id })} className="p-2 rounded-lg bg-slate-100 hover:bg-primary-600 text-slate-500 hover:text-white transition-all"><MdEdit size={16} /></button>
                                                    <button onClick={() => removeMaterial(m._id)} className="p-2 rounded-lg bg-slate-100 hover:bg-rose-600 text-slate-500 hover:text-white transition-all"><MdDelete size={16} /></button>
                                                </div>
                                            </td>
                                        </motion.tr>
                                    ))}
                                    {!filtered.length && <tr><td colSpan={6} className="text-center text-slate-400 py-8">No materials found</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )
            )}

            {/* Finished Goods Table */}
            {activeTab === 'finished' && (
                loading ? <SkeletonTable rows={5} cols={4} /> : (
                    <div className="glass-card overflow-hidden">
                        <div className="table-responsive">
                            <table className="data-table">
                                <thead><tr><th>Model</th><th>Product</th><th>Category</th><th>Quantity</th><th>Status</th></tr></thead>
                                <tbody>
                                    {finishedGoods.map(fg => (
                                        <motion.tr key={fg._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                            <td className="font-semibold text-slate-800">{fg.model?.name}</td>
                                            <td className="text-slate-600 font-medium">{fg.model?.product?.name}</td>
                                            <td><span className="badge-primary">{fg.model?.product?.category}</span></td>
                                            <td className={`font-bold ${fg.isLowStock ? 'text-amber-600' : 'text-emerald-600'}`}>{fg.quantity} units</td>
                                            <td>
                                                {fg.isLowStock
                                                    ? <span className="badge-warning flex items-center gap-1 w-fit"><MdWarning size={12} /> Low Stock</span>
                                                    : <span className="badge-success">In Stock</span>}
                                            </td>
                                        </motion.tr>
                                    ))}
                                    {!finishedGoods.length && <tr><td colSpan={5} className="text-center text-slate-400 py-8">No finished goods yet</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )
            )}

            {/* Add/Edit Modal */}
            <Modal isOpen={modal.open} onClose={() => setModal({ open: false, data: emptyMaterial, editing: null })} title={modal.editing ? 'Edit Raw Material' : 'Add Raw Material'}>
                <div className="space-y-4">
                    <div><label className="block text-slate-600 text-sm font-medium mb-1">Name</label><input value={modal.data.name} onChange={e => setModal(p => ({ ...p, data: { ...p.data, name: e.target.value } }))} className="form-input" /></div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div><label className="block text-slate-600 text-sm font-medium mb-1">Quantity</label><input type="number" value={modal.data.quantity} onChange={e => setModal(p => ({ ...p, data: { ...p.data, quantity: e.target.value } }))} className="form-input" min={0} /></div>
                        <div><label className="block text-slate-600 text-sm font-medium mb-1">Unit</label><input value={modal.data.unit} onChange={e => setModal(p => ({ ...p, data: { ...p.data, unit: e.target.value } }))} className="form-input" placeholder="pcs, kg, meters..." /></div>
                        <div><label className="block text-slate-600 text-sm font-medium mb-1">Cost Per Unit (Rs.)</label><input type="number" value={modal.data.costPerUnit} onChange={e => setModal(p => ({ ...p, data: { ...p.data, costPerUnit: e.target.value } }))} className="form-input" min={0} /></div>
                        <div><label className="block text-slate-600 text-sm font-medium mb-1">Low Stock Threshold</label><input type="number" value={modal.data.lowStockThreshold} onChange={e => setModal(p => ({ ...p, data: { ...p.data, lowStockThreshold: e.target.value } }))} className="form-input" min={0} /></div>
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button onClick={saveMaterial} className="btn-primary flex-1">Save</button>
                        <button onClick={() => setModal({ open: false, data: emptyMaterial, editing: null })} className="btn-secondary flex-1">Cancel</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default Inventory;
