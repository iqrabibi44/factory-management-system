import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { getDashboard, getAllModels } from '../services/api';
import { MdSettings, MdBuild, MdTrendingUp, MdSpeed, MdArrowForward } from 'react-icons/md';
import { FaBoxes } from 'react-icons/fa';

const CATEGORY_IMAGES = {
    'Room Cooler': 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=480&q=80',
    'Fan': 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=480&q=80',
    'Washing Machine': 'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?w=480&q=80',
    'Spinner': 'https://images.unsplash.com/photo-1545173168-9f1947eebb7f?w=480&q=80',
};

const CATEGORY_LABELS = {
    'Room Cooler': 'Cooling',
    'Fan': 'Ventilation',
    'Washing Machine': 'Laundry',
    'Spinner': 'Processing',
};

const CATEGORY_COLORS = {
    'Room Cooler': 'bg-blue-500',
    'Fan': 'bg-indigo-500',
    'Washing Machine': 'bg-teal-500',
    'Spinner': 'bg-purple-500',
};

const cardVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: (i) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.35 } }),
};

const Dashboard = () => {
    const [stats, setStats] = useState(null);
    const [models, setModels] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [s, m] = await Promise.all([getDashboard(), getAllModels()]);
                setStats(s.data);
                setModels(m.data || []);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // Group models by product category for the "Our Products" grid
    const productGroups = models.reduce((acc, model) => {
        const cat = model.product?.category || 'Other';
        if (!acc[cat]) acc[cat] = { category: cat, product: model.product, models: [], totalProduced: 0 };
        acc[cat].models.push(model);
        acc[cat].totalProduced += model.totalProduced || 0;
        return acc;
    }, {});
    const productCards = Object.values(productGroups);

    const statCards = [
        {
            label: 'Products Made',
            value: loading ? '—' : (stats?.totalProduction || '1,205'),
            sub: '+12% this month',
            subColor: 'text-emerald-500',
            icon: MdSettings,
            iconBg: 'bg-blue-100',
            iconColor: 'text-blue-500',
        },
        {
            label: 'Spare Parts',
            value: loading ? '—' : (stats?.totalRawMaterials || '8,180'),
            sub: '↑ Stock healthy',
            subColor: 'text-emerald-500',
            icon: MdBuild,
            iconBg: 'bg-slate-100',
            iconColor: 'text-slate-500',
        },
        {
            label: 'Active Lines',
            value: loading ? '—' : (stats?.activeLines || '4'),
            sub: 'Running normally',
            subColor: 'text-slate-400',
            icon: MdTrendingUp,
            iconBg: 'bg-slate-100',
            iconColor: 'text-slate-500',
        },
        {
            label: 'Efficiency',
            value: loading ? '—' : (stats?.efficiency || '94%'),
            sub: '↑ 1.3% this week',
            subColor: 'text-emerald-500',
            icon: MdSpeed,
            iconBg: 'bg-slate-100',
            iconColor: 'text-slate-500',
        },
    ];

    return (
        <div className="space-y-6 pb-8">

            {/* ── Hero Banner ── */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="relative rounded-2xl overflow-hidden h-44"
                style={{
                    backgroundImage: `linear-gradient(to right, rgba(10,22,40,0.88) 38%, rgba(10,22,40,0.3) 100%),
            url('https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=1400&q=80')`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                }}
            >
                <div className="absolute inset-0 flex flex-col justify-center px-8">
                    <h1 className="text-2xl font-bold text-white leading-tight">Factory Dashboard</h1>
                    <p className="text-slate-300 text-sm mt-1.5 max-w-xs">
                        Monitor production, manage parts, and track manufacturing in real-time.
                    </p>
                </div>
            </motion.div>

            {/* ── Stat Cards ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {statCards.map((card, i) => (
                    <motion.div
                        key={card.label}
                        custom={i}
                        initial="hidden"
                        animate="visible"
                        variants={cardVariants}
                        className="card p-5 flex items-start justify-between"
                    >
                        <div>
                            <p className="text-slate-500 text-xs font-medium mb-1">{card.label}</p>
                            <p className="text-3xl font-bold text-slate-800 leading-none">{card.value}</p>
                            <p className={`text-xs mt-1.5 font-medium ${card.subColor}`}>{card.sub}</p>
                        </div>
                        <div className={`w-10 h-10 rounded-xl ${card.iconBg} flex items-center justify-center flex-shrink-0`}>
                            <card.icon size={20} className={card.iconColor} />
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* ── Our Products ── */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-slate-800">Our Products</h2>
                    <Link to="/products" className="flex items-center gap-1 text-primary-600 text-sm font-medium hover:underline">
                        View all <MdArrowForward size={16} />
                    </Link>
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="card h-72 animate-pulse bg-slate-100" />
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {(productCards.length ? productCards : [
                            { category: 'Room Cooler', product: { name: 'Room Cooler' }, totalProduced: 245 },
                            { category: 'Spinner', product: { name: 'Industrial Spinner' }, totalProduced: 128 },
                            { category: 'Washing Machine', product: { name: 'Washing Machine' }, totalProduced: 312 },
                            { category: 'Fan', product: { name: 'Ceiling Fan' }, totalProduced: 520 },
                        ]).map((group, i) => (
                            <motion.div
                                key={group.category}
                                custom={i + 4}
                                initial="hidden"
                                animate="visible"
                                variants={cardVariants}
                                className="card-hover overflow-hidden flex flex-col"
                            >
                                {/* Product image */}
                                <div className="relative h-48 bg-slate-50 flex items-center justify-center overflow-hidden">
                                    <img
                                        src={CATEGORY_IMAGES[group.category] || 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=480'}
                                        alt={group.category}
                                        className="w-full h-full object-contain p-4 transition-transform duration-300 hover:scale-105"
                                        onError={e => { e.target.src = 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=480'; }}
                                    />
                                    <span className={`absolute top-3 right-3 ${CATEGORY_COLORS[group.category] || 'bg-slate-600'} text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg shadow-black/20 ring-1 ring-white/20 backdrop-blur-sm`}>
                                        {CATEGORY_LABELS[group.category] || group.category}
                                    </span>
                                </div>

                                {/* Product info */}
                                <div className="p-4 flex-1 flex flex-col justify-between">
                                    <div>
                                        <h3 className="font-bold text-slate-800 text-sm leading-tight">{group.product?.name || group.category}</h3>
                                        <p className="text-slate-500 text-xs mt-1 line-clamp-2">
                                            {group.category === 'Room Cooler' && 'High-efficiency evaporative room cooler with 3-speed settings.'}
                                            {group.category === 'Spinner' && 'Heavy-duty industrial centrifuge spinner for material processing.'}
                                            {group.category === 'Washing Machine' && 'Front-load automatic washing machine with smart controls.'}
                                            {group.category === 'Fan' && 'Energy-efficient 4-blade ceiling fan with remote control.'}
                                            {!['Room Cooler', 'Spinner', 'Washing Machine', 'Fan'].includes(group.category) && `${group.models?.length || 0} models available`}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-slate-100">
                                        <FaBoxes size={12} className="text-slate-400" />
                                        <span className="text-slate-600 text-xs font-semibold">Total Produced</span>
                                        <span className="ml-auto text-primary-600 font-bold text-sm">{group.totalProduced || 0}</span>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

        </div>
    );
};

export default Dashboard;
