import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    getSalesReport, getProductionReport, getFullReport,
    getBatchesReport, getWasteReport, getValuationReport,
    getVendors, getCustomers
} from '../services/api';
import { SkeletonTable } from '../components/Skeleton';
import { MdDownload, MdTrendingDown, MdOutlineInventory, MdTrendingUp, MdOutlineWarning, MdPeople } from 'react-icons/md';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import toast from 'react-hot-toast';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];

const Reports = () => {
    const [activeTab, setActiveTab] = useState('summary');
    const [loading, setLoading] = useState(true);

    // Reports data states
    const [salesReport, setSalesReport] = useState(null);
    const [productionReport, setProductionReport] = useState(null);
    const [batchStock, setBatchStock] = useState([]);
    const [wasteSummary, setWasteSummary] = useState([]);
    const [valuation, setValuation] = useState(null);
    const [vendors, setVendors] = useState([]);
    const [customers, setCustomers] = useState([]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [sales, prod, batches, waste, val, vend, cust] = await Promise.all([
                getSalesReport({ period: 'yearly' }),
                getProductionReport({ period: 'yearly' }),
                getBatchesReport(),
                getWasteReport(),
                getValuationReport(),
                getVendors(),
                getCustomers()
            ]);
            setSalesReport(sales.data);
            setProductionReport(prod.data);
            setBatchStock(batches.data || []);
            setWasteSummary(waste.data || []);
            setValuation(val.data);
            setVendors(vend.data || []);
            setCustomers(cust.data || []);
        } catch (e) {
            console.error(e);
            toast.error('Failed to load analytical reports');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [activeTab]);

    const downloadPDF = async () => {
        const loadToast = toast.loading('Preparing consolidated factory PDF report...');
        try {
            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.getWidth();

            // Header Banner
            doc.setFillColor(15, 32, 55); // Navy 900
            doc.rect(0, 0, pageWidth, 40, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(22);
            doc.text('Pipe Factory ERP Consolidated Report', 15, 25);
            doc.setFontSize(10);
            doc.text(`Generated on: ${new Date().toLocaleString()}`, 15, 33);

            // 1. Inventory Valuation Section
            doc.setTextColor(30, 41, 59);
            doc.setFontSize(14);
            doc.text('Inventory & Valuation Summary', 15, 55);
            doc.autoTable({
                startY: 60,
                head: [['Raw Materials Value', 'Finished Goods Value', 'Total Assets Valuation']],
                body: [[
                    `Rs. ${Number(valuation?.rawMaterialsValuation || 0).toLocaleString()}`,
                    `Rs. ${Number(valuation?.finishedGoodsValuation || 0).toLocaleString()}`,
                    `Rs. ${Number(valuation?.totalValuation || 0).toLocaleString()}`
                ]],
                theme: 'striped',
                headStyles: { fillColor: [59, 130, 246] }
            });

            // 2. Waste Analysis Section
            doc.setFontSize(14);
            doc.text('Raw Material Waste Analysis', 15, doc.lastAutoTable.finalY + 15);
            const wasteRows = wasteSummary.map(w => [
                w.name,
                `${w.standardQuantity.toFixed(1)} ${w.unit}`,
                `${w.actualQuantity.toFixed(1)} ${w.unit}`,
                `${w.waste.toFixed(1)} ${w.unit}`,
                `Rs. ${Number(w.cost || 0).toLocaleString()}`
            ]);
            doc.autoTable({
                startY: doc.lastAutoTable.finalY + 20,
                head: [['Material', 'Std Consumption', 'Actual Consumption', 'Waste Variance', 'Total Cost']],
                body: wasteRows,
                theme: 'grid',
                headStyles: { fillColor: [239, 68, 68] }
            });

            // 3. Batch Stock Section
            doc.addPage();
            doc.setFontSize(14);
            doc.text('Batch-wise Stock Report', 15, 20);
            const batchRows = batchStock.map(b => [
                b.batchNumber,
                b.rawMaterial?.name,
                new Date(b.purchaseDate).toLocaleDateString(),
                `${b.remainingQuantity} / ${b.quantityPurchased}`,
                `Rs. ${b.purchaseRate}/kg`,
                `Rs. ${(b.remainingQuantity * b.purchaseRate).toLocaleString()}`
            ]);
            doc.autoTable({
                startY: 25,
                head: [['Batch No', 'Material', 'Purchase Date', 'Remaining Qty', 'Rate', 'Total Value']],
                body: batchRows,
                theme: 'grid',
                headStyles: { fillColor: [139, 92, 246] }
            });

            // 4. Partner Ledgers
            doc.setFontSize(14);
            doc.text('Outstanding Accounts Summary', 15, doc.lastAutoTable.finalY + 15);
            const ledgerSummary = [
                ['Total Outstanding Receivables (Customers)', `Rs. ${customers.reduce((sum, c) => sum + (c.outstandingBalance || 0), 0).toLocaleString()}`],
                ['Total Outstanding Payables (Vendors)', `Rs. ${vendors.reduce((sum, v) => sum + (v.outstandingBalance || 0), 0).toLocaleString()}`]
            ];
            doc.autoTable({
                startY: doc.lastAutoTable.finalY + 20,
                head: [['Ledger Title', 'Balance']],
                body: ledgerSummary,
                theme: 'striped',
                headStyles: { fillColor: [16, 185, 129] }
            });

            doc.save(`Pipe_Factory_Consolidated_Report_${Date.now()}.pdf`);
            toast.success('PDF report saved successfully!', { id: loadToast });
        } catch (error) {
            console.error(error);
            toast.error('Failed to export PDF', { id: loadToast });
        }
    };

    const salesByProduct = salesReport?.sales?.reduce((acc, sale) => {
        sale.items.forEach(item => {
            const name = item.model?.name || 'Unknown';
            acc[name] = (acc[name] || 0) + (item.quantity * item.price);
        });
        return acc;
    }, {});
    const salesChartData = Object.entries(salesByProduct || {}).map(([name, value]) => ({ name, value }));

    const wasteChartData = wasteSummary.map(w => ({
        name: w.name,
        Waste: Math.max(0, w.waste),
        Standard: w.standardQuantity
    }));

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold gradient-text">Analytical Reports</h1>
                    <p className="text-slate-500 mt-1">Audit ledgers, valuation, waste, and batch inventory.</p>
                </div>
                <button onClick={downloadPDF} disabled={loading} className="btn-primary flex items-center gap-2 shadow-lg shadow-primary-900/20">
                    <MdDownload size={18} /> Export PDF Report
                </button>
            </div>

            {/* Tabs Selector */}
            <div className="tabs-container overflow-x-auto whitespace-nowrap scrollbar-hide">
                <button onClick={() => setActiveTab('summary')} className={`tab-button ${activeTab === 'summary' ? 'active' : ''}`}>Dashboard Summary</button>
                <button onClick={() => setActiveTab('valuation')} className={`tab-button ${activeTab === 'valuation' ? 'active' : ''}`}>Inventory Valuation</button>
                <button onClick={() => setActiveTab('batches')} className={`tab-button ${activeTab === 'batches' ? 'active' : ''}`}>Batch Stock (FIFO)</button>
                <button onClick={() => setActiveTab('waste')} className={`tab-button ${activeTab === 'waste' ? 'active' : ''}`}>Waste Analysis</button>
                <button onClick={() => setActiveTab('ledgers')} className={`tab-button ${activeTab === 'ledgers' ? 'active' : ''}`}>Vendor & Customer Ledgers</button>
            </div>

            {loading ? <SkeletonTable rows={6} cols={5} /> : (
                <AnimatePresence mode="wait">
                    {activeTab === 'summary' && (
                        <motion.div key="summary" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} className="space-y-6">
                            {/* Analytics Summary widgets */}
                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                                <div className="glass-card p-5 border border-indigo-100 stat-blue">
                                    <p className="text-slate-500 text-xs font-semibold">Total Revenue (Sales)</p>
                                    <p className="text-xl font-bold text-indigo-700 mt-1">Rs. {Number(salesReport?.totalRevenue || 0).toLocaleString()}</p>
                                    <p className="text-slate-400 text-[10px] mt-1">{salesReport?.count || 0} Invoices Generated</p>
                                </div>
                                <div className="glass-card p-5 border border-purple-100 stat-purple">
                                    <p className="text-slate-500 text-xs font-semibold">Production Cost Summary</p>
                                    <p className="text-xl font-bold text-purple-700 mt-1">Rs. {Number(productionReport?.totalCost || 0).toLocaleString()}</p>
                                    <p className="text-slate-400 text-[10px] mt-1">{productionReport?.totalUnits || 0} Pipes Extruded</p>
                                </div>
                                <div className="glass-card p-5 border border-emerald-100 stat-green">
                                    <p className="text-slate-500 text-xs font-semibold">Total Asset Valuation</p>
                                    <p className="text-xl font-bold text-emerald-700 mt-1">Rs. {Number(valuation?.totalValuation || 0).toLocaleString()}</p>
                                    <p className="text-slate-400 text-[10px] mt-1">Weighted average based</p>
                                </div>
                                <div className="glass-card p-5 border border-rose-100 stat-amber">
                                    <p className="text-slate-500 text-xs font-semibold">Accumulated Waste Cost</p>
                                    <p className="text-xl font-bold text-rose-700 mt-1">Rs. {Number(wasteSummary.reduce((sum, w) => sum + (Math.max(0, w.waste) * w.costPerUnit), 0)).toLocaleString()}</p>
                                    <p className="text-slate-400 text-[10px] mt-1">Material loss value</p>
                                </div>
                            </div>

                            {/* Recharts Graphs */}
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                                <div className="glass-card p-5">
                                    <h3 className="text-slate-800 font-bold mb-4 text-sm">Product Sales Revenue Contribution</h3>
                                    {salesChartData.length > 0 ? (
                                        <ResponsiveContainer width="100%" height={260}>
                                            <PieChart>
                                                <Pie data={salesChartData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                                                    {salesChartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                                </Pie>
                                                <Tooltip formatter={v => [`Rs. ${Number(v).toLocaleString()}`, 'Revenue']} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    ) : <p className="h-64 flex items-center justify-center text-slate-400 text-sm">No sales contributions logged.</p>}
                                </div>

                                <div className="glass-card p-5">
                                    <h3 className="text-slate-800 font-bold mb-4 text-sm">Material Waste vs. Standard Standards</h3>
                                    {wasteChartData.length > 0 ? (
                                        <ResponsiveContainer width="100%" height={260}>
                                            <BarChart data={wasteChartData}>
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                                                <YAxis tick={{ fontSize: 11 }} />
                                                <Tooltip />
                                                <Legend />
                                                <Bar dataKey="Standard" fill="#3b82f6" name="Standard (kg)" />
                                                <Bar dataKey="Waste" fill="#ef4444" name="Waste (kg)" />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    ) : <p className="h-64 flex items-center justify-center text-slate-400 text-sm">No waste logs compiled.</p>}
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'valuation' && (
                        <motion.div key="valuation" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} className="glass-card overflow-hidden">
                            <div className="p-4 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center">
                                <h2 className="text-base font-bold text-slate-800">Valuation Ledger (Weighted Average Valuation)</h2>
                                <span className="font-bold text-emerald-600 text-sm">Aggregate Valuation Assets: Rs. {Number(valuation?.totalValuation || 0).toLocaleString()}</span>
                            </div>

                            <div className="p-4 space-y-6">
                                <div>
                                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Raw Materials</h3>
                                    <table className="data-table">
                                        <thead><tr><th>Material</th><th>Stock Qty</th><th>Avg Rate</th><th>Calculated Value</th></tr></thead>
                                        <tbody>
                                            {valuation?.rawMaterialsList?.map((r, i) => (
                                                <tr key={i}>
                                                    <td className="font-semibold">{r.name}</td>
                                                    <td>{r.quantity} {r.unit}</td>
                                                    <td>Rs. {r.costPerUnit || 0}/kg</td>
                                                    <td className="font-bold text-slate-800">Rs. {Number(r.value || 0).toLocaleString()}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                <div>
                                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Finished Pipes</h3>
                                    <table className="data-table">
                                        <thead><tr><th>Finished Pipe</th><th>Stock Qty</th><th>Manufacturing Cost</th><th>Calculated Value</th></tr></thead>
                                        <tbody>
                                            {valuation?.finishedGoodsList?.map((f, i) => (
                                                <tr key={i}>
                                                    <td className="font-semibold">{f.name}</td>
                                                    <td>{f.quantity} units</td>
                                                    <td>Rs. {f.costPerUnit || 0}/pipe</td>
                                                    <td className="font-bold text-slate-800">Rs. {Number(f.value || 0).toLocaleString()}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'batches' && (
                        <motion.div key="batches" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} className="glass-card overflow-hidden">
                            <div className="p-4 bg-slate-50/50 border-b border-slate-100">
                                <h2 className="text-base font-bold text-slate-800">Batch-wise Raw Material Stock (FIFO Batches)</h2>
                            </div>
                            <div className="table-responsive">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Batch Number</th>
                                            <th>Raw Material</th>
                                            <th>Purchase Date</th>
                                            <th>Remaining Qty</th>
                                            <th>Purchase Rate</th>
                                            <th>FIFO Valuation</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {batchStock.map((b, i) => (
                                            <tr key={i}>
                                                <td className="font-mono font-bold text-indigo-600 text-xs">{b.batchNumber}</td>
                                                <td className="font-semibold">{b.rawMaterial?.name}</td>
                                                <td className="text-slate-500">{new Date(b.purchaseDate).toLocaleDateString()}</td>
                                                <td>{b.remainingQuantity} / {b.quantityPurchased} {b.rawMaterial?.unit}</td>
                                                <td>Rs. {b.purchaseRate}/kg</td>
                                                <td className="font-bold text-emerald-600">Rs. {Number(b.remainingQuantity * b.purchaseRate).toLocaleString()}</td>
                                            </tr>
                                        ))}
                                        {!batchStock.length && <tr><td colSpan={6} className="text-center text-slate-400 py-6">No batch stock remaining.</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'waste' && (
                        <motion.div key="waste" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} className="glass-card overflow-hidden">
                            <div className="p-4 bg-slate-50/50 border-b border-slate-100">
                                <h2 className="text-base font-bold text-slate-800">Material Waste Variance Analysis</h2>
                            </div>
                            <div className="table-responsive">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Raw Material</th>
                                            <th>Total Standard Qty</th>
                                            <th>Total Actual Consumed</th>
                                            <th>Waste Variance</th>
                                            <th>Waste Loss Valuation</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {wasteSummary.map((w, i) => {
                                            const isWasted = w.waste > 0;
                                            return (
                                                <tr key={i}>
                                                    <td className="font-semibold">{w.name}</td>
                                                    <td>{w.standardQuantity.toFixed(1)} {w.unit}</td>
                                                    <td>{w.actualQuantity.toFixed(1)} {w.unit}</td>
                                                    <td className={`font-bold ${isWasted ? 'text-rose-600' : 'text-emerald-600'}`}>
                                                        {isWasted ? `+${w.waste.toFixed(1)}` : w.waste.toFixed(1)} {w.unit}
                                                    </td>
                                                    <td className="font-bold text-slate-700">Rs. {Number(Math.max(0, w.waste) * (w.cost / (w.actualQuantity || 1))).toLocaleString()}</td>
                                                </tr>
                                            );
                                        })}
                                        {!wasteSummary.length && <tr><td colSpan={5} className="text-center text-slate-400 py-6">No production wastes compiled.</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'ledgers' && (
                        <motion.div key="ledgers" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                            {/* Vendor Accounts payable */}
                            <div className="glass-card overflow-hidden">
                                <div className="p-4 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center">
                                    <h2 className="text-sm font-bold text-slate-800">Vendor Ledger (Outstanding Payables)</h2>
                                    <span className="text-xs font-bold text-rose-600">Total: Rs. {vendors.reduce((sum, v) => sum + (v.outstandingBalance || 0), 0).toLocaleString()}</span>
                                </div>
                                <div className="table-responsive">
                                    <table className="data-table">
                                        <thead><tr><th>Vendor</th><th>Terms</th><th>Payable Balance</th></tr></thead>
                                        <tbody>
                                            {vendors.map((v, i) => (
                                                <tr key={i}>
                                                    <td>
                                                        <p className="font-semibold text-slate-800">{v.name}</p>
                                                        <p className="text-[10px] text-slate-400">{v.companyName}</p>
                                                    </td>
                                                    <td className="text-xs">{v.paymentTerms}</td>
                                                    <td className={`font-bold ${v.outstandingBalance > 0 ? 'text-rose-600' : 'text-slate-500'}`}>Rs. {Number(v.outstandingBalance || 0).toLocaleString()}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Customer Accounts receivable */}
                            <div className="glass-card overflow-hidden">
                                <div className="p-4 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center">
                                    <h2 className="text-sm font-bold text-slate-800">Customer Ledger (Outstanding Receivables)</h2>
                                    <span className="text-xs font-bold text-emerald-600">Total: Rs. {customers.reduce((sum, c) => sum + (c.outstandingBalance || 0), 0).toLocaleString()}</span>
                                </div>
                                <div className="table-responsive">
                                    <table className="data-table">
                                        <thead><tr><th>Customer</th><th>Company</th><th>Receivable Balance</th></tr></thead>
                                        <tbody>
                                            {customers.map((c, i) => (
                                                <tr key={i}>
                                                    <td>
                                                        <p className="font-semibold text-slate-800">{c.name}</p>
                                                        <p className="text-[10px] text-slate-400">{c.mobile}</p>
                                                    </td>
                                                    <td className="text-xs">{c.companyName || '—'}</td>
                                                    <td className={`font-bold ${c.outstandingBalance > 0 ? 'text-emerald-600' : 'text-slate-500'}`}>Rs. {Number(c.outstandingBalance || 0).toLocaleString()}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            )}
        </div>
    );
};

export default Reports;
