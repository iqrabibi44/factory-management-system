import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import {
    MdDashboard, MdCategory, MdInventory2, MdLocalShipping,
    MdFactory, MdPointOfSale, MdBarChart, MdPeople, MdLogout
} from 'react-icons/md';
import { FaIndustry } from 'react-icons/fa';

const allLinks = [
    { to: '/dashboard', icon: MdDashboard, label: 'Dashboard', roles: null },
    { to: '/products', icon: MdCategory, label: 'Products', roles: ['admin', 'production_manager'] },
    { to: '/inventory', icon: MdInventory2, label: 'Spare Parts', roles: ['admin', 'store_manager', 'production_manager'] },
    { to: '/purchases', icon: MdLocalShipping, label: 'Purchases', roles: ['admin', 'store_manager'] },
    { to: '/production', icon: MdFactory, label: 'Manufacture', roles: ['admin', 'production_manager'] },
    { to: '/sales', icon: MdPointOfSale, label: 'Sales', roles: ['admin', 'sales_manager'] },
    { to: '/reports', icon: MdBarChart, label: 'Reports', roles: null },
    { to: '/users', icon: MdPeople, label: 'Users', roles: ['admin'] },
];

const Sidebar = ({ isOpen }) => {
    const { user, logout } = useAuth();
    const location = useLocation();

    const links = allLinks.filter(l => !l.roles || l.roles.includes(user?.role));

    return (
        <motion.aside
            initial={false}
            animate={{
                x: typeof window !== 'undefined' && window.innerWidth < 768 ? (isOpen ? 0 : -260) : 0
            }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className={`fixed md:sticky top-0 left-0 z-50 w-[240px] md:w-[220px] min-h-screen flex flex-col shadow-2xl md:shadow-none`}
            style={{ background: 'linear-gradient(180deg, #0f2137 0%, #152d4a 100%)' }}
        >
            {/* Logo */}
            <div className="px-5 py-5 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-primary-500 flex items-center justify-center shadow-lg shadow-primary-900/40 flex-shrink-0">
                        <FaIndustry className="text-white" size={18} />
                    </div>
                    <div>
                        <p className="text-white font-bold text-sm leading-tight">FactoryDB</p>
                        <p className="text-slate-400 text-[10px] leading-tight">Management System</p>
                    </div>
                </div>
            </div>

            {/* Nav Links */}
            <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
                {links.map(({ to, icon: Icon, label }) => (
                    <NavLink
                        key={to}
                        to={to}
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150
               ${isActive
                                ? 'bg-primary-500/20 text-primary-300 border border-primary-500/25'
                                : 'text-slate-400 hover:text-white hover:bg-white/8'
                            }`
                        }
                    >
                        <Icon size={18} className="flex-shrink-0" />
                        {label}
                    </NavLink>
                ))}
            </nav>

            {/* User info + logout */}
            <div className="px-3 py-4 border-t border-white/10">
                <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/5 mb-2">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary-400 to-blue-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {user?.name?.[0]?.toUpperCase()}
                    </div>
                    <div className="min-w-0">
                        <p className="text-white text-xs font-semibold truncate">{user?.name}</p>
                        <p className="text-slate-500 text-[10px] truncate">{user?.email}</p>
                    </div>
                </div>
                <button
                    onClick={logout}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all duration-150 text-sm font-medium"
                >
                    <MdLogout size={16} />
                    Sign Out
                </button>
            </div>
        </motion.aside>
    );
};

export default Sidebar;
