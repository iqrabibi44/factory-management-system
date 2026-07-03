import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getVendors, createVendor, updateVendor, deleteVendor } from '../services/api';
import Modal from '../components/Modal';
import { SkeletonTable } from '../components/Skeleton';
import {
    MdAdd, MdEdit, MdDelete, MdSearch, MdBusiness,
    MdPhone, MdEmail, MdLocationOn, MdReceipt, MdClose
} from 'react-icons/md';
import toast from 'react-hot-toast';

const emptyVendor = {
    name: '', companyName: '', contactPerson: '', mobile: '',
    email: '', address: '', ntn: '', paymentTerms: 'Cash',
    openingBalance: 0, notes: '',
};

const PAYMENT_TERMS = ['Cash', 'Credit 15 Days', 'Credit 30 Days', 'Credit 45 Days', 'Credit 60 Days', 'Advance'];

const Vendors = () => {
    const [vendors, setVendors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [modal, setModal] = useState({ open: false, data: emptyVendor, editing: null });
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const searchRef = useRef(null);

    const fetchVendors = async (q = '') => {
        setLoading(true);
        try {
            const { data } = await getVendors(q ? { search: q } : {});
            setVendors(data);
        } catch { toast.error('Failed to load vendors'); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchVendors(); }, []);

    // Debounced search
    useEffect(() => {
        const t = setTimeout(() => fetchVendors(search), 300);
        return () => clearTimeout(t);
    }, [search]);

    const openAdd = () => setModal({ open: true, data: emptyVendor, editing: null });
    const openEdit = (v) => setModal({ open: true, data: { ...v }, editing: v._id });
    const closeModal = () => setModal({ open: false, data: emptyVendor, editing: null });

    const setField = (field, value) =>
        setModal(p => ({ ...p, data: { ...p.data, [field]: value } }));

    const saveVendor = async () => {
        if (!modal.data.name.trim()) return toast.error('Vendor name is required');
        try {
            if (modal.editing) {
                await updateVendor(modal.editing, modal.data);
                toast.success('Vendor updated');
            } else {
                await createVendor(modal.data);
                toast.success('Vendor added to master');
            }
            closeModal();
            fetchVendors(search);
        } catch (e) { toast.error(e.response?.data?.message || 'Error saving vendor'); }
    };

    const confirmDelete = async () => {
        try {
            await deleteVendor(deleteConfirm._id);
            toast.success('Vendor removed');
            setDeleteConfirm(null);
            fetchVendors(search);
        } catch { toast.error('Failed to delete'); }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold gradient-text">Vendor Master</h1>
                    <p className="text-slate-500 mt-1">Manage all supplier / vendor records</p>
                </div>
                <button onClick={openAdd} className="btn-primary flex items-center gap-2 self-start sm:self-auto">
                    <MdAdd size={20} /> Add Vendor
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
            {loading ? <SkeletonTable rows={6} cols={5} /> : (
                <div className="glass-card overflow-hidden">
                    <div className="table-responsive">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Vendor / Company</th>
                                    <th>Contact</th>
                                    <th>NTN / GST</th>
                                    <th>Payment Terms</th>
                                    <th>Opening Bal.</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                <AnimatePresence>
                                    {vendors.map(v => (
                                        <motion.tr
                                            key={v._id}
                                            initial={{ opacity: 0, y: 6 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0 }}
                                        >
                                            <td>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow">
                                                        {v.name[0]?.toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-slate-800">{v.name}</p>
                                                        {v.companyName && <p className="text-xs text-slate-400">{v.companyName}</p>}
                                                        {v.contactPerson && <p className="text-xs text-slate-400">{v.contactPerson}</p>}
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="space-y-0.5">
                                                    {v.mobile && (
                                                        <div className="flex items-center gap-1 text-sm text-slate-600">
                                                            <MdPhone size={12} className="text-slate-400" />{v.mobile}
                                                        </div>
                                                    )}
                                                    {v.email && (
                                                        <div className="flex items-center gap-1 text-xs text-slate-400">
                                                            <MdEmail size={12} />{v.email}
                                                        </div>
                                                    )}
                                                    {v.address && (
                                                        <div className="flex items-center gap-1 text-xs text-slate-400">
                                                            <MdLocationOn size={12} />{v.address}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td>
                                                {v.ntn ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-xs font-mono font-medium">
                                                        <MdReceipt size={11} />{v.ntn}
                                                    </span>
                                                ) : <span className="text-slate-300 text-sm">—</span>}
                                            </td>
                                            <td>
                                                <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${v.paymentTerms === 'Cash' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}>
                                                    {v.paymentTerms}
                                                </span>
                                            </td>
                                            <td className={`font-semibold text-sm ${v.openingBalance > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                                                {v.openingBalance > 0 ? `Rs. ${Number(v.openingBalance).toLocaleString()}` : '—'}
                                            </td>
                                            <td>
                                                <div className="flex items-center gap-1">
                                                    <button onClick={() => openEdit(v)} className="p-2 rounded-lg bg-slate-100 hover:bg-blue-600 text-slate-500 hover:text-white transition-all" title="Edit">
                                                        <MdEdit size={15} />
                                                    </button>
                                                    <button onClick={() => setDeleteConfirm(v)} className="p-2 rounded-lg bg-slate-100 hover:bg-rose-600 text-slate-500 hover:text-white transition-all" title="Delete">
                                                        <MdDelete size={15} />
                                                    </button>
                                                </div>
                                            </td>
                                        </motion.tr>
                                    ))}
                                </AnimatePresence>
                                {!vendors.length && (
                                    <tr>
                                        <td colSpan={6} className="text-center text-slate-400 py-12">
                                            <MdBusiness size={40} className="mx-auto mb-3 text-slate-200" />
                                            <p className="font-medium">No vendors found</p>
                                            <p className="text-sm mt-1">Click "Add Vendor" to create your first vendor</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Add / Edit Modal */}
            <Modal isOpen={modal.open} onClose={closeModal} title={modal.editing ? 'Edit Vendor' : 'Add New Vendor'} size="lg">
                <div className="space-y-4">
                    {/* Row 1 */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-slate-600 text-sm font-medium mb-1">Vendor Name *</label>
                            <input value={modal.data.name} onChange={e => setField('name', e.target.value)} className="form-input" placeholder="e.g. ABC Traders" autoFocus />
                        </div>
                        <div>
                            <label className="block text-slate-600 text-sm font-medium mb-1">Company Name</label>
                            <input value={modal.data.companyName} onChange={e => setField('companyName', e.target.value)} className="form-input" placeholder="e.g. ABC Traders Pvt Ltd" />
                        </div>
                    </div>
                    {/* Row 2 */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-slate-600 text-sm font-medium mb-1">Contact Person</label>
                            <input value={modal.data.contactPerson} onChange={e => setField('contactPerson', e.target.value)} className="form-input" placeholder="e.g. Mr. Ahmed" />
                        </div>
                        <div>
                            <label className="block text-slate-600 text-sm font-medium mb-1">Mobile Number</label>
                            <input value={modal.data.mobile} onChange={e => setField('mobile', e.target.value)} className="form-input" placeholder="03xx-xxxxxxx" />
                        </div>
                    </div>
                    {/* Row 3 */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-slate-600 text-sm font-medium mb-1">Email</label>
                            <input type="email" value={modal.data.email} onChange={e => setField('email', e.target.value)} className="form-input" placeholder="vendor@example.com" />
                        </div>
                        <div>
                            <label className="block text-slate-600 text-sm font-medium mb-1">NTN / GST No.</label>
                            <input value={modal.data.ntn} onChange={e => setField('ntn', e.target.value)} className="form-input" placeholder="e.g. 1234567-8" />
                        </div>
                    </div>
                    {/* Address */}
                    <div>
                        <label className="block text-slate-600 text-sm font-medium mb-1">Address</label>
                        <input value={modal.data.address} onChange={e => setField('address', e.target.value)} className="form-input" placeholder="Full address" />
                    </div>
                    {/* Row 4 */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-slate-600 text-sm font-medium mb-1">Payment Terms</label>
                            <select value={modal.data.paymentTerms} onChange={e => setField('paymentTerms', e.target.value)} className="form-input">
                                {PAYMENT_TERMS.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-slate-600 text-sm font-medium mb-1">Opening Balance (Rs.)</label>
                            <input type="number" value={modal.data.openingBalance} onChange={e => setField('openingBalance', e.target.value)} className="form-input" min={0} placeholder="0" />
                        </div>
                    </div>
                    {/* Notes */}
                    <div>
                        <label className="block text-slate-600 text-sm font-medium mb-1">Notes</label>
                        <textarea value={modal.data.notes} onChange={e => setField('notes', e.target.value)} className="form-input" rows={2} placeholder="Any additional notes..." />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button onClick={saveVendor} className="btn-primary flex-1">
                            {modal.editing ? 'Update Vendor' : 'Save Vendor'}
                        </button>
                        <button onClick={closeModal} className="btn-secondary flex-1">Cancel</button>
                    </div>
                </div>
            </Modal>

            {/* Delete Confirm Modal */}
            <Modal isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Remove Vendor" size="sm">
                <div className="space-y-4 text-center">
                    <div className="w-14 h-14 rounded-full bg-rose-100 flex items-center justify-center mx-auto">
                        <MdDelete size={28} className="text-rose-500" />
                    </div>
                    <p className="text-slate-600">Remove <span className="font-bold text-slate-800">{deleteConfirm?.name}</span> from vendor master?</p>
                    <p className="text-xs text-slate-400">Existing purchase records will remain intact.</p>
                    <div className="flex gap-3">
                        <button onClick={confirmDelete} className="flex-1 py-2.5 rounded-xl bg-rose-600 text-white font-semibold hover:bg-rose-700 transition-colors">Remove</button>
                        <button onClick={() => setDeleteConfirm(null)} className="btn-secondary flex-1">Cancel</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default Vendors;
