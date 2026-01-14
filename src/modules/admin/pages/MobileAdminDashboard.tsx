import React, { useState, useEffect, useMemo } from 'react';
import {
    Home, UtensilsCrossed, ShoppingBag, BarChart3, Settings, Plus, TrendingUp, DollarSign, Package, Sparkles,
    ArrowRight, Loader2, Check, Clock, AlertCircle, Users, Shield, X, Wand2, Edit3,
    FileText, Download, Calendar, Building, Lock, Activity, Briefcase, Wallet, Receipt
} from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth, db } from '../../../core/firebase';
import { collection, onSnapshot, query, where, orderBy, Timestamp, addDoc, deleteDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import type { Order, Product, Category } from '../../../core/types';
import { motion, AnimatePresence } from 'framer-motion';
import { startOfDay } from 'date-fns';
import { getProductSuggestions, type AIAnalysisResult } from '../../../core/services/geminiAI';

const DashboardStyles = () => (
    <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap');
    :root { --bk-red: #D62300; --bk-orange: #FAAF18; --bk-brown: #502314; --bk-cream: #F5EBDC; --bk-dark: #2B1810; --glass-border: rgba(255, 255, 255, 0.1); --glass-surface: rgba(255, 255, 255, 0.05); --glass-highlight: rgba(255, 255, 255, 0.15); }
    body { font-family: 'Outfit', sans-serif; background-color: var(--bk-brown); color: var(--bk-cream); }
    .ios-glass { background: rgba(43, 24, 16, 0.7); backdrop-filter: blur(40px) saturate(180%); -webkit-backdrop-filter: blur(40px) saturate(180%); border: 1px solid var(--glass-border); box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3); }
    .ios-card { background: linear-gradient(145deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border: 1px solid var(--glass-border); box-shadow: 0 4px 24px -1px rgba(0, 0, 0, 0.2); }
    .ios-card-hover:active { transform: scale(0.98); background: linear-gradient(145deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.04) 100%); }
    .ios-input { background: rgba(0, 0, 0, 0.2); backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.1); color: white; }
    .ios-input::placeholder { color: rgba(255, 255, 255, 0.3); }
    .shimmer-text { background: linear-gradient(90deg, #fff 0%, #FAAF18 50%, #fff 100%); background-size: 200% auto; -webkit-background-clip: text; -webkit-text-fill-color: transparent; animation: shimmer 3s linear infinite; }
    @keyframes shimmer { to { background-position: 200% center; } }
    .hide-scrollbar::-webkit-scrollbar { display: none; }
  `}</style>
);

const useAdminDashboard = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
            setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Product[]);
        });
        const today = startOfDay(new Date());
        const qToday = query(collection(db, 'orders'), where('createdAt', '>=', Timestamp.fromDate(today)), orderBy('createdAt', 'desc'));
        const unsubOrders = onSnapshot(qToday, (snapshot) => {
            setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Order[]);
            setLoading(false);
        });
        return () => { unsubOrders(); unsubProducts(); };
    }, []);

    const stats = useMemo(() => ({
        totalRevenue: orders.reduce((sum, order) => sum + order.totalAmount, 0),
        pendingOrders: orders.filter(o => ['Pending', 'Cooking'].includes(o.status)).length,
        completedOrders: orders.filter(o => o.status === 'Completed').length,
        problemOrders: orders.filter(o => o.status === 'Cancelled').length,
        avgOrderValue: orders.length > 0 ? orders.reduce((sum, o) => sum + o.totalAmount, 0) / orders.length : 0,
    }), [orders]);

    const productActions = {
        toggleAvailability: async (id: string, current: boolean) => {
            await updateDoc(doc(db, 'products', id), { isAvailable: !current });
        },
        deleteProduct: async (id: string) => {
            if (window.confirm('Delete this item?')) await deleteDoc(doc(db, 'products', id));
        },
        addProduct: async (data: any) => {
            await addDoc(collection(db, 'products'), { ...data, price: Number(data.price), isAvailable: true, createdAt: serverTimestamp() });
        }
    };

    return { orders, products, stats, productActions, loading };
};

const AIProductForm: React.FC<{ isOpen: boolean; onClose: () => void; onSave: (product: any) => void }> = ({ isOpen, onClose, onSave }) => {
    const [mode, setMode] = useState<'choice' | 'ai' | 'manual'>('choice');
    const [productName, setProductName] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [aiAnalysis, setAiAnalysis] = useState<AIAnalysisResult | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        price: 0,
        category: 'Burgers' as Category,
        ingredients: [] as string[],
        allergens: [] as string[],
        calories: 0,
        prepTime: 0,
        servingSize: '',
        tags: [] as string[],
        image: '',
        isAvailable: true
    });
    const [newIngredient, setNewIngredient] = useState('');
    const [newAllergen, setNewAllergen] = useState('');

    const categories: Category[] = ['Burgers', 'Sides', 'Drinks', 'Desserts', 'Breakfast'];

    const handleGetSuggestions = async () => {
        if (!productName.trim()) return;
        setIsAnalyzing(true);
        try {
            const analysis = await getProductSuggestions(productName, formData.category);
            setAiAnalysis(analysis);
            setFormData({ ...formData, ...analysis.suggestion });
        } catch (err) {
            console.error('AI Error:', err);
            setFormData({ ...formData, name: productName });
            setMode('manual');
        } finally {
            setIsAnalyzing(false);
        }
    };

    const addIngredient = () => {
        if (newIngredient.trim()) {
            setFormData({ ...formData, ingredients: [...formData.ingredients, newIngredient.trim()] });
            setNewIngredient('');
        }
    };

    const removeIngredient = (index: number) => {
        setFormData({ ...formData, ingredients: formData.ingredients.filter((_, i) => i !== index) });
    };

    const addAllergen = () => {
        if (newAllergen.trim()) {
            setFormData({ ...formData, allergens: [...formData.allergens, newAllergen.trim()] });
            setNewAllergen('');
        }
    };

    const removeAllergen = (index: number) => {
        setFormData({ ...formData, allergens: formData.allergens.filter((_, i) => i !== index) });
    };

    const handleSave = () => {
        if (!formData.name || !formData.price) {
            alert('Please fill in product name and price');
            return;
        }
        onSave(formData);
        onClose();
        setMode('choice');
        setFormData({
            name: '', description: '', price: 0, category: 'Burgers' as Category,
            ingredients: [], allergens: [], calories: 0, prepTime: 0,
            servingSize: '', tags: [], image: '', isAvailable: true
        });
        setAiAnalysis(null);
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-end md:items-center justify-center" onClick={onClose}>
                <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} onClick={(e) => e.stopPropagation()} className="bg-[#2B1810] w-full md:max-w-2xl md:rounded-[2rem] rounded-t-[2rem] max-h-[90vh] overflow-hidden flex flex-col border border-white/10 shadow-2xl">
                    {/* Header */}
                    <div className="p-6 bg-gradient-to-r from-bk-red to-orange-700 flex justify-between items-center relative overflow-hidden">
                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
                        <h2 className="text-2xl font-black text-white italic relative z-10">Add Product</h2>
                        <button onClick={onClose} className="p-2 bg-black/20 rounded-full text-white/80 hover:bg-black/40 transition-colors relative z-10"><X size={20} /></button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-6 text-white hide-scrollbar">
                        {/* Choice Mode */}
                        {mode === 'choice' && (
                            <div className="grid gap-4">
                                <button onClick={() => setMode('ai')} className="ios-card p-6 rounded-2xl text-left hover:border-bk-orange/50 transition-all group">
                                    <div className="w-12 h-12 bg-bk-orange/20 rounded-xl flex items-center justify-center mb-3 text-bk-orange group-hover:bg-bk-orange group-hover:text-black transition-colors"><Wand2 /></div>
                                    <h3 className="font-bold text-lg mb-1">AI Assistant</h3>
                                    <p className="text-sm text-white/50">Auto-generate complete product details</p>
                                </button>
                                <button onClick={() => setMode('manual')} className="ios-card p-6 rounded-2xl text-left hover:border-bk-red/50 transition-all group">
                                    <div className="w-12 h-12 bg-bk-red/20 rounded-xl flex items-center justify-center mb-3 text-bk-red group-hover:bg-bk-red group-hover:text-white transition-colors"><Edit3 /></div>
                                    <h3 className="font-bold text-lg mb-1">Manual Entry</h3>
                                    <p className="text-sm text-white/50">Fill in all details yourself</p>
                                </button>
                            </div>
                        )}

                        {/* AI Mode - Name Input */}
                        {mode === 'ai' && !aiAnalysis && (
                            <div className="ios-card p-6 rounded-2xl space-y-4 border-bk-orange/30 border">
                                <h3 className="font-bold text-bk-orange flex items-center gap-2"><Sparkles size={16} /> AI Magic</h3>
                                <div>
                                    <label className="text-xs font-bold text-white/50 uppercase mb-2 block">Category</label>
                                    <select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value as Category })} className="w-full ios-input p-3 rounded-xl">
                                        {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-white/50 uppercase mb-2 block">Product Name</label>
                                    <input value={productName} onChange={e => setProductName(e.target.value)} className="w-full ios-input p-3 rounded-xl" placeholder="e.g. Double Whopper with Cheese" />
                                </div>
                                <button onClick={handleGetSuggestions} disabled={isAnalyzing || !productName} className="w-full bg-gradient-to-r from-purple-600 to-blue-600 p-4 rounded-xl font-black flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-all">
                                    {isAnalyzing ? <Loader2 className="animate-spin" /> : <Wand2 size={18} />}
                                    {isAnalyzing ? 'Generating Magic...' : 'Generate Product'}
                                </button>
                                <button onClick={() => setMode('choice')} className="w-full p-2 text-white/40 text-sm font-bold hover:text-white/60 transition-colors">← Back</button>
                            </div>
                        )}

                        {/* Form Mode - Full Details */}
                        {((mode === 'ai' && aiAnalysis) || mode === 'manual') && (
                            <div className="space-y-5">
                                {/* AI Price Recommendation */}
                                {aiAnalysis && (
                                    <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
                                        <div className="flex gap-2 items-center text-green-400 font-bold mb-1">
                                            <DollarSign size={16} /> Recommended Price: ${aiAnalysis.priceAnalysis.recommendedPrice}
                                        </div>
                                        <p className="text-xs text-green-400/70">{aiAnalysis.priceAnalysis.reasoning}</p>
                                    </div>
                                )}

                                {/* Basic Info */}
                                <div className="ios-card p-4 rounded-2xl space-y-4">
                                    <h4 className="font-bold text-white flex items-center gap-2"><Package size={16} /> Basic Information</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="col-span-2">
                                            <label className="text-xs font-bold text-white/50 uppercase mb-2 block">Product Name *</label>
                                            <input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full ios-input p-3 rounded-xl" placeholder="e.g. Whopper" />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-white/50 uppercase mb-2 block">Category *</label>
                                            <select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value as Category })} className="w-full ios-input p-3 rounded-xl">
                                                {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-white/50 uppercase mb-2 block">Price ($) *</label>
                                            <input type="number" step="0.01" value={formData.price} onChange={e => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })} className="w-full ios-input p-3 rounded-xl" placeholder="9.99" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-white/50 uppercase mb-2 block">Description</label>
                                        <textarea rows={3} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full ios-input p-3 rounded-xl resize-none" placeholder="Delicious flame-grilled burger..." />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-white/50 uppercase mb-2 block">Image URL</label>
                                        <input value={formData.image} onChange={e => setFormData({ ...formData, image: e.target.value })} className="w-full ios-input p-3 rounded-xl" placeholder="https://example.com/image.jpg" />
                                    </div>
                                </div>

                                {/* Ingredients */}
                                <div className="ios-card p-4 rounded-2xl space-y-3">
                                    <h4 className="font-bold text-white flex items-center gap-2"><UtensilsCrossed size={16} /> Ingredients</h4>
                                    <div className="flex gap-2">
                                        <input value={newIngredient} onChange={e => setNewIngredient(e.target.value)} onKeyPress={e => e.key === 'Enter' && addIngredient()} className="flex-1 ios-input p-2 rounded-xl text-sm" placeholder="Add ingredient..." />
                                        <button onClick={addIngredient} className="px-4 py-2 bg-bk-orange text-black rounded-xl font-bold text-sm hover:bg-bk-red hover:text-white transition-colors"><Plus size={16} /></button>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {formData.ingredients.map((ing, i) => (
                                            <span key={i} className="px-3 py-1 bg-white/10 rounded-full text-xs font-bold flex items-center gap-2">
                                                {ing}
                                                <button onClick={() => removeIngredient(i)} className="hover:text-red-500"><X size={12} /></button>
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                {/* Allergens */}
                                <div className="ios-card p-4 rounded-2xl space-y-3">
                                    <h4 className="font-bold text-white flex items-center gap-2"><AlertCircle size={16} /> Allergens</h4>
                                    <div className="flex gap-2">
                                        <input value={newAllergen} onChange={e => setNewAllergen(e.target.value)} onKeyPress={e => e.key === 'Enter' && addAllergen()} className="flex-1 ios-input p-2 rounded-xl text-sm" placeholder="Add allergen..." />
                                        <button onClick={addAllergen} className="px-4 py-2 bg-red-600 text-white rounded-xl font-bold text-sm hover:bg-red-500 transition-colors"><Plus size={16} /></button>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {formData.allergens.map((all, i) => (
                                            <span key={i} className="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-xs font-bold flex items-center gap-2">
                                                {all}
                                                <button onClick={() => removeAllergen(i)} className="hover:text-red-300"><X size={12} /></button>
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                {/* Nutritional Info */}
                                <div className="ios-card p-4 rounded-2xl space-y-4">
                                    <h4 className="font-bold text-white flex items-center gap-2"><Activity size={16} /> Nutritional Info</h4>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div>
                                            <label className="text-xs font-bold text-white/50 uppercase mb-2 block">Calories</label>
                                            <input type="number" value={formData.calories} onChange={e => setFormData({ ...formData, calories: parseInt(e.target.value) || 0 })} className="w-full ios-input p-2 rounded-xl text-sm" placeholder="650" />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-white/50 uppercase mb-2 block">Prep Time (min)</label>
                                            <input type="number" value={formData.prepTime} onChange={e => setFormData({ ...formData, prepTime: parseInt(e.target.value) || 0 })} className="w-full ios-input p-2 rounded-xl text-sm" placeholder="5" />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-white/50 uppercase mb-2 block">Serving Size</label>
                                            <input value={formData.servingSize} onChange={e => setFormData({ ...formData, servingSize: e.target.value })} className="w-full ios-input p-2 rounded-xl text-sm" placeholder="1 burger" />
                                        </div>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex gap-4 pt-2">
                                    <button onClick={() => setMode('choice')} className="flex-1 p-4 rounded-xl font-bold bg-white/10 hover:bg-white/20 transition-colors">Cancel</button>
                                    <button onClick={handleSave} className="flex-1 p-4 rounded-xl font-black bg-bk-orange text-black hover:bg-bk-red hover:text-white transition-all shadow-lg">
                                        <span className="flex items-center justify-center gap-2"><Check size={18} /> Save Product</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

const ManagerSection: React.FC<{ products: Product[], orders: Order[], stats: any, actions: any, onAddProduct: () => void }> = ({ products, orders, stats, actions, onAddProduct }) => {
    const [view, setView] = useState<'overview' | 'orders' | 'menu' | 'staff' | 'problems' | 'sla'>('overview');
    const problemOrders = orders.filter(o => o.status === 'Cancelled');

    return (
        <div className="pb-32">
            <h1 className="text-3xl font-black text-white mb-2">Manager<span className="text-bk-orange">Hub</span></h1>
            <p className="text-white/40 text-sm mb-6">Control center for operations</p>
            <div className="flex gap-2 overflow-x-auto pb-4 mb-6 hide-scrollbar">
                {[{ id: 'overview', label: 'Overview', icon: Home }, { id: 'orders', label: 'Orders', icon: ShoppingBag }, { id: 'menu', label: 'Menu', icon: UtensilsCrossed }, { id: 'staff', label: 'Staff', icon: Users }, { id: 'problems', label: 'Issues', icon: AlertCircle }, { id: 'sla', label: 'SLA', icon: Clock }].map(tab => (
                    <button key={tab.id} onClick={() => setView(tab.id as any)} className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap ${view === tab.id ? 'bg-bk-red text-white' : 'bg-white/10 text-white/60'}`}>
                        {tab.label}
                    </button>
                ))}
            </div>
            {view === 'overview' && (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="ios-card rounded-2xl p-4"><div className="text-bk-orange text-sm font-bold mb-1">Pending</div><div className="text-3xl font-black text-white">{stats.pendingOrders}</div></div>
                        <div className="ios-card rounded-2xl p-4"><div className="text-red-400 text-sm font-bold mb-1">Problems</div><div className="text-3xl font-black text-white">{stats.problemOrders}</div></div>
                    </div>
                    <button onClick={onAddProduct} className="w-full ios-card rounded-2xl p-6 flex items-center justify-between"><div className="flex items-center gap-4"><div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center"><Sparkles className="text-white" /></div><div className="text-left"><h3 className="font-bold text-white">AI Product Creator</h3><p className="text-white/50 text-xs">Add new menu items</p></div></div><ArrowRight className="text-white/40" /></button>
                </div>
            )}
            {view === 'orders' && (
                <div className="space-y-3">
                    {orders.slice(0, 10).map(order => (
                        <div key={order.id} className="ios-card rounded-2xl p-4 flex justify-between items-center">
                            <div><div className="font-bold text-white">#{order.ticketNumber}</div><div className="text-white/40 text-xs">${order.totalAmount}</div></div>
                            <div className={`px-3 py-1 rounded-full text-xs font-bold ${order.status === 'Completed' ? 'bg-green-500/20 text-green-500' : 'bg-bk-orange/20 text-bk-orange'}`}>{order.status}</div>
                        </div>
                    ))}
                </div>
            )}
            {view === 'menu' && (
                <div className="space-y-4">
                    <button onClick={onAddProduct} className="w-full bg-bk-red text-white p-4 rounded-2xl font-bold flex items-center justify-center gap-2"><Plus size={20} /> Add Product</button>
                    <div className="grid grid-cols-2 gap-4">
                        {products.map(p => (
                            <div key={p.id} className="ios-card rounded-2xl p-3">
                                <div className="h-24 bg-black/20 rounded-xl mb-2 overflow-hidden"><img src={p.image || "https://via.placeholder.com/150"} className="w-full h-full object-cover" /></div>
                                <h3 className="font-bold text-white text-sm truncate">{p.name}</h3>
                                <div className="flex justify-between items-center mt-2">
                                    <span className="text-bk-orange font-bold text-sm">${p.price}</span>
                                    <button onClick={() => actions.toggleAvailability(p.id, p.isAvailable)} className={`px-2 py-1 rounded text-xs font-bold ${p.isAvailable ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>{p.isAvailable ? 'On' : 'Off'}</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            {view === 'staff' && <div className="ios-card rounded-2xl p-8 text-center"><Users className="mx-auto mb-4 text-white/20" size={48} /><h3 className="font-bold text-white mb-2">Staff Management</h3><p className="text-white/50 text-sm">Coming soon</p></div>}
            {view === 'problems' && (
                <div className="space-y-3">
                    {problemOrders.length > 0 ? problemOrders.map(order => (
                        <div key={order.id} className="ios-card rounded-2xl p-4 border-l-4 border-red-500">
                            <div className="flex justify-between"><div className="font-bold text-white">#{order.ticketNumber}</div><div className="text-red-500 text-xs font-bold">CANCELLED</div></div>
                            <div className="text-white/40 text-xs mt-1">${order.totalAmount}</div>
                        </div>
                    )) : <div className="text-center text-white/30 py-10">No problem orders</div>}
                </div>
            )}
            {view === 'sla' && (
                <div className="space-y-4">
                    <div className="ios-card rounded-2xl p-6"><div className="text-white/50 text-sm mb-2">Average Wait Time</div><div className="text-4xl font-black text-white">4:20</div></div>
                    <div className="ios-card rounded-2xl p-6"><div className="text-white/50 text-sm mb-2">SLA Compliance</div><div className="text-4xl font-black text-green-500">94%</div></div>
                </div>
            )}
        </div>
    );
};

const AdminSection: React.FC = () => {
    const [view, setView] = useState<'overview' | 'roles' | 'locations' | 'settings' | 'security'>('overview');
    return (
        <div className="pb-32">
            <h1 className="text-3xl font-black text-white mb-2">Admin<span className="text-bk-orange">Panel</span></h1>
            <p className="text-white/40 text-sm mb-6">System administration</p>
            <div className="flex gap-2 overflow-x-auto pb-4 mb-6 hide-scrollbar">
                {[{ id: 'overview', label: 'Overview' }, { id: 'roles', label: 'Roles' }, { id: 'locations', label: 'Locations' }, { id: 'settings', label: 'Settings' }, { id: 'security', label: 'Security' }].map(tab => (
                    <button key={tab.id} onClick={() => setView(tab.id as any)} className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap ${view === tab.id ? 'bg-bk-red text-white' : 'bg-white/10 text-white/60'}`}>{tab.label}</button>
                ))}
            </div>
            {view === 'overview' && (
                <div className="grid grid-cols-2 gap-4">
                    <div className="ios-card rounded-2xl p-6 flex flex-col items-center"><Shield className="text-bk-orange mb-2" size={32} /><div className="font-bold text-white">Roles</div></div>
                    <div className="ios-card rounded-2xl p-6 flex flex-col items-center"><Building className="text-blue-400 mb-2" size={32} /><div className="font-bold text-white">Locations</div></div>
                    <div className="ios-card rounded-2xl p-6 flex flex-col items-center"><Settings className="text-green-400 mb-2" size={32} /><div className="font-bold text-white">Settings</div></div>
                    <div className="ios-card rounded-2xl p-6 flex flex-col items-center"><Lock className="text-red-400 mb-2" size={32} /><div className="font-bold text-white">Security</div></div>
                </div>
            )}
            {view !== 'overview' && <div className="ios-card rounded-2xl p-8 text-center"><Activity className="mx-auto mb-4 text-white/20" size={48} /><h3 className="font-bold text-white mb-2">{view.charAt(0).toUpperCase() + view.slice(1)}</h3><p className="text-white/50 text-sm">Coming soon</p></div>}
        </div>
    );
};

