import { MdMenu } from 'react-icons/md';
import { FaIndustry } from 'react-icons/fa';

const Navbar = ({ onMenuClick }) => {
    return (
        <header className="md:hidden bg-navy-800 text-white px-4 py-3 sticky top-0 z-40 flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center shadow-lg shadow-primary-900/40">
                    <FaIndustry className="text-white" size={16} />
                </div>
                <div>
                    <p className="text-white font-bold text-xs leading-tight">FactoryDB</p>
                </div>
            </div>

            <button
                onClick={onMenuClick}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-slate-300"
            >
                <MdMenu size={24} />
            </button>
        </header>
    );
};

export default Navbar;
