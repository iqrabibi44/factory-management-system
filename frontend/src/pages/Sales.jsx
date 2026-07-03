import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { getSales, createSale, getSale, getAllModels, getFinishedGoods, getCustomers, getCustomer } from '../services/api';
import Modal from '../components/Modal';
import { SkeletonTable } from '../components/Skeleton';
import { MdAdd, MdDelete, MdReceipt, MdPrint, MdSearch, MdPeople, MdClose, MdPayments } from 'react-icons/md';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

const emptySale = {
    customerRef: '',
    customer: '',
    customerPhone: '',
    customerAddress: '',
    items: [{ model: '', quantity: 1, price: 0 }],
    discount: 0,
    amountPaid: 0,
    notes: '',
};

const Sales = () => {
    const [sales, setSales] = useState([]);
    const [models, setModels] = useState([]);
    const [finishedGoods, setFinishedGoods] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState({ open: false, data: emptySale });
    const [searchTerm, setSearchTerm] = useState('');
    const [invoiceModal, setInvoiceModal] = useState({ open: false, sale: null });
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // Customer searchable dropdown state
    const [customerSearch, setCustomerSearch] = useState('');
    const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [selectedCustomerFull, setSelectedCustomerFull] = useState(null);
    const customerRef = useRef(null);

    const fetchAll = async () => {
        setLoading(true);
        try {
            const [s, m, fg, c] = await Promise.all([
                getSales({ page, limit: 10 }),
                getAllModels(),
                getFinishedGoods(),
                getCustomers(),
            ]);
            setSales(s.data.sales || []);
            setTotalPages(s.data.pages || 1);
            setModels(m.data || []);
            setFinishedGoods(fg.data || []);
            setCustomers(c.data || []);
        } catch { toast.error('Failed to load'); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchAll(); }, [page]);

    // Close customer dropdown on outside click
    useEffect(() => {
        const handler = (e) => {
            if (customerRef.current && !customerRef.current.contains(e.target)) {
                setCustomerDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const openModal = () => {
        setModal({ open: true, data: emptySale });
        setSelectedCustomer(null);
        setSelectedCustomerFull(null);
        setCustomerSearch('');
    };
    const closeModal = () => {
        setModal({ open: false, data: emptySale });
        setSelectedCustomer(null);
        setSelectedCustomerFull(null);
        setCustomerSearch('');
    };

    const selectCustomer = async (c) => {
        setSelectedCustomer(c);
        setCustomerSearch('');
        setCustomerDropdownOpen(false);
        try {
            // Fetch detailed customer details (including dynamic outstanding balance calculated by backend)
            const { data } = await getCustomer(c._id);
            setSelectedCustomerFull(data);
            setModal(p => ({
                ...p,
                data: {
                    ...p.data,
                    customerRef: c._id,
                    customer: c.name,
                    customerPhone: c.mobile || '',
                    customerAddress: c.address || '',
                },
            }));
        } catch {
            toast.error('Failed to load customer outstanding details');
            setModal(p => ({
                ...p,
                data: {
                    ...p.data,
                    customerRef: c._id,
                    customer: c.name,
                    customerPhone: c.mobile || '',
                    customerAddress: c.address || '',
                },
            }));
        }
    };

    const clearCustomer = () => {
        setSelectedCustomer(null);
        setSelectedCustomerFull(null);
        setModal(p => ({ ...p, data: { ...p.data, customerRef: '', customer: '', customerPhone: '', customerAddress: '' } }));
        setCustomerSearch('');
    };

    const filteredCustomers = customers.filter(c =>
        !customerSearch ||
        c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
        (c.companyName && c.companyName.toLowerCase().includes(customerSearch.toLowerCase()))
    );

    // Avatar colour from name
    const avatarColor = (name = '') => {
        const colors = ['from-emerald-500 to-teal-600', 'from-violet-500 to-purple-600', 'from-rose-500 to-pink-600', 'from-amber-500 to-orange-600', 'from-sky-500 to-blue-600'];
        return colors[name.charCodeAt(0) % colors.length];
    };

    const addItem = () => {
        const lastItem = modal.data.items[modal.data.items.length - 1];
        if (lastItem && !lastItem.model) return;
        setModal(p => ({ ...p, data: { ...p.data, items: [...p.data.items, { model: '', quantity: 1, price: 0 }] } }));
    };
    const removeItem = (i) => setModal(p => ({ ...p, data: { ...p.data, items: p.data.items.filter((_, idx) => idx !== i) } }));
    const updateItem = (i, field, value) => {
        setModal(p => {
            const items = [...p.data.items];
            if (field === 'model' && value) {
                const existingIdx = items.findIndex((item, idx) => item.model === value && idx !== i);
                if (existingIdx !== -1) {
                    items[existingIdx].quantity = Number(items[existingIdx].quantity) + Number(items[i].quantity);
                    toast.success('Combined with existing item');
                    return { ...p, data: { ...p.data, items: items.filter((_, idx) => idx !== i) } };
                }
            }
            items[i] = { ...items[i], [field]: value };
            if (field === 'model') {
                const m = models.find(m => m._id === value);
                if (m) items[i].price = m.price;
            }
            return { ...p, data: { ...p.data, items } };
        });
    };

    const getStock = (modelId) => finishedGoods.find(fg => fg.model?._id === modelId)?.quantity || 0;

    const subtotal = modal.data.items.reduce((s, i) => s + (Number(i.quantity) * Number(i.price)), 0);
    const total = subtotal - Number(modal.data.discount || 0);

    const addSpecificItem = (model) => {
        setModal(p => {
            const items = [...p.data.items].filter(i => i.model !== '');
            const existingIdx = items.findIndex(i => i.model === model._id);
            if (existingIdx !== -1) {
                items[existingIdx].quantity = Number(items[existingIdx].quantity) + 1;
                toast.success(`Increased ${model.name} quantity`);
            } else {
                items.push({ model: model._id, quantity: 1, price: model.price });
                toast.success(`Added ${model.name}`);
            }
            return { ...p, data: { ...p.data, items } };
        });
    };

    const saveSale = async () => {
        if (!modal.data.customer.trim() && !selectedCustomer) {
            toast.error('Please select or enter a customer');
            return;
        }
        try {
            await createSale(modal.data);
            toast.success('Sale recorded! Invoice generated.');
            closeModal();
            fetchAll();
        } catch (e) { toast.error(e.response?.data?.message || 'Error'); }
    };

    const viewInvoice = async (id) => {
        try {
            const { data } = await getSale(id);
            setInvoiceModal({ open: true, sale: data });
        } catch { toast.error('Failed to load invoice'); }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold gradient-text">Sales</h1>
                    <p className="text-slate-500 mt-1">Dispatch orders and invoices (Pipe Factory Shipments)</p>
                </div>
                <button onClick={openModal} className="btn-primary flex items-center gap-2">
                    <MdAdd size={20} /> New Sale
                </button>
            </div>

            {loading ? <SkeletonTable rows={5} cols={5} /> : (
                <div className="glass-card overflow-hidden">
                    <div className="table-responsive">
                        <table className="data-table">
                            <thead><tr><th>Invoice</th><th>Date</th><th>Customer</th><th>Items</th><th>Received Status</th><th>Total</th><th>Actions</th></tr></thead>
                            <tbody>
                                {sales.map(s => (
                                    <motion.tr key={s._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                        <td className="font-mono text-primary-600 font-bold text-xs">{s.invoiceNumber}</td>
                                        <td className="text-slate-500">{new Date(s.date).toLocaleDateString()}</td>
                                        <td>
                                            <div className="flex items-center gap-2">
                                                {(s.customerRef?.name || s.customer) && (
                                                    <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${avatarColor(s.customerRef?.name || s.customer)} flex items-center justify-center text-white font-bold text-xs flex-shrink-0`}>
                                                        {(s.customerRef?.name || s.customer)[0]?.toUpperCase()}
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="font-semibold text-slate-800">{s.customerRef?.name || s.customer}</p>
                                                    {s.customerRef?.companyName && <p className="text-xs text-slate-400">{s.customerRef.companyName}</p>}
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="flex flex-wrap gap-1">
                                                {s.items.map((item, i) => (
                                                    <span key={i} className="badge-slate text-[10px]">{item.model?.name} ×{item.quantity}</span>
                                                ))}
                                            </div>
                                        </td>
                                        <td>
                                            <div className="text-xs">
                                                <p className="font-medium text-slate-700">Recv: Rs. {Number(s.amountPaid || 0).toLocaleString()}</p>
                                                <p className="text-slate-400">Due: Rs. {Number(s.totalAmount - (s.amountPaid || 0)).toLocaleString()}</p>
                                            </div>
                                        </td>
                                        <td className="text-emerald-600 font-bold">Rs. {Number(s.totalAmount).toLocaleString()}</td>
                                        <td>
                                            <button onClick={() => viewInvoice(s._id)} className="p-2 rounded-lg bg-slate-100 hover:bg-primary-600 text-slate-500 hover:text-white transition-all" title="View Invoice">
                                                <MdReceipt size={16} />
                                            </button>
                                        </td>
                                    </motion.tr>
                                ))}
                                {!sales.length && <tr><td colSpan={7} className="text-center text-slate-400 py-8">No sales yet</td></tr>}
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

            {/* New Sale Modal */}
            <Modal isOpen={modal.open} onClose={closeModal} title="New Sale / Dispatch" size="xl">
                <div className="space-y-4">
                    {/* Customer Searchable Dropdown */}
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <label className="block text-slate-600 text-sm font-medium">Customer *</label>
                            <Link to="/customers" className="text-xs text-primary-600 hover:text-primary-700 font-medium" onClick={closeModal}>
                                + Add New Customer
                            </Link>
                        </div>

                        {selectedCustomerFull ? (
                            <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-xl space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${avatarColor(selectedCustomerFull.name)} flex items-center justify-center text-white font-bold text-sm`}>
                                            {selectedCustomerFull.name[0]?.toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-slate-800 text-sm">{selectedCustomerFull.name}</p>
                                            {selectedCustomerFull.companyName && <p className="text-xs text-slate-400">{selectedCustomerFull.companyName}</p>}
                                        </div>
                                    </div>
                                    <button onClick={clearCustomer} className="p-1.5 rounded-lg hover:bg-emerald-100/50 text-slate-400 hover:text-slate-600 transition-colors">
                                        <MdClose size={18} />
                                    </button>
                                </div>
                                <div className="grid grid-cols-2 gap-3 text-xs border-t border-emerald-100/50 pt-3 text-slate-600">
                                    <div><span className="text-slate-400 block">📞 Contact Number</span> <span className="font-medium text-slate-800">{selectedCustomerFull.mobile || '—'}</span></div>
                                    <div><span className="text-slate-400 block">💸 Previous Balance</span> <span className={`font-bold ${selectedCustomerFull.outstandingBalance > 0 ? 'text-emerald-600' : 'text-slate-500'}`}>Rs. {Number(selectedCustomerFull.outstandingBalance || 0).toLocaleString()}</span></div>
                                    <div><span className="text-slate-400 block">🧾 GST / NTN</span> <span className="font-medium text-slate-800 font-mono">{selectedCustomerFull.ntn || 'Non-Taxpayer'}</span></div>
                                    <div className="col-span-2"><span className="text-slate-400 block">📍 Address</span> <span className="font-medium text-slate-800">{selectedCustomerFull.address || '—'}</span></div>
                                </div>
                            </div>
                        ) : (
                            <div ref={customerRef} className="relative">
                                <div className="relative">
                                    <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input
                                        type="text"
                                        placeholder="Search customer by name..."
                                        value={customerSearch}
                                        onChange={e => { setCustomerSearch(e.target.value); setCustomerDropdownOpen(true); }}
                                        onFocus={() => setCustomerDropdownOpen(true)}
                                        className="form-input pl-9"
                                    />
                                </div>
                                {customerDropdownOpen && (
                                    <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-52 overflow-y-auto">
                                        {filteredCustomers.length === 0 ? (
                                            <div className="p-4 text-center text-slate-400 text-sm">
                                                <MdPeople size={24} className="mx-auto mb-1 text-slate-200" />
                                                No customers found.{' '}
                                                <Link to="/customers" className="text-primary-600 hover:underline" onClick={closeModal}>Add customer</Link>
                                            </div>
                                        ) : (
                                            filteredCustomers.map(c => (
                                                <button
                                                    key={c._id}
                                                    onClick={() => selectCustomer(c)}
                                                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-emerald-50 text-left transition-colors border-b border-slate-50 last:border-0"
                                                >
                                                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${avatarColor(c.name)} flex items-center justify-center text-white font-bold text-xs flex-shrink-0`}>
                                                        {c.name[0]?.toUpperCase()}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-semibold text-slate-800 text-sm truncate">{c.name}</p>
                                                        <p className="text-xs text-slate-400 truncate">{c.companyName || c.mobile || ''}</p>
                                                    </div>
                                                </button>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* If no customer selected from master, allow manual entry */}
                    {!selectedCustomerFull && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-3 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                            <p className="col-span-full text-xs text-slate-400 font-medium -mb-2">Or enter manually (one-time):</p>
                            <div>
                                <label className="block text-slate-600 text-xs font-medium mb-1">Customer Name</label>
                                <input value={modal.data.customer} onChange={e => setModal(p => ({ ...p, data: { ...p.data, customer: e.target.value } }))} className="form-input text-sm" placeholder="Name" />
                            </div>
                            <div>
                                <label className="block text-slate-600 text-xs font-medium mb-1">Phone</label>
                                <input value={modal.data.customerPhone} onChange={e => setModal(p => ({ ...p, data: { ...p.data, customerPhone: e.target.value } }))} className="form-input text-sm" placeholder="Mobile" />
                            </div>
                            <div>
                                <label className="block text-slate-600 text-xs font-medium mb-1">Address</label>
                                <input value={modal.data.customerAddress} onChange={e => setModal(p => ({ ...p, data: { ...p.data, customerAddress: e.target.value } }))} className="form-input text-sm" placeholder="Address" />
                            </div>
                        </div>
                    )}

                    {/* Quick Add Search */}
                    <div className="relative group">
                        <label className="text-slate-600 text-sm font-bold block mb-2">Quick Add Product</label>
                        <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200 min-h-[50px] items-center">
                            <MdAdd className="text-slate-400" size={20} />
                            <input
                                type="text"
                                placeholder="Search & select multiple..."
                                className="bg-transparent border-none outline-none text-sm flex-1 min-w-[200px]"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        const search = searchTerm.toLowerCase();
                                        const found = models.find(m => m.name.toLowerCase().includes(search));
                                        if (found) {
                                            addSpecificItem(found);
                                            setSearchTerm('');
                                        }
                                    }
                                }}
                            />
                            <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
                                {models
                                    .filter(m => !searchTerm || m.name.toLowerCase().includes(searchTerm.toLowerCase()))
                                    .slice(0, searchTerm ? 8 : 5)
                                    .map(m => (
                                        <button
                                            key={m._id}
                                            onClick={() => { addSpecificItem(m); setSearchTerm(''); }}
                                            className="px-2 py-1 rounded-lg bg-white border border-slate-200 text-[11px] font-medium hover:border-primary-500 hover:text-primary-600 transition-all flex items-center gap-1 shadow-sm"
                                        >
                                            + {m.name}
                                        </button>
                                    ))}
                            </div>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1">Tip: Click to add or type and press Enter</p>
                    </div>

                    {/* Items List */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-slate-600 text-sm font-bold">Current Selection</label>
                            <button onClick={addItem} className="text-xs btn-secondary py-1 px-3">+ New Empty Row</button>
                        </div>
                        <div className="space-y-2">
                            {modal.data.items.map((item, i) => (
                                <div key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_80px_100px_36px] gap-2 items-center p-3 bg-slate-50 rounded-xl sm:bg-transparent sm:p-0 sm:rounded-none">
                                    <select
                                        value={item.model}
                                        onChange={e => updateItem(i, 'model', e.target.value)}
                                        className="form-input py-2 text-sm focus:ring-primary-500"
                                        autoFocus={i === modal.data.items.length - 1 && i > 0}
                                    >
                                        <option value="">Select model</option>
                                        {models.map(m => <option key={m._id} value={m._id}>{m.name} (Stock: {getStock(m._id)})</option>)}
                                    </select>
                                    <div className="flex gap-2 sm:contents">
                                        <input type="number" value={item.quantity} onChange={e => updateItem(i, 'quantity', e.target.value)} className="form-input py-2 text-sm flex-1" placeholder="Qty" min={1} />
                                        <input type="number" value={item.price} onChange={e => updateItem(i, 'price', e.target.value)} className="form-input py-2 text-sm flex-1" placeholder="Price" min={0} />
                                        <button onClick={() => removeItem(i)} className="p-2 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100"><MdDelete size={16} /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Cost, Discount & Amount Received */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-slate-600 text-sm font-medium mb-1">Discount (Rs.)</label>
                            <input
                                type="number"
                                value={modal.data.discount}
                                onChange={e => setModal(p => ({ ...p, data: { ...p.data, discount: e.target.value } }))}
                                className="form-input"
                                min={0}
                            />
                        </div>
                        <div>
                            <label className="block text-slate-600 text-sm font-medium mb-1">Amount Received (Rs.)</label>
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
                                placeholder="Notes"
                            />
                        </div>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 text-sm">
                        <div className="flex justify-between text-slate-500">
                            <span>Subtotal:</span>
                            <span className="font-semibold">Rs. {subtotal.toLocaleString()}</span>
                        </div>
                        {Number(modal.data.discount || 0) > 0 && (
                            <div className="flex justify-between text-rose-500">
                                <span>Discount:</span>
                                <span>- Rs. {Number(modal.data.discount).toLocaleString()}</span>
                            </div>
                        )}
                        <div className="flex justify-between border-t border-slate-200 pt-1.5 text-base font-bold text-slate-800">
                            <span>Final Total:</span>
                            <span className="text-emerald-600">Rs. {total.toLocaleString()}</span>
                        </div>
                        {modal.data.amountPaid > 0 && (
                            <div className="flex justify-between text-slate-500 text-xs pt-1 border-dashed border-t border-slate-200">
                                <span>Outstanding Ledger Addition (Receivable):</span>
                                <span className="font-semibold text-rose-500">Rs. {Math.max(0, total - Number(modal.data.amountPaid)).toLocaleString()}</span>
                            </div>
                        )}
                    </div>

                    <div className="flex gap-3">
                        <button onClick={saveSale} className="btn-primary flex-1">Record Sale</button>
                        <button onClick={closeModal} className="btn-secondary flex-1">Cancel</button>
                    </div>
                </div>
            </Modal>

            {/* Invoice Modal */}
            <Modal isOpen={invoiceModal.open} onClose={() => setInvoiceModal({ open: false, sale: null })} title="Invoice" size="lg">
                {invoiceModal.sale && (
                    <div className="space-y-4" id="invoice-content">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="text-xl font-bold text-slate-800">Factory Management System</h3>
                                <p className="text-slate-500 text-sm">Industrial Estate, Pakistan</p>
                            </div>
                            <div className="text-right">
                                <p className="text-primary-600 font-mono font-bold text-lg">{invoiceModal.sale.invoiceNumber}</p>
                                <p className="text-slate-500 text-sm">{new Date(invoiceModal.sale.date).toLocaleDateString()}</p>
                            </div>
                        </div>
                        <div className="border-t border-slate-100 pt-4">
                            <p className="text-slate-500 text-sm font-medium">Bill To:</p>
                            <p className="text-slate-800 font-bold">{invoiceModal.sale.customerRef?.name || invoiceModal.sale.customer}</p>
                            {invoiceModal.sale.customerRef?.companyName && <p className="text-slate-500 text-sm">{invoiceModal.sale.customerRef.companyName}</p>}
                            {invoiceModal.sale.customerPhone && <p className="text-slate-500 text-sm">{invoiceModal.sale.customerPhone}</p>}
                            {invoiceModal.sale.customerAddress && <p className="text-slate-500 text-sm">{invoiceModal.sale.customerAddress}</p>}
                            {invoiceModal.sale.customerRef?.ntn && <p className="text-slate-500 text-sm">NTN: {invoiceModal.sale.customerRef.ntn}</p>}
                        </div>
                        <div className="table-responsive">
                            <table className="data-table">
                                <thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Amount</th></tr></thead>
                                <tbody>
                                    {invoiceModal.sale.items.map((item, i) => (
                                        <tr key={i}>
                                            <td>{item.model?.name}</td>
                                            <td>{item.quantity}</td>
                                            <td>Rs. {Number(item.price).toLocaleString()}</td>
                                            <td className="font-semibold">Rs. {(item.quantity * item.price).toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="flex justify-end">
                            <div className="space-y-1 text-sm min-w-48">
                                <div className="flex justify-between text-slate-500"><span>Subtotal:</span><span className="font-bold">Rs. {invoiceModal.sale.items.reduce((s, i) => s + i.quantity * i.price, 0).toLocaleString()}</span></div>
                                {invoiceModal.sale.discount > 0 && <div className="flex justify-between text-rose-600"><span>Discount:</span><span className="font-bold">- Rs. {Number(invoiceModal.sale.discount).toLocaleString()}</span></div>}
                                <div className="flex justify-between text-emerald-600 font-bold text-base border-t border-slate-100 pt-1"><span>Total:</span><span>Rs. {Number(invoiceModal.sale.totalAmount).toLocaleString()}</span></div>
                                <div className="flex justify-between text-slate-500 text-xs"><span>Amount Paid:</span><span className="font-semibold">Rs. {Number(invoiceModal.sale.amountPaid || 0).toLocaleString()}</span></div>
                                <div className="flex justify-between text-rose-600 text-xs font-semibold"><span>Remaining Due:</span><span>Rs. {Math.max(0, invoiceModal.sale.totalAmount - (invoiceModal.sale.amountPaid || 0)).toLocaleString()}</span></div>
                            </div>
                        </div>
                        <button onClick={() => window.print()} className="btn-secondary w-full flex items-center justify-center gap-2"><MdPrint size={18} /> Print Invoice</button>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default Sales;
