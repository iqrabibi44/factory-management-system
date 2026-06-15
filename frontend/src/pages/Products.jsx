import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getProducts, createProduct, updateProduct, deleteProduct, getAllModels, createModel, updateModel, deleteModel, getRawMaterials, getFinishedGoods } from '../services/api';
import Modal from '../components/Modal';
import { SkeletonTable } from '../components/Skeleton';
import { MdAdd, MdEdit, MdDelete, MdCategory, MdSearch } from 'react-icons/md';
import toast from 'react-hot-toast';

const CATEGORIES = ['Room Cooler', 'Fan', 'Washing Machine', 'Spinner'];

const emptyProduct = { name: '', description: '', category: 'Room Cooler', image: '' };
const emptyModel = { name: '', product: '', description: '', price: '', productionCost: '', manufacturingCost: '', image: '', bom: [] };

const Products = () => {
    const [products, setProducts] = useState([]);
    const [models, setModels] = useState([]);
    const [rawMaterials, setRawMaterials] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('products');
    const [search, setSearch] = useState('');
    const [productModal, setProductModal] = useState({ open: false, data: emptyProduct, editing: null });
    const [modelModal, setModelModal] = useState({ open: false, data: emptyModel, editing: null });
    const [previewProduct, setPreviewProduct] = useState(null);
    const [finishedGoods, setFinishedGoods] = useState([]);

    const fetchAll = async () => {
        setLoading(true);
        try {
            const [p, m, rm, fg] = await Promise.all([getProducts(), getAllModels(), getRawMaterials(), getFinishedGoods()]);
            setProducts(p.data.products || []);
            setModels(m.data || []);
            setRawMaterials(rm.data || []);
            setFinishedGoods(fg.data || []);
        } catch (e) { toast.error('Failed to load data'); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchAll(); }, []);

    // Product CRUD
    const saveProduct = async () => {
        try {
            if (productModal.editing) {
                await updateProduct(productModal.editing, productModal.data);
                toast.success('Product updated');
            } else {
                await createProduct(productModal.data);
                toast.success('Product created');
            }
            setProductModal({ open: false, data: emptyProduct, editing: null });
            fetchAll();
        } catch (e) { toast.error(e.response?.data?.message || 'Error'); }
    };

    const removeProduct = async (id) => {
        if (!confirm('Delete this product and all its models?')) return;
        try { await deleteProduct(id); toast.success('Deleted'); fetchAll(); }
        catch (e) { toast.error('Error deleting'); }
    };

    // Model CRUD
    const addBomRow = () => setModelModal(prev => ({ ...prev, data: { ...prev.data, bom: [...prev.data.bom, { rawMaterial: '', quantity: 1 }] } }));
    const removeBomRow = (i) => setModelModal(prev => ({ ...prev, data: { ...prev.data, bom: prev.data.bom.filter((_, idx) => idx !== i) } }));
    const updateBomRow = (i, field, value) => setModelModal(prev => {
        const bom = [...prev.data.bom];
        bom[i] = { ...bom[i], [field]: value };
        return { ...prev, data: { ...prev.data, bom } };
    });

    const saveModel = async () => {
        try {
            const currentBomCost = modelModal.data.bom.reduce((sum, item) => {
                if (!item.rawMaterial) return sum;
                const material = rawMaterials.find(rm => rm._id === item.rawMaterial);
                const cost = material ? material.costPerUnit : 0;
                return sum + (Number(item.quantity) || 0) * cost;
            }, 0);
            const computedMfgCost = (Number(modelModal.data.productionCost) || 0) + currentBomCost;

            const payload = { 
                ...modelModal.data, 
                manufacturingCost: computedMfgCost,
                bom: modelModal.data.bom.filter(b => b.rawMaterial) 
            };
            if (modelModal.editing) {
                await updateModel(modelModal.editing, payload);
                toast.success('Model updated');
            } else {
                await createModel(payload);
                toast.success('Model created');
            }
            setModelModal({ open: false, data: emptyModel, editing: null });
            fetchAll();
        } catch (e) { toast.error(e.response?.data?.message || 'Error'); }
    };

    const removeModel = async (id) => {
        if (!confirm('Delete this model?')) return;
        try { await deleteModel(id); toast.success('Deleted'); fetchAll(); }
        catch (e) { toast.error('Error'); }
    };

    const filteredProducts = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
    const filteredModels = models.filter(m => m.name.toLowerCase().includes(search.toLowerCase()));

    const currentBomCost = modelModal.data.bom.reduce((sum, item) => {
        if (!item.rawMaterial) return sum;
        const material = rawMaterials.find(rm => rm._id === item.rawMaterial);
        const cost = material ? material.costPerUnit : 0;
        return sum + (Number(item.quantity) || 0) * cost;
    }, 0);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold gradient-text">Products</h1>
                    <p className="text-slate-500 mt-1">Manage product categories and models</p>
                </div>
                <button
                    onClick={() => activeTab === 'products'
                        ? setProductModal({ open: true, data: emptyProduct, editing: null })
                        : setModelModal({ open: true, data: emptyModel, editing: null })}
                    className="btn-primary flex items-center gap-2"
                >
                    <MdAdd size={20} /> Add {activeTab === 'products' ? 'Product' : 'Model'}
                </button>
            </div>

            {/* Tabs */}
            <div className="tabs-container">
                {['products', 'models'].map(tab => (
                    <button key={tab} onClick={() => setActiveTab(tab)}
                        className={`tab-button ${activeTab === tab ? 'active' : ''}`}>
                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                ))}
            </div>

            {/* Search */}
            <div className="relative max-w-sm">
                <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="form-input pl-10" />
            </div>

            {/* Products Table */}
            {activeTab === 'products' && (
                loading ? <SkeletonTable rows={4} cols={4} /> : (
                    <div className="glass-card overflow-hidden">
                        <div className="table-responsive">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Image</th>
                                        <th>Product Name</th>
                                        <th>Category</th>
                                        <th className="text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredProducts.map(p => (
                                        <motion.tr key={p._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                            <td className="cursor-pointer" onClick={() => setPreviewProduct(p)}>
                                                <div className="relative group/img overflow-hidden rounded-lg w-12 h-12 ring-2 ring-slate-100 hover:ring-primary-400 transition-all">
                                                    <img src={p.image || `https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=60`} alt={p.name} className="w-full h-full object-cover group-hover/img:scale-110 transition-transform duration-300" />
                                                    <div className="absolute inset-0 bg-primary-600/40 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity">
                                                        <span className="text-[8px] text-white font-bold">VIEW</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="font-bold text-slate-800 cursor-pointer hover:text-primary-600 transition-colors" onClick={() => setPreviewProduct(p)}>
                                                {p.name}
                                            </td>
                                            <td><span className="badge-primary">{p.category}</span></td>
                                            <td>
                                                <div className="flex gap-2 justify-end">
                                                    <button onClick={() => setProductModal({ open: true, data: { name: p.name, description: p.description, category: p.category, image: p.image }, editing: p._id })} className="p-2 rounded-lg bg-slate-100 hover:bg-primary-600 text-slate-500 hover:text-white transition-all"><MdEdit size={16} /></button>
                                                    <button onClick={() => removeProduct(p._id)} className="p-2 rounded-lg bg-slate-100 hover:bg-rose-600 text-slate-500 hover:text-white transition-all"><MdDelete size={16} /></button>
                                                </div>
                                            </td>
                                        </motion.tr>
                                    ))}
                                    {!filteredProducts.length && <tr><td colSpan={4} className="text-center text-slate-400 py-8">No products found</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )
            )}

            {/* Models Table */}
            {activeTab === 'models' && (
                loading ? <SkeletonTable rows={5} cols={5} /> : (
                    <div className="glass-card overflow-hidden">
                        <div className="table-responsive">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Model Name</th>
                                        <th>Product</th>
                                        <th>Cost</th>
                                        <th>Price</th>
                                        <th>BOM</th>
                                        <th className="text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredModels.map(m => (
                                        <motion.tr key={m._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                            <td className="font-bold text-slate-800 uppercase tracking-tight">{m.name}</td>
                                            <td><span className="badge-purple">{m.product?.name}</span></td>
                                            <td className="font-medium text-slate-700">Rs. {Number(m.manufacturingCost).toLocaleString()}</td>
                                            <td className="font-bold text-emerald-600">Rs. {Number(m.price).toLocaleString()}</td>
                                            <td><span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{m.bom?.length} Items</span></td>
                                            <td>
                                                <div className="flex gap-2 justify-end">
                                                    <button onClick={() => setModelModal({ open: true, data: { name: m.name, image: m.image, productionCost: m.productionCost || 0, manufacturingCost: m.manufacturingCost, price: m.price, product: m.product?._id, bom: m.bom?.map(b => ({ rawMaterial: b.rawMaterial?._id, quantity: b.quantity })) || [] }, editing: m._id })} className="p-2 rounded-lg bg-slate-100 hover:bg-purple-600 text-slate-500 hover:text-white transition-all"><MdEdit size={16} /></button>
                                                    <button onClick={() => removeModel(m._id)} className="p-2 rounded-lg bg-slate-100 hover:bg-rose-600 text-slate-500 hover:text-white transition-all"><MdDelete size={16} /></button>
                                                </div>
                                            </td>
                                        </motion.tr>
                                    ))}
                                    {!filteredModels.length && <tr><td colSpan={6} className="text-center text-slate-400 py-8">No models found</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )
            )}

            {/* Product Modal */}
            <Modal isOpen={productModal.open} onClose={() => setProductModal({ open: false, data: emptyProduct, editing: null })} title={productModal.editing ? 'Edit Product' : 'Add Product'}>
                <div className="space-y-4">
                    <div><label className="block text-slate-600 text-sm font-medium mb-1">Name</label><input value={productModal.data.name} onChange={e => setProductModal(p => ({ ...p, data: { ...p.data, name: e.target.value } }))} className="form-input" placeholder="Product name" /></div>
                    <div><label className="block text-slate-600 text-sm font-medium mb-1">Category</label>
                        <select value={productModal.data.category} onChange={e => setProductModal(p => ({ ...p, data: { ...p.data, category: e.target.value } }))} className="form-input">
                            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    <div><label className="block text-slate-600 text-sm font-medium mb-1">Description</label><textarea value={productModal.data.description} onChange={e => setProductModal(p => ({ ...p, data: { ...p.data, description: e.target.value } }))} className="form-input" rows={3} /></div>
                    <div><label className="block text-slate-600 text-sm font-medium mb-1">Image URL</label><input value={productModal.data.image} onChange={e => setProductModal(p => ({ ...p, data: { ...p.data, image: e.target.value } }))} className="form-input" placeholder="https://..." /></div>
                    <div className="flex gap-3 pt-2">
                        <button onClick={saveProduct} className="btn-primary flex-1">Save Product</button>
                        <button onClick={() => setProductModal({ open: false, data: emptyProduct, editing: null })} className="btn-secondary flex-1">Cancel</button>
                    </div>
                </div>
            </Modal>

            {/* Model Modal */}
            <Modal isOpen={modelModal.open} onClose={() => setModelModal({ open: false, data: emptyModel, editing: null })} title={modelModal.editing ? 'Edit Model' : 'Add Model'} size="lg">
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-slate-600 text-sm font-medium mb-1">Model Name</label><input value={modelModal.data.name} onChange={e => setModelModal(p => ({ ...p, data: { ...p.data, name: e.target.value } }))} className="form-input" /></div>
                        <div><label className="block text-slate-600 text-sm font-medium mb-1">Product</label>
                            <select value={modelModal.data.product} onChange={e => setModelModal(p => ({ ...p, data: { ...p.data, product: e.target.value } }))} className="form-input">
                                <option value="">Select product</option>
                                {products.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                            </select>
                        </div>
                        <div><label className="block text-slate-600 text-sm font-medium mb-1">Price (Rs.)</label><input type="number" value={modelModal.data.price} onChange={e => setModelModal(p => ({ ...p, data: { ...p.data, price: e.target.value } }))} className="form-input" /></div>
                        <div><label className="block text-slate-600 text-sm font-medium mb-1">Production Cost (Rs.)</label><input type="number" value={modelModal.data.productionCost} onChange={e => setModelModal(p => ({ ...p, data: { ...p.data, productionCost: e.target.value } }))} className="form-input" placeholder="e.g. 20" /></div>
                    </div>
                    
                    {/* Cost Summary Panel */}
                    <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Manufacturing Cost Breakdown</span>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm font-medium text-slate-600">
                                <span>Production Cost: <strong className="text-slate-800">Rs. {Number(modelModal.data.productionCost || 0).toLocaleString()}</strong></span>
                                <span className="text-slate-300 hidden sm:inline">|</span>
                                <span>BOM Cost: <strong className="text-slate-800">Rs. {currentBomCost.toLocaleString()}</strong></span>
                            </div>
                        </div>
                        <div className="sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 w-full sm:w-auto">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Calculated Mfg Cost</span>
                            <span className="text-xl font-extrabold text-purple-600">Rs. {(Number(modelModal.data.productionCost || 0) + currentBomCost).toLocaleString()}</span>
                        </div>
                    </div>

                    <div><label className="block text-slate-600 text-sm font-medium mb-1">Image URL</label><input value={modelModal.data.image} onChange={e => setModelModal(p => ({ ...p, data: { ...p.data, image: e.target.value } }))} className="form-input" placeholder="https://..." /></div>

                    {/* BOM Section */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-slate-600 text-sm font-bold">Bill of Materials (BOM)</label>
                            <button onClick={addBomRow} className="text-xs btn-secondary py-1 px-3">+ Add Material</button>
                        </div>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                            {modelModal.data.bom.map((b, i) => (
                                <div key={i} className="flex gap-2 items-center">
                                    <select value={b.rawMaterial} onChange={e => updateBomRow(i, 'rawMaterial', e.target.value)} className="form-input flex-1 py-2 text-sm">
                                        <option value="">Select material</option>
                                        {rawMaterials.map(rm => <option key={rm._id} value={rm._id}>{rm.name} ({rm.unit})</option>)}
                                    </select>
                                    <input type="number" value={b.quantity} onChange={e => updateBomRow(i, 'quantity', e.target.value)} className="form-input w-24 py-2 text-sm" placeholder="Qty" min={1} />
                                    <button onClick={() => removeBomRow(i)} className="p-2 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100"><MdDelete size={16} /></button>
                                </div>
                            ))}
                            {!modelModal.data.bom.length && <p className="text-slate-400 text-sm text-center py-2">No BOM items. Click "+ Add Material" to add.</p>}
                        </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button onClick={saveModel} className="btn-primary flex-1">Save Model</button>
                        <button onClick={() => setModelModal({ open: false, data: emptyModel, editing: null })} className="btn-secondary flex-1">Cancel</button>
                    </div>
                </div>
            </Modal>

            {/* Interactive Product Preview Modal */}
            <AnimatePresence>
                {previewProduct && (
                    <Modal
                        isOpen={!!previewProduct}
                        onClose={() => setPreviewProduct(null)}
                        title={previewProduct.name}
                        size="xl"
                    >
                        <div className="space-y-6">
                            <div className="flex flex-col md:flex-gap-6 md:flex-row items-start gap-4">
                                <motion.img
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    src={previewProduct.image || `https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=480`}
                                    alt={previewProduct.name}
                                    className="w-full md:w-48 h-48 rounded-2xl object-cover shadow-xl ring-4 ring-slate-50"
                                />
                                <div className="flex-1">
                                    <div className="flex flex-wrap items-center gap-3 mb-3">
                                        <span className="badge-primary px-3 py-1 text-sm">{previewProduct.category}</span>
                                        <span className="text-slate-400 text-sm italic font-medium">ID: {previewProduct._id.slice(-6).toUpperCase()}</span>
                                    </div>
                                    <h2 className="text-2xl font-bold text-slate-800 mb-2">{previewProduct.name}</h2>
                                    <p className="text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100 text-sm md:text-base">
                                        {previewProduct.description || "The ultimate choice for performance and durability. This product range is engineered to meet the highest standards of industrial excellence."}
                                    </p>
                                </div>
                            </div>

                            <hr className="border-slate-100" />

                            <div>
                                <div className="flex items-center justify-between mb-5">
                                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                        <div className="w-1.5 h-6 bg-primary-600 rounded-full" />
                                        Available Models
                                    </h3>
                                    <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                                        {models.filter(m => m.product?._id === previewProduct._id).length} Variations
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-4">
                                    {models.filter(m => m.product?._id === previewProduct._id).map((model, idx) => {
                                        const stock = finishedGoods.find(fg => fg.model?._id === model._id)?.quantity || 0;
                                        return (
                                            <motion.div
                                                key={model._id}
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: idx * 0.1 }}
                                                className={`bg-white border rounded-2xl p-4 hover:shadow-xl transition-all hover:-translate-y-1 group/card ${stock > 0 ? 'border-slate-200' : 'border-slate-100 opacity-80'}`}
                                            >
                                                <div className="relative h-40 rounded-xl overflow-hidden mb-4 shadow-sm">
                                                    <img src={model.image || 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=300'} alt={model.name} className="w-full h-full object-cover transition-transform group-hover/card:scale-110 duration-500" />
                                                    <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
                                                        <span className={`px-2 py-1 rounded-lg text-[10px] font-bold shadow-sm backdrop-blur-md ${stock > 0 ? 'bg-emerald-500/90 text-white ring-1 ring-emerald-400' : 'bg-rose-500/90 text-white ring-1 ring-rose-400'}`}>
                                                            {stock > 0 ? `${stock} IN STOCK` : 'OUT OF STOCK'}
                                                        </span>
                                                        {stock > 10 && <span className="px-2 py-0.5 rounded-full bg-blue-500/80 text-white text-[8px] font-black tracking-widest uppercase shadow-sm">Hot Seller</span>}
                                                    </div>
                                                </div>
                                                <h4 className="font-bold text-slate-800 group-hover/card:text-primary-600 transition-colors uppercase tracking-tight flex items-center justify-between">
                                                    {model.name}
                                                    <div className={`w-2 h-2 rounded-full ${stock > 0 ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-slate-300'}`} />
                                                </h4>
                                                <p className="text-[10px] text-slate-500 mt-1 line-clamp-2 min-h-[30px]">{model.description || 'Superior craftsmanship and premium materials for long-lasting reliability.'}</p>
                                                <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-50">
                                                    <div className="flex flex-col">
                                                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">Market Price</p>
                                                        <p className="text-emerald-600 font-extrabold text-base">Rs. {Number(model.price).toLocaleString()}</p>
                                                    </div>
                                                    <div className="text-right flex flex-col">
                                                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">Inventory</p>
                                                        <div className="flex items-center gap-1.5 justify-end">
                                                            <div className="w-4 h-4 rounded bg-purple-100 flex items-center justify-center text-[10px] text-purple-600 font-bold">{model.bom?.length || 0}</div>
                                                            <p className="text-slate-600 font-bold text-sm">BOM</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                    {models.filter(m => m.product?._id === previewProduct._id).length === 0 && (
                                        <div className="col-span-full py-12 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                                            <MdCategory className="mx-auto text-slate-300 mb-2" size={40} />
                                            <p className="text-slate-500 font-medium">No models found for this product category.</p>
                                            <button onClick={() => { setPreviewProduct(null); setActiveTab('models'); setModelModal({ open: true, data: { ...emptyModel, product: previewProduct._id }, editing: null }); }} className="mt-3 text-primary-600 font-bold text-sm hover:underline">Add First Model</button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </Modal>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Products;
