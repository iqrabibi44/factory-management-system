import { motion, AnimatePresence } from 'framer-motion';
import { MdClose } from 'react-icons/md';

const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-3xl',
};

const Modal = ({ isOpen, onClose, title, children, size = 'md' }) => (
    <AnimatePresence>
        {isOpen && (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4"
                style={{ background: 'rgba(15,33,55,0.55)', backdropFilter: 'blur(4px)' }}
                onClick={e => e.target === e.currentTarget && onClose()}
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 12 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 12 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                    className={`bg-white rounded-2xl shadow-2xl w-full ${sizeClasses[size]} max-h-[90vh] overflow-y-auto`}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                        <h2 className="text-base font-bold text-slate-800">{title}</h2>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-700 transition-all"
                        >
                            <MdClose size={18} />
                        </button>
                    </div>
                    {/* Body */}
                    <div className="px-6 py-5">{children}</div>
                </motion.div>
            </motion.div>
        )}
    </AnimatePresence>
);

export default Modal;
