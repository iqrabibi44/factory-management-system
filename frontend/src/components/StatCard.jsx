import { motion } from 'framer-motion';

const StatCard = ({ title, value, icon: Icon, color = 'blue', subtitle, trend }) => {
    const colorMap = {
        blue: { bg: 'stat-blue', icon: 'text-blue-400', border: 'border-blue-500/20' },
        purple: { bg: 'stat-purple', icon: 'text-purple-400', border: 'border-purple-500/20' },
        emerald: { bg: 'stat-emerald', icon: 'text-emerald-400', border: 'border-emerald-500/20' },
        amber: { bg: 'stat-amber', icon: 'text-amber-400', border: 'border-amber-500/20' },
        rose: { bg: 'stat-rose', icon: 'text-rose-400', border: 'border-rose-500/20' },
    };
    const c = colorMap[color] || colorMap.blue;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            className={`glass-card p-6 border ${c.border} ${c.bg} cursor-default`}
        >
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-dark-400 text-sm font-medium mb-1">{title}</p>
                    <p className="text-3xl font-bold text-dark-100">{value}</p>
                    {subtitle && <p className="text-dark-400 text-xs mt-1">{subtitle}</p>}
                </div>
                <div className={`p-3 rounded-xl bg-dark-800/50 ${c.icon}`}>
                    <Icon size={24} />
                </div>
            </div>
            {trend !== undefined && (
                <div className={`mt-3 flex items-center gap-1 text-xs font-medium ${trend >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    <span>{trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%</span>
                    <span className="text-dark-500">vs last month</span>
                </div>
            )}
        </motion.div>
    );
};

export default StatCard;
