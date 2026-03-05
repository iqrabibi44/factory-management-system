import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { getUsers, register } from '../services/api';
import Modal from '../components/Modal';
import { SkeletonTable } from '../components/Skeleton';
import { MdAdd, MdPerson } from 'react-icons/md';
import toast from 'react-hot-toast';

const ROLES = ['admin', 'store_manager', 'production_manager', 'sales_manager'];
const emptyUser = { name: '', email: '', password: '', role: 'store_manager' };

const roleColors = {
    admin: 'badge-danger',
    store_manager: 'badge-primary',
    production_manager: 'badge-purple',
    sales_manager: 'badge-success',
};

const Users = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState({ open: false, data: emptyUser });

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const { data } = await getUsers();
            setUsers(data || []);
        } catch { toast.error('Failed to load users'); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchUsers(); }, []);

    const saveUser = async () => {
        try {
            await register(modal.data);
            toast.success('User created');
            setModal({ open: false, data: emptyUser });
            fetchUsers();
        } catch (e) { toast.error(e.response?.data?.message || 'Error'); }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold gradient-text">Users</h1>
                    <p className="text-slate-500 mt-1">Manage system users and roles</p>
                </div>
                <button onClick={() => setModal({ open: true, data: emptyUser })} className="btn-primary flex items-center gap-2">
                    <MdAdd size={20} /> Add User
                </button>
            </div>

            {loading ? <SkeletonTable rows={4} cols={4} /> : (
                <div className="glass-card overflow-hidden">
                    <div className="table-responsive">
                        <table className="data-table">
                            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Created</th></tr></thead>
                            <tbody>
                                {users.map(u => (
                                    <motion.tr key={u._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                        <td>
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-purple-500 flex items-center justify-center text-white text-sm font-bold">
                                                    {u.name?.[0]?.toUpperCase()}
                                                </div>
                                                <span className="font-semibold text-slate-800">{u.name}</span>
                                            </div>
                                        </td>
                                        <td className="text-slate-500">{u.email}</td>
                                        <td><span className={roleColors[u.role] || 'badge-slate'}>{u.role?.replace('_', ' ')}</span></td>
                                        <td className="text-slate-400">{new Date(u.createdAt).toLocaleDateString()}</td>
                                    </motion.tr>
                                ))}
                                {!users.length && <tr><td colSpan={4} className="text-center text-slate-400 py-8">No users found</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <Modal isOpen={modal.open} onClose={() => setModal({ open: false, data: emptyUser })} title="Add New User">
                <div className="space-y-4">
                    <div><label className="block text-slate-600 text-sm font-medium mb-1">Full Name</label><input value={modal.data.name} onChange={e => setModal(p => ({ ...p, data: { ...p.data, name: e.target.value } }))} className="form-input" /></div>
                    <div><label className="block text-slate-600 text-sm font-medium mb-1">Email</label><input type="email" value={modal.data.email} onChange={e => setModal(p => ({ ...p, data: { ...p.data, email: e.target.value } }))} className="form-input" /></div>
                    <div><label className="block text-slate-600 text-sm font-medium mb-1">Password</label><input type="password" value={modal.data.password} onChange={e => setModal(p => ({ ...p, data: { ...p.data, password: e.target.value } }))} className="form-input" /></div>
                    <div><label className="block text-slate-600 text-sm font-medium mb-1">Role</label>
                        <select value={modal.data.role} onChange={e => setModal(p => ({ ...p, data: { ...p.data, role: e.target.value } }))} className="form-input">
                            {ROLES.map(r => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
                        </select>
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button onClick={saveUser} className="btn-primary flex-1">Create User</button>
                        <button onClick={() => setModal({ open: false, data: emptyUser })} className="btn-secondary flex-1">Cancel</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default Users;
