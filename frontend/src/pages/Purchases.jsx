import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { getPurchases, createPurchase, getRawMaterials, getVendors, getVendor } from '../services/api';
import Modal from '../components/Modal';
import { SkeletonTable } from '../components/Skeleton';
import { MdAdd, MdDelete, MdLocalShipping, MdSearch, MdBusiness, MdClose, MdReceipt, MdPayments } from 'react-icons/md';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

const emptyPurchase = {
    vendor: '',
    invoiceNo: '',
    date: new Date().toISOString().split('T')[0],
    items: [{ rawMaterial: '', quantity: 1, rate: 0, batchNumber: '' }],
    amountPaid: 0,
    notes: '',
};

const Purchases = () => {
    const [purchases, setPurchases] = useState([]);
    const [rawMaterials, setRawMaterials] = useState([]);
    const [vendors, setVendors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState({ open: false, data: emptyPurchase });
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // Vendor searchable dropdown state
    const [vendorSearch, setVendorSearch] = useState('');
    const [vendorDropdownOpen, setVendorDropdownOpen] = useState(false);
    const [selectedVendor, setSelectedVendor] = useState(null);
    const [selectedVendorFull, setSelectedVendorFull] = useState(null);
    const vendorRef = useRef(null);

    const fetchAll = async () => {
        setLoading(true);
        try {
            const [p, rm, v] = await Promise.all([
                getPurchases({ page, limit: 10 }),
                getRawMaterials(),
                getVendors(),
            ]);
            setPurchases(p.data.purchases || []);
            setTotalPages(p.data.pages || 1);
            setRawMaterials(rm.data || []);
            setVendors(v.data || []);
        } catch { toast.error('Failed to load'); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchAll(); }, [page]);

    // Close vendor dropdown when clicking outside
    useEffect(() => {
        const handler = (e) => {
            if (vendorRef.current && !vendorRef.current.contains(e.target)) {
                setVendorDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const openModal = () => {
        setModal({ open: true, data: emptyPurchase });
        setSelectedVendor(null);
        setSelectedVendorFull(null);
        setVendorSearch('');
    };
    const closeModal = () => {
        setModal({ open: false, data: emptyPurchase });
        setSelectedVendor(null);
        setSelectedVendorFull(null);
        setVendorSearch('');
    };

    const selectVendor = async (v) => {
        setSelectedVendor(v);
        setVendorSearch('');
        setVendorDropdownOpen(false);
        try {
            // Fetch detailed vendor data including dynamic outstanding balance
            const { data } = await getVendor(v._id);
            setSelectedVendorFull(data);
            setModal(p => ({ ...p, data: { ...p.data, vendor: v._id } }));
        } catch {
            toast.error('Failed to fetch vendor ledger balance');
            setModal(p => ({ ...p, data: { ...p.data, vendor: v._id } }));
        }
    };

    const clearVendor = () => {
        setSelectedVendor(null);
        setSelectedVendorFull(null);
        setModal(p => ({ ...p, data: { ...p.data, vendor: '' } }));
        setVendorSearch('');
    };

    const filteredVendors = vendors.filter(v =>
        !vendorSearch ||
        v.name.toLowerCase().includes(vendorSearch.toLowerCase()) ||
        (v.companyName && v.companyName.toLowerCase().includes(vendorSearch.toLowerCase()))
    );

    const addItem = () => setModal(p => ({ ...p, data: { ...p.data, items: [...p.data.items, { rawMaterial: '', quantity: 1, rate: 0, batchNumber: '' }] } }));
    const removeItem = (i) => setModal(p => ({ ...p, data: { ...p.data, items: p.data.items.filter((_, idx) => idx !== i) } }));
    const updateItem = (i, field, value) => setModal(p => {
        const items = [...p.data.items];
        items[i] = { ...items[i], [field]: value };
        return { ...p, data: { ...p.data, items } };
    });

    const baseCost = modal.data.items.reduce((s, i) => s + (Number(i.quantity) * Number(i.rate)), 0);
    // Auto-calculate GST if vendor has NTN/GST number (Standard 18% sales tax in Pakistan)
    const gstRate = selectedVendorFull?.ntn ? 0.18 : 0;
    const gstAmount = Math.round(baseCost * gstRate);
    const totalCost = baseCost + gstAmount;

    const savePurchase = async () => {
        if (!modal.data.vendor && !selectedVendor) {
            toast.error('Please select a vendor');
            return;
        }
        for (const item of modal.data.items) {
            if (!item.rawMaterial) {
                toast.error('Please select raw material');
                return;
            }
            if (!item.batchNumber || !item.batchNumber.trim()) {
                toast.error('Please enter batch number for all items');
                return;
            }
        }
        try {
            await createPurchase(modal.data);
            toast.success('Purchase recorded & stock updated!');
            closeModal();
            fetchAll();
        } catch (e) { toast.error(e.response?.data?.message || 'Error'); }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold gradient-text">Purchases</h1>
                    <p className="text-slate-500 mt-1">Incoming raw material purchases (Pipe Factory Raw Additives)</p>
                </div>
                <button onClick={openModal} className="btn-primary flex items-center gap-2">
                    <MdAdd size={20} /> New Purchase
                </button>
            </div>

            {loading ? <SkeletonTable rows={5} cols={5} /> : (
                <div className="glass-card overflow-hidden">
                    <div className="table-responsive">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Vendor / Supplier</th>
                                    <th>Invoice No.</th>
                                    <th>Items</th>
                                    <th>Paid Status</th>
                                    <th>Total Cost</th>
                                </tr>
                            </thead>
                            <tbody>
                                {purchases.map(p => (
                                    <motion.tr key={p._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                        <td className="text-slate-500">{new Date(p.date).toLocaleDateString()}</td>
                                        <td>
                                            <div className="flex items-center gap-2">
                                                <div className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
                                                    <MdLocalShipping className="text-indigo-600" size={14} />
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-slate-800">
                                                        {p.vendor?.name || p.supplier || '—'}
                                                    </p>
                                                    {p.vendor?.companyName && (
                                                        <p className="text-xs text-slate-400">{p.vendor.companyName}</p>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="text-slate-500 font-mono text-sm">{p.invoiceNo || '—'}</td>
                                        <td>
                                            <div className="flex flex-wrap gap-1">
                                                {p.items.map((item, i) => (
                                                    <span key={i} className="badge-slate text-[10px]">{item.rawMaterial?.name} ×{item.quantity}</span>
                                                ))}
                                            </div>
                                        </td>
                                        <td>
                                            <div className="text-xs">
                                                <p className="font-medium text-slate-700">Paid: Rs. {Number(p.amountPaid || 0).toLocaleString()}</p>
                                                <p className="text-slate-400">Bal: Rs. {Number(p.totalCost - (p.amountPaid || 0)).toLocaleString()}</p>
                                            </div>
                                        </td>
                                        <td className="text-emerald-600 font-bold">Rs. {Number(p.totalCost).toLocaleString()}</td>
                                    </motion.tr>
                                ))}
                                {!purchases.length && <tr><td colSpan={6} className="text-center text-slate-400 py-8">No purchases yet</td></tr>}
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

            {/* New Purchase Modal */}
            <Modal isOpen={modal.open} onClose={closeModal} title="New Purchase Entry" size="lg">
                <div className="space-y-4">
                    {/* Vendor Searchable Dropdown */}
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <label className="block text-slate-600 text-sm font-medium">Vendor *</label>
                            <Link to="/vendors" className="text-xs text-primary-600 hover:text-primary-700 font-medium" onClick={closeModal}>
                                + Add New Vendor
                            </Link>
                        </div>

                        {selectedVendorFull ? (
                            /* Selected Vendor details auto-filled card as per requirements */
                            <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm">
                                            {selectedVendorFull.name[0]?.toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-slate-800 text-sm">{selectedVendorFull.name}</p>
                                            {selectedVendorFull.companyName && <p className="text-xs text-slate-400">{selectedVendorFull.companyName}</p>}
                                        </div>
                                    </div>
                                    <button onClick={clearVendor} className="p-1.5 rounded-lg hover:bg-indigo-100/50 text-slate-400 hover:text-slate-600 transition-colors">
                                        <MdClose size={18} />
                                    </button>
                                </div>
                                <div className="grid grid-cols-2 gap-3 text-xs border-t border-indigo-100/50 pt-3 text-slate-600">
                                    <div><span className="text-slate-400 block">📞 Contact Number</span> <span className="font-medium text-slate-800">{selectedVendorFull.mobile || '—'}</span></div>
                                    <div><span className="text-slate-400 block">💸 Previous Balance</span> <span className={`font-bold ${selectedVendorFull.outstandingBalance > 0 ? 'text-rose-600' : 'text-slate-500'}`}>Rs. {Number(selectedVendorFull.outstandingBalance || 0).toLocaleString()}</span></div>
                                    <div><span className="text-slate-400 block">📅 Payment Terms</span> <span className="font-medium text-indigo-600">{selectedVendorFull.paymentTerms || '—'}</span></div>
                                    <div><span className="text-slate-400 block">🧾 GST / NTN</span> <span className="font-medium text-slate-800 font-mono">{selectedVendorFull.ntn || 'Non-Taxpayer'}</span></div>
                                    <div className="col-span-2"><span className="text-slate-400 block">📍 Address</span> <span className="font-medium text-slate-800">{selectedVendorFull.address || '—'}</span></div>
                                </div>
                            </div>
                        ) : (
                            /* Vendor Search Input + Dropdown */
                            <div ref={vendorRef} className="relative">
                                <div className="relative">
                                    <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input
                                        type="text"
                                        placeholder="Search vendor by name..."
                                        value={vendorSearch}
                                        onChange={e => { setVendorSearch(e.target.value); setVendorDropdownOpen(true); }}
                                        onFocus={() => setVendorDropdownOpen(true)}
                                        className="form-input pl-9"
                                    />
                                </div>
                                {vendorDropdownOpen && (
                                    <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-52 overflow-y-auto">
                                        {filteredVendors.length === 0 ? (
                                            <div className="p-4 text-center text-slate-400 text-sm">
                                                <MdBusiness size={24} className="mx-auto mb-1 text-slate-200" />
                                                No vendors found.{' '}
                                                <Link to="/vendors" className="text-primary-600 hover:underline" onClick={closeModal}>Add vendor</Link>
                                            </div>
                                        ) : (
                                            filteredVendors.map(v => (
                                                <button
                                                    key={v._id}
                                                    onClick={() => selectVendor(v)}
                                                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-indigo-50 text-left transition-colors border-b border-slate-50 last:border-0"
                                                >
                                                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                                                        {v.name[0]?.toUpperCase()}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-semibold text-slate-800 text-sm truncate">{v.name}</p>
                                                        <p className="text-xs text-slate-400 truncate">{v.companyName || v.mobile || ''}</p>
                                                    </div>
                                                    {v.paymentTerms && (
                                                        <span className="ml-auto text-[10px] font-semibold px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full flex-shrink-0">
                                                            {v.paymentTerms}
                                                        </span>
                                                    )}
                                                </button>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-slate-600 text-sm font-medium mb-1">Invoice No. (Optional)</label>
                            <input
                                value={modal.data.invoiceNo}
                                onChange={e => setModal(p => ({ ...p, data: { ...p.data, invoiceNo: e.target.value } }))}
                                className="form-input"
                                placeholder="e.g. INV-10204"
                            />
                        </div>
                        <div>
                            <label className="block text-slate-600 text-sm font-medium mb-1">Date</label>
                            <input
                                type="date"
                                value={modal.data.date}
                                onChange={e => setModal(p => ({ ...p, data: { ...p.data, date: e.target.value } }))}
                                className="form-input"
                            />
                        </div>
                    </div>

                    {/* Items */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-slate-600 text-sm font-bold">Purchase Items</label>
                            <button onClick={addItem} className="text-xs btn-secondary py-1 px-3">+ Add Item</button>
                        </div>
                        <div className="space-y-2">
                            {modal.data.items.map((item, i) => (
                                <div key={i} className="grid grid-cols-1 sm:grid-cols-[1.5fr_1fr_80px_100px_36px] gap-2 items-center p-3 bg-slate-50 rounded-xl sm:bg-transparent sm:p-0 sm:rounded-none">
                                    <select value={item.rawMaterial} onChange={e => updateItem(i, 'rawMaterial', e.target.value)} className="form-input py-2 text-sm">
                                        <option value="">Select material</option>
                                        {rawMaterials.map(rm => <option key={rm._id} value={rm._id}>{rm.name} ({rm.unit})</option>)}
                                    </select>
                                    <input
                                        type="text"
                                        value={item.batchNumber}
                                        onChange={e => updateItem(i, 'batchNumber', e.target.value)}
                                        className="form-input py-2 text-sm"
                                        placeholder="Batch No."
                                        required
                                    />
                                    <div className="flex gap-2 sm:contents">
                                        <input type="number" value={item.quantity} onChange={e => updateItem(i, 'quantity', e.target.value)} className="form-input py-2 text-sm flex-1" placeholder="Qty" min={1} />
                                        <input type="number" value={item.rate} onChange={e => updateItem(i, 'rate', e.target.value)} className="form-input py-2 text-sm flex-1" placeholder="Rate" min={0} />
                                        <button onClick={() => removeItem(i)} className="p-2 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100"><MdDelete size={16} /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Cost Calculations & Payment */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-slate-600 text-sm font-medium mb-1">Amount Paid (Rs.)</label>
                            <div className="relative">
                                <MdPayments className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input
                                    type="number"
                                    value={modal.data.amountPaid}
                                    onChange={e => setModal(p => ({ ...p, data: { ...p.data, amountPaid: e.target.value } }))}
                                    className="form-input pl-9"
                                    placeholder="0"
                                    min={0}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-slate-600 text-sm font-medium mb-1">Notes</label>
                            <input
                                value={modal.data.notes}
                                onChange={e => setModal(p => ({ ...p, data: { ...p.data, notes: e.target.value } }))}
                                className="form-input"
                                placeholder="Optional notes"
                            />
                        </div>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 text-sm">
                        <div className="flex justify-between text-slate-600">
                            <span>Base Cost:</span>
                            <span className="font-semibold">Rs. {baseCost.toLocaleString()}</span>
                        </div>
                        {selectedVendorFull?.ntn && (
                            <div className="flex justify-between text-slate-500 text-xs">
                                <span>Sales Tax (18% GST Registered):</span>
                                <span>Rs. {gstAmount.toLocaleString()}</span>
                            </div>
                        )}
                        <div className="flex justify-end text-[10px] text-amber-600 font-medium">
                            {selectedVendorFull?.ntn ? '✔️ GST auto-applied (Registered NTN)' : '⚠️ Tax invoice unavailable (Unregistered Vendor)'}
                        </div>
                        <div className="flex justify-between border-t border-slate-200 pt-1.5 text-base font-bold text-slate-800">
                            <span>Total Invoice Cost:</span>
                            <span className="text-indigo-600">Rs. {totalCost.toLocaleString()}</span>
                        </div>
                        {modal.data.amountPaid > 0 && (
                            <div className="flex justify-between text-slate-500 text-xs pt-1 border-dashed border-t border-slate-200">
                                <span>Outstanding Ledger Addition:</span>
                                <span className="font-semibold text-rose-500">Rs. {Math.max(0, totalCost - Number(modal.data.amountPaid)).toLocaleString()}</span>
                            </div>
                        )}
                    </div>

                    <div className="flex gap-3">
                        <button onClick={savePurchase} className="btn-primary flex-1">Record Purchase</button>
                        <button onClick={closeModal} className="btn-secondary flex-1">Cancel</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default Purchases;