const AccountantSection: React.FC<{ stats: any, orders: Order[] }> = ({ stats, orders }) => {
    const [view, setView] = useState<'overview' | 'reports' | 'payments' | 'export' | 'taxes'>('overview');
    return (
        <div className="pb-32">
            <h1 className="text-3xl font-black text-white mb-2">Finance<span className="text-bk-orange">Hub</span></h1>
            <p className="text-white/40 text-sm mb-6">Financial management</p>
            <div className="flex gap-2 overflow-x-auto pb-4 mb-6 hide-scrollbar">
                {[{ id: 'overview', label: 'Overview' }, { id: 'reports', label: 'Reports' }, { id: 'payments', label: 'Payments' }, { id: 'export', label: 'Export' }, { id: 'taxes', label: 'Taxes' }].map(tab => (
                    <button key={tab.id} onClick={() => setView(tab.id as any)} className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap ${view === tab.id ? 'bg-bk-red text-white' : 'bg-white/10 text-white/60'}`}>{tab.label}</button>
                ))}
            </div>
            {view === 'overview' && (
                <div className="space-y-4">
                    <div className="ios-card rounded-2xl p-6"><div className="flex justify-between items-start mb-4"><div className="text-white/50 text-sm">Total Revenue</div><TrendingUp className="text-green-500" size={20} /></div><div className="text-4xl font-black text-white">${stats.totalRevenue.toFixed(2)}</div></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="ios-card rounded-2xl p-4"><div className="text-white/50 text-xs mb-1">Completed</div><div className="text-2xl font-black text-white">{stats.completedOrders}</div></div>
                        <div className="ios-card rounded-2xl p-4"><div className="text-white/50 text-xs mb-1">Avg Order</div><div className="text-2xl font-black text-white">${stats.avgOrderValue.toFixed(2)}</div></div>
                    </div>
                </div>
            )}
            {view === 'reports' && (
                <div className="space-y-3">
                    {[{ label: 'Daily Report', icon: Calendar }, { label: 'Weekly Report', icon: BarChart3 }, { label: 'Monthly Report', icon: FileText }].map(report => (
                        <button key={report.label} className="w-full ios-card rounded-2xl p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3"><report.icon className="text-bk-orange" size={20} /><span className="font-bold text-white">{report.label}</span></div>
                            <ArrowRight className="text-white/40" size={20} />
                        </button>
                    ))}
                </div>
            )}
            {view === 'payments' && (
                <div className="space-y-3">
                    {orders.filter(o => o.status === 'Completed').slice(0, 10).map(order => (
                        <div key={order.id} className="ios-card rounded-2xl p-4 flex justify-between items-center">
                            <div><div className="font-bold text-white">#{order.ticketNumber}</div><div className="text-white/40 text-xs">{new Date().toLocaleDateString()}</div></div>
                            <div className="text-green-500 font-bold">${order.totalAmount.toFixed(2)}</div>
                        </div>
                    ))}
                </div>
            )}
            {view === 'export' && (
                <div className="space-y-3">
                    <button className="w-full ios-card rounded-2xl p-6 flex items-center justify-between"><div className="flex items-center gap-3"><Download className="text-green-500" size={24} /><div className="text-left"><div className="font-bold text-white">Export to Excel</div><p className="text-white/50 text-xs">Download financial data</p></div></div><ArrowRight className="text-white/40" /></button>
                    <button className="w-full ios-card rounded-2xl p-6 flex items-center justify-between"><div className="flex items-center gap-3"><FileText className="text-blue-500" size={24} /><div className="text-left"><div className="font-bold text-white">Export to 1C</div><p className="text-white/50 text-xs">Accounting integration</p></div></div><ArrowRight className="text-white/40" /></button>
                </div>
            )}
            {view === 'taxes' && <div className="ios-card rounded-2xl p-8 text-center"><Receipt className="mx-auto mb-4 text-white/20" size={48} /><h3 className="font-bold text-white mb-2">Tax Management</h3><p className="text-white/50 text-sm">Coming soon</p></div>}
        </div>
    );
};

const GlassDock: React.FC<{ activeTab: string, setActiveTab: (t: any) => void }> = ({ activeTab, setActiveTab }) => (
    <div className="fixed bottom-6 left-0 right-0 flex justify-center z-50">
        <div className="ios-glass px-2 py-2 rounded-[2rem] flex items-center gap-1 shadow-2xl">
            {[{ id: 'home', icon: Home }, { id: 'manager', icon: Briefcase }, { id: 'admin', icon: Shield }, { id: 'finance', icon: Wallet }, { id: 'settings', icon: Settings }].map((tab) => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`relative w-12 h-12 rounded-full flex items-center justify-center transition-all ${activeTab === tab.id ? 'bg-bk-red text-white' : 'text-white/50 hover:bg-white/10'}`}>
                    {activeTab === tab.id && <motion.div layoutId="dock-bg" className="absolute inset-0 bg-gradient-to-tr from-bk-red to-orange-600 rounded-full -z-10" />}
                    <tab.icon size={20} />
                </button>
            ))}
        </div>
    </div>
);

const MobileAdminDashboard: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'home' | 'manager' | 'admin' | 'finance' | 'settings'>('home');
    const [isAIFormOpen, setIsAIFormOpen] = useState(false);
    const { orders, products, stats, productActions, loading } = useAdminDashboard();

    if (loading) return <div className="min-h-screen bg-bk-dark text-white flex items-center justify-center"><DashboardStyles /><Loader2 className="animate-spin text-bk-orange" size={48} /></div>;

    const renderContent = () => {
        switch (activeTab) {
            case 'manager': return <ManagerSection products={products} orders={orders} stats={stats} actions={productActions} onAddProduct={() => setIsAIFormOpen(true)} />;
            case 'admin': return <AdminSection />;
            case 'finance': return <AccountantSection stats={stats} orders={orders} />;
            case 'settings': return <div className="pb-32"><h1 className="text-3xl font-black text-white mb-6">Settings</h1><button onClick={() => signOut(auth)} className="w-full ios-card p-4 rounded-2xl flex items-center justify-between text-red-500 font-bold"><span>Sign Out</span><ArrowRight size={20} /></button></div>;
            default: return (
                <div className="pb-32">
                    <div className="flex justify-between items-center mb-6"><div><h1 className="text-3xl font-black text-white">Dashboard</h1><p className="text-white/40 text-sm">Welcome back, Admin</p></div></div>
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="ios-card rounded-2xl p-4"><div className="text-bk-orange text-sm font-bold mb-1">Revenue</div><div className="text-3xl font-black text-white">${stats.totalRevenue.toFixed(0)}</div></div>
                        <div className="ios-card rounded-2xl p-4"><div className="text-green-400 text-sm font-bold mb-1">Orders</div><div className="text-3xl font-black text-white">{stats.completedOrders}</div></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <button onClick={() => setActiveTab('manager')} className="ios-card rounded-2xl p-6 flex flex-col items-center"><Briefcase className="text-bk-orange mb-2" size={32} /><span className="font-bold text-white text-sm">Manager</span></button>
                        <button onClick={() => setActiveTab('admin')} className="ios-card rounded-2xl p-6 flex flex-col items-center"><Shield className="text-blue-400 mb-2" size={32} /><span className="font-bold text-white text-sm">Admin</span></button>
                        <button onClick={() => setActiveTab('finance')} className="ios-card rounded-2xl p-6 flex flex-col items-center"><Wallet className="text-green-400 mb-2" size={32} /><span className="font-bold text-white text-sm">Finance</span></button>
                        <button onClick={() => setIsAIFormOpen(true)} className="ios-card rounded-2xl p-6 flex flex-col items-center"><Sparkles className="text-purple-400 mb-2" size={32} /><span className="font-bold text-white text-sm">AI Create</span></button>
                    </div>
                </div>
            );
        }
    };

    return (
        <div className="min-h-screen bg-bk-dark text-white relative overflow-hidden">
            <DashboardStyles />
            <div className="fixed inset-0 z-0 pointer-events-none"><div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-bk-red/20 rounded-full blur-[120px]"></div><div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-bk-orange/10 rounded-full blur-[120px]"></div></div>
            <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 max-w-lg mx-auto px-6 pt-12 h-screen overflow-y-auto hide-scrollbar">{renderContent()}</motion.div>
            <GlassDock activeTab={activeTab} setActiveTab={setActiveTab} />
            <AIProductForm isOpen={isAIFormOpen} onClose={() => setIsAIFormOpen(false)} onSave={productActions.addProduct} />
        </div>
    );
};

export default MobileAdminDashboard;
