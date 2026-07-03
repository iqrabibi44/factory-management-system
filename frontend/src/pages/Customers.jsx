import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getCustomers, createCustomer, updateCustomer, deleteCustomer } from '../services/api';
import Modal from '../components/Modal';
import { SkeletonTable } from '../components/Skeleton';
import {
    MdAdd, MdEdit, MdDelete, MdSearch, MdPeople,
    MdPhone, MdEmail, MdLocationOn, MdReceipt, MdClose
} from 'react-icons/md';
import toast from 'react-hot-toast';

const emptyCustomer = {
    name: '', companyName: '', mobile: '', email: '',
    address: '', ntn: '', openingBalance: 0, notes: '',
};

const Customers = () => {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [modal, setModal] = useState({ open: false, data: emptyCustomer, editing: null });
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const searchRef = useRef(null);

    const fetchCustomers = async (q = '') => {
        setLoading(true);
        try {
            const { data } = await getCustomers(q ? { search: q } : {});
            setCustomers(data);
        } catch { toast.error('Failed to load customers'); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchCustomers(); }, []);

    useEffect(() => {
        const t = setTimeout(() => fetchCustomers(search), 300);
        return () => clearTimeout(t);
    }, [search]);

    const openAdd = () => setModal({ open: true, data: emptyCustomer, editing: null });
    const openEdit = (c) => setModal({ open: true, data: { ...c }, editing: c._id });
    const closeModal = () => setModal({ open: false, data: emptyCustomer, editing: null });

    const setField = (field, value) =>
        setModal(p => ({ ...p, data: { ...p.data, [field]: value } }));

    const saveCustomer = async () => {
        if (!modal.data.name.trim()) return toast.error('Customer name is required');
        try {
            if (modal.editing) {
                await updateCustomer(modal.editing, modal.data);
                toast.success('Customer updated');
            } else {
                await createCustomer(modal.data);
                toast.success('Customer added to master');
            }
            closeModal();
            fetchCustomers(search);
        } catch (e) { toast.error(e.response?.data?.message || 'Error saving customer'); }
    };

    const confirmDelete = async () => {
        try {
            await deleteCustomer(deleteConfirm._id);
            toast.success('Customer removed');
            setDeleteConfirm(null);
            fetchCustomers(search);
        } catch { toast.error('Failed to delete'); }
    };

    // Avatar colour from name
    const avatarColor = (name) => {
        const colors = [
            'from-emerald-500 to-teal-600',
            'from-violet-500 to-purple-600',
            'from-rose-500 to-pink-600',
            'from-amber-500 to-orange-600',
            'from-sky-500 to-blue-600',
        ];
        return colors[name.charCodeAt(0) % colors.length];
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold gradient-text">Customer Master</h1>
                    <p className="text-slate-500 mt-1">Manage all customer / buyer records</p>
                </div>
                <button onClick={openAdd} className="btn-primary flex items-center gap-2 self-start sm:self-auto">
                    <MdAdd size={20} /> Add Customer
                </button>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
                <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                    ref={searchRef}
                    type="text"
                    placeholder="Search by name, company or mobile..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="form-input pl-10 pr-10"
                />
                {search && (
                    <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        <MdClose size={16} />
                    </button>
                )}
            </div>

            {/* Table */}
            {loading ? <SkeletonTable rows={6} cols={4} /> : (
                <div className="glass-card overflow-hidden">
                    <div className="table-responsive">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Customer / Company</th>
                                    <th>Contact</th>
                                    <th>NTN / GST</th>
                                    <th>Opening Bal.</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                <AnimatePresence>
                                    {customers.map(c => (
                                        <motion.tr
                                            key={c._id}
                                            initial={{ opacity: 0, y: 6 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0 }}
                                        >
                                            <td>
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${avatarColor(c.name)} flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow`}>
                                                        {c.name[0]?.toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-slate-800">{c.name}</p>
                                                        {c.companyName && <p className="text-xs text-slate-400">{c.companyName}</p>}
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="space-y-0.5">
                                                    {c.mobile && (
                                                        <div className="flex items-center gap-1 text-sm text-slate-600">
                                                            <MdPhone size={12} className="text-slate-400" />{c.mobile}
                                                        </div>
                                                    )}
                                                    {c.email && (
                                                        <div className="flex items-center gap-1 text-xs text-slate-400">
                                                            <MdEmail size={12} />{c.email}
                                                        </div>
                                                    )}
                                                    {c.address && (
                                                        <div className="flex items-center gap-1 text-xs text-slate-400">
                                                            <MdLocationOn size={12} />{c.address}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td>
                                                {c.ntn ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-xs font-mono font-medium">
                                                        <MdReceipt size={11} />{c.ntn}
                                                    </span>
                                                ) : <span className="text-slate-300 text-sm">—</span>}
                                            </td>
                                            <td className={`font-semibold text-sm ${c.openingBalance > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                                                {c.openingBalance > 0 ? `Rs. ${Number(c.openingBalance).toLocaleString()}` : '—'}
                                            </td>
                                            <td>
                                                <div className="flex items-center gap-1">
                                                    <button onClick={() => openEdit(c)} className="p-2 rounded-lg bg-slate-100 hover:bg-blue-600 text-slate-500 hover:text-white transition-all" title="Edit">
                                                        <MdEdit size={15} />
                                                    </button>
                                                    <button onClick={() => setDeleteConfirm(c)} className="p-2 rounded-lg bg-slate-100 hover:bg-rose-600 text-slate-500 hover:text-white transition-all" title="Delete">
                                                        <MdDelete size={15} />
                                                    </button>
                                                </div>
                                            </td>
                                        </motion.tr>
                                    ))}
                                </AnimatePresence>
                                {!customers.length && (
                                    <tr>
                                        <td colSpan={5} className="text-center text-slate-400 py-12">
                                            <MdPeople size={40} className="mx-auto mb-3 text-slate-200" />
                                            <p className="font-medium">No customers found</p>
                                            <p className="text-sm mt-1">Click "Add Customer" to create your first customer</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Add / Edit Modal */}
            <Modal isOpen={modal.open} onClose={closeModal} title={modal.editing ? 'Edit Customer' : 'Add New Customer'} size="lg">
                <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-slate-600 text-sm font-medium mb-1">Customer Name *</label>
                            <input value={modal.data.name} onChange={e => setField('name', e.target.value)} className="form-input" placeholder="e.g. Ahmed Plastic" autoFocus />
                        </div>
                        <div>
                            <label className="block text-slate-600 text-sm font-medium mb-1">Company Name</label>
                            <input value={modal.data.companyName} onChange={e => setField('companyName', e.target.value)} className="form-input" placeholder="e.g. Ahmed Plastic Industries" />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-slate-600 text-sm font-medium mb-1">Mobile Number</label>
                            <input value={modal.data.mobile} onChange={e => setField('mobile', e.target.value)} className="form-input" placeholder="03xx-xxxxxxx" />
                        </div>
                        <div>
                            <label className="block text-slate-600 text-sm font-medium mb-1">Email</label>
                            <input type="email" value={modal.data.email} onChange={e => setField('email', e.target.value)} className="form-input" placeholder="customer@example.com" />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-slate-600 text-sm font-medium mb-1">NTN / GST No.</label>
                            <input value={modal.data.ntn} onChange={e => setField('ntn', e.target.value)} className="form-input" placeholder="e.g. 1234567-8" />
                        </div>
                        <div>
                            <label className="block text-slate-600 text-sm font-medium mb-1">Opening Balance (Rs.)</label>
                            <input type="number" value={modal.data.openingBalance} onChange={e => setField('openingBalance', e.target.value)} className="form-input" min={0} placeholder="0" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-slate-600 text-sm font-medium mb-1">Address</label>
                        <input value={modal.data.address} onChange={e => setField('address', e.target.value)} className="form-input" placeholder="Full address" />
                    </div>
                    <div>
                        <label className="block text-slate-600 text-sm font-medium mb-1">Notes</label>
                        <textarea value={modal.data.notes} onChange={e => setField('notes', e.target.value)} className="form-input" rows={2} placeholder="Any additional notes..." />
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button onClick={saveCustomer} className="btn-primary flex-1">
                            {modal.editing ? 'Update Customer' : 'Save Customer'}
                        </button>
                        <button onClick={closeModal} className="btn-secondary flex-1">Cancel</button>
                    </div>
                </div>
            </Modal>

            {/* Delete Confirm */}
            <Modal isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Remove Customer" size="sm">
                <div className="space-y-4 text-center">
                    <div className="w-14 h-14 rounded-full bg-rose-100 flex items-center justify-center mx-auto">
                        <MdDelete size={28} className="text-rose-500" />
                    </div>
                    <p className="text-slate-600">Remove <span className="font-bold text-slate-800">{deleteConfirm?.name}</span> from customer master?</p>
                    <p className="text-xs text-slate-400">Existing sale records will remain intact.</p>
                    <div className="flex gap-3">
                        <button onClick={confirmDelete} className="flex-1 py-2.5 rounded-xl bg-rose-600 text-white font-semibold hover:bg-rose-700 transition-colors">Remove</button>
                        <button onClick={() => setDeleteConfirm(null)} className="btn-secondary flex-1">Cancel</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default Customers;
