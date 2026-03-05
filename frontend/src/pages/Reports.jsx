import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { getSalesReport, getProductionReport, getFullReport } from '../services/api';
import { SkeletonTable } from '../components/Skeleton';
import { MdDownload, MdDateRange } from 'react-icons/md';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import toast from 'react-hot-toast';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';

const PERIODS = [
    { id: 'daily', label: 'Today' },
    { id: 'weekly', label: 'This Week' },
    { id: 'monthly', label: 'This Month' },
    { id: 'yearly', label: 'This Year' },
];

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];

const Reports = () => {
    const [period, setPeriod] = useState('monthly');
    const [salesData, setSalesData] = useState(null);
    const [productionData, setProductionData] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchReports = async () => {
        setLoading(true);
        try {
            const [s, p] = await Promise.all([
                getSalesReport({ period }),
                getProductionReport({ period }),
            ]);
            setSalesData(s.data);
            setProductionData(p.data);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const downloadPDF = async () => {
        const loadToast = toast.loading('Preparing report...');
        try {
            const { data } = await getFullReport({ period });
            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.getWidth();

            // Header
            doc.setFillColor(15, 33, 55); // Navy 900
            doc.rect(0, 0, pageWidth, 40, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(22);
            doc.text('Factory Management Report', 15, 25);
            doc.setFontSize(10);
            const periodLabel = PERIODS.find(p => p.id === period)?.label || period;
            doc.text(`${periodLabel} Summary | Generated on: ${new Date().toLocaleString()}`, 15, 33);

            // Summary Info
            doc.setTextColor(30, 41, 59); // Slate 800
            doc.setFontSize(14);
            doc.text('Financial Summary', 15, 55);

            doc.autoTable({
                startY: 60,
                head: [['Total Revenue', 'Total Prod. Cost', 'Gross Profit']],
                body: [[
                    `Rs. ${data.summary.revenue.toLocaleString()}`,
                    `Rs. ${data.summary.cost.toLocaleString()}`,
                    `Rs. ${data.summary.profit.toLocaleString()}`
                ]],
                theme: 'striped',
                headStyles: { fillColor: [59, 130, 246] }
            });

            // Sales Table
            doc.setFontSize(14);
            doc.text('Sales Details', 15, doc.lastAutoTable.finalY + 15);
            const salesRows = data.sales.data.map(s => [
                s.invoiceNumber,
                new Date(s.date).toLocaleDateString(),
                s.customer,
                `Rs. ${s.totalAmount.toLocaleString()}`
            ]);
            doc.autoTable({
                startY: doc.lastAutoTable.finalY + 20,
                head: [['Invoice', 'Date', 'Customer', 'Amount']],
                body: salesRows,
                theme: 'grid'
            });

            // Production Table
            doc.setFontSize(14);
            doc.text('Production Activity', 15, doc.lastAutoTable.finalY + 15);
            const prodRows = data.production.data.map(p => [
                new Date(p.date).toLocaleDateString(),
                p.model?.name,
                p.quantity,
                `Rs. ${p.totalManufacturingCost.toLocaleString()}`
            ]);
            doc.autoTable({
                startY: doc.lastAutoTable.finalY + 20,
                head: [['Date', 'Model', 'Units', 'Cost']],
                body: prodRows,
                theme: 'grid',
                headStyles: { fillColor: [139, 92, 246] }
            });

            // Inventory Alerts
            if (data.inventory.lowStockRaw.length > 0 || data.inventory.lowStockFinished.length > 0) {
                doc.addPage();
                doc.setFontSize(14);
                doc.text('Inventory Alerts (Low Stock)', 15, 20);
                const alertRows = [
                    ...data.inventory.lowStockRaw.map(m => [`Raw: ${m.name}`, m.quantity, 'Low Stock']),
                    ...data.inventory.lowStockFinished.map(f => [`Finished: ${f.name}`, f.quantity, 'Low Stock'])
                ];
                doc.autoTable({
                    startY: 25,
                    head: [['Item', 'Current Stock', 'Status']],
                    body: alertRows,
                    headStyles: { fillColor: [239, 68, 68] }
                });
            }

            doc.save(`Factory_Report_${period}_${Date.now()}.pdf`);
            toast.success('Report downloaded!', { id: loadToast });
        } catch (error) {
            console.error(error);
            toast.error('Failed to generate PDF', { id: loadToast });
        }
    };

    useEffect(() => { fetchReports(); }, [period]);

    // Aggregate sales by model for pie chart
    const salesByModel = salesData?.sales?.reduce((acc, sale) => {
        sale.items.forEach(item => {
            const name = item.model?.name || 'Unknown';
            acc[name] = (acc[name] || 0) + item.quantity * item.price;
        });
        return acc;
    }, {});

    const pieData = Object.entries(salesByModel || {}).map(([name, value]) => ({ name, value }));

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold gradient-text">Reports</h1>
                    <p className="text-slate-500 mt-1">Sales, production, and profit analysis</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <div className="tabs-container overflow-x-auto whitespace-nowrap scrollbar-hide">
                        {PERIODS.map(p => (
                            <button key={p.id} onClick={() => setPeriod(p.id)}
                                className={`tab-button ${period === p.id ? 'active' : ''}`}>
                                {p.label}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={downloadPDF}
                        disabled={loading}
                        className="btn-primary flex items-center gap-2 py-2 px-4 shadow-lg shadow-primary-900/20 disabled:opacity-50"
                    >
                        <MdDownload size={18} /> Export PDF
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-5 stat-blue border border-blue-100 shadow-sm">
                    <p className="text-slate-500 text-sm font-medium">Total Revenue</p>
                    <p className="text-2xl font-bold text-blue-600 mt-1">Rs. {Number(salesData?.totalRevenue || 0).toLocaleString()}</p>
                    <p className="text-slate-400 text-xs mt-1">{salesData?.count || 0} invoices</p>
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-5 stat-purple border border-purple-100 shadow-sm">
                    <p className="text-slate-500 text-sm font-medium">Units Produced</p>
                    <p className="text-2xl font-bold text-purple-600 mt-1">{productionData?.totalUnits || 0}</p>
                    <p className="text-slate-400 text-xs mt-1">{productionData?.count || 0} production runs</p>
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-5 stat-amber border border-amber-100 shadow-sm">
                    <p className="text-slate-500 text-sm font-medium">Manufacturing Cost</p>
                    <p className="text-2xl font-bold text-amber-600 mt-1">Rs. {Number(productionData?.totalCost || 0).toLocaleString()}</p>
                    <p className="text-slate-400 text-xs mt-1">Gross profit: Rs. {Number((salesData?.totalRevenue || 0) - (productionData?.totalCost || 0)).toLocaleString()}</p>
                </motion.div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* Sales by model pie chart */}
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="glass-card p-6">
                    <h2 className="text-lg font-bold text-slate-800 mb-4">Revenue by Model</h2>
                    {pieData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={250}>
                            <PieChart>
                                <Pie data={pieData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                </Pie>
                                <Tooltip formatter={v => [`Rs. ${Number(v).toLocaleString()}`, 'Revenue']} contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', color: '#1e293b', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : <div className="h-64 flex items-center justify-center text-slate-400">No sales data for this period</div>}
                </motion.div>

                {/* Production bar chart */}
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="glass-card p-6">
                    <h2 className="text-lg font-bold text-slate-800 mb-4">Production by Model</h2>
                    {productionData?.productions?.length > 0 ? (() => {
                        const byModel = productionData.productions.reduce((acc, p) => {
                            const name = p.model?.name || 'Unknown';
                            acc[name] = (acc[name] || 0) + p.quantity;
                            return acc;
                        }, {});
                        const barData = Object.entries(byModel).map(([name, qty]) => ({ name, qty }));
                        return (
                            <ResponsiveContainer width="100%" height={250}>
                                <BarChart data={barData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                    <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 11 }} />
                                    <YAxis stroke="#64748b" tick={{ fontSize: 12 }} />
                                    <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', color: '#1e293b', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                    <Bar dataKey="qty" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Units" />
                                </BarChart>
                            </ResponsiveContainer>
                        );
                    })() : <div className="h-64 flex items-center justify-center text-slate-400">No production data for this period</div>}
                </motion.div>
            </div>

            {/* Sales Table */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="glass-card overflow-hidden">
                <div className="p-4 border-b border-slate-100">
                    <h2 className="text-lg font-bold text-slate-800">Sales Details</h2>
                </div>
                {loading ? <SkeletonTable rows={4} cols={4} /> : (
                    <div className="table-responsive">
                        <table className="data-table">
                            <thead><tr><th>Invoice</th><th>Date</th><th>Customer</th><th>Amount</th></tr></thead>
                            <tbody>
                                {salesData?.sales?.map(s => (
                                    <tr key={s._id}>
                                        <td className="font-mono text-primary-600 font-bold text-xs">{s.invoiceNumber}</td>
                                        <td className="text-slate-500">{new Date(s.date).toLocaleDateString()}</td>
                                        <td className="font-semibold text-slate-800">{s.customer}</td>
                                        <td className="text-emerald-600 font-bold">Rs. {Number(s.totalAmount).toLocaleString()}</td>
                                    </tr>
                                ))}
                                {!salesData?.sales?.length && <tr><td colSpan={4} className="text-center text-slate-400 py-6">No sales in this period</td></tr>}
                            </tbody>
                        </table>
                    </div>
                )}
            </motion.div>
        </div>
    );
};

export default Reports;
