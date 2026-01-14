import React, { useState, useEffect, createContext, useContext } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, Heart, ShoppingBag, User as UserIcon, X, Plus, Minus, Search, ArrowRight, Flame, Utensils, LogOut, Camera, ChevronRight, History } from 'lucide-react';
import { collection, onSnapshot, addDoc, serverTimestamp, query, where, orderBy, updateDoc, doc } from 'firebase/firestore';
import { db } from '../core/firebase';
import { useAuth } from '../core/context/AuthContext';
import type { Product, OrderItem, Modifier, Order } from '../core/types';

// ============================================================================
// 🎨 DESIGN SYSTEM & ASSETS (God-tier Styling)
// ============================================================================
const GlobalStyles = () => (
    <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Fredoka:wght@300;400;500;600;700&display=swap');
    body { 
        font-family: 'Fredoka', sans-serif; 
        background-color: #F5EBDC; /* BK Cream Background */
        overscroll-behavior-y: none;
    }
    .hide-scrollbar::-webkit-scrollbar { display: none; }
    .glass-panel {
        background: rgba(255, 255, 255, 0.65);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border: 1px solid rgba(255, 255, 255, 0.8);
        box-shadow: 0 8px 32px 0 rgba(80, 35, 20, 0.08);
    }
    .glass-nav {
        background: rgba(80, 35, 20, 0.85); /* BK Brown Glass */
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        box-shadow: 0 10px 40px -10px rgba(80, 35, 20, 0.5);
    }
    .text-bk-brown { color: #502314; }
    .bg-bk-red { background-color: #D62300; }
    .text-bk-red { color: #D62300; }
  `}</style>
);

// ============================================================================
// 🛠️ HELPERS
// ============================================================================
const IMGBB_API_KEY = "5c0267c514dca7035a2da08807954263";

const uploadImageToImgBB = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('image', file);
    const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
        method: 'POST',
        body: formData,
    });
    const data = await response.json();
    if (data.success) {
        return data.data.url;
    }
    throw new Error('Image upload failed');
};

// ============================================================================
// 🧠 STATE MANAGEMENT (Optimized)
// ============================================================================
interface CartContextType {
    cart: OrderItem[];
    addToCart: (product: Product, quantity: number, modifiers: Modifier[]) => void;
    removeFromCart: (productId: string) => void;
    clearCart: () => void;
    totalItems: number;
    totalPrice: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const useCart = () => {
    const context = useContext(CartContext);
    if (!context) throw new Error('useCart must be used within CartProvider');
    return context;
};

// ============================================================================
// 🧩 UI COMPONENTS (Atomic Level)
// ============================================================================
const BouncyButton: React.FC<{ onClick?: () => void; children: React.ReactNode; className?: string; disabled?: boolean }> = ({ onClick, children, className, disabled }) => (
    <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.9 }}
        onClick={onClick}
        disabled={disabled}
        className={`${className} disabled:opacity-50 disabled:cursor-not-allowed`}
    >
        {children}
    </motion.button>
);

// ============================================================================
// 🍔 PRODUCT CARD (Glass & Parallax)
// ============================================================================
const ProductCard: React.FC<{ product: Product; onClick: () => void }> = ({ product, onClick }) => (
    <motion.div
        layoutId={`product-${product.id}`}
        onClick={onClick}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileTap={{ scale: 0.95 }}
        className="glass-panel p-3 rounded-[2rem] relative overflow-hidden group cursor-pointer"
    >
        <div className="absolute top-3 right-3 z-10 bg-bk-red backdrop-blur px-3 py-1.5 rounded-full shadow-lg shadow-red-500/20">
            <span className="text-xs font-black text-white">{product.price.toLocaleString()} ₸</span>
        </div>
        <div className="absolute top-3 left-3 z-10 bg-white/80 backdrop-blur px-2 py-1 rounded-full">
            <span className="text-[10px] font-bold text-bk-brown uppercase">{product.category}</span>
        </div>
        <div className="w-full aspect-square rounded-[1.5rem] mb-3 overflow-hidden bg-white">
            <motion.img
                src={product.image || 'https://via.placeholder.com/300'}
                alt={product.name}
                className="w-full h-full object-cover"
                whileHover={{ scale: 1.1 }}
                transition={{ duration: 0.4 }}
            />
        </div>
        <div className="px-1 pb-1">
            <h3 className="font-bold text-bk-brown text-base leading-tight mb-1.5">{product.name}</h3>
            <p className="text-bk-brown/50 text-xs line-clamp-2 leading-relaxed mb-2">{product.description}</p>
        </div>
        <div className="absolute bottom-3 right-3 w-10 h-10 bg-bk-red rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity shadow-lg shadow-red-500/30">
            <Plus size={18} strokeWidth={3} />
        </div>
    </motion.div>
);

// ============================================================================
// 🧢 PRODUCT DETAILS (Bottom Sheet)
// ============================================================================
const ProductModal: React.FC<{ product: Product | null; onClose: () => void }> = ({ product, onClose }) => {
    const { addToCart } = useCart();
    const [quantity, setQuantity] = useState(1);
    const [selectedModifiers, setSelectedModifiers] = useState<Modifier[]>([]);

    useEffect(() => {
        if (product) {
            setQuantity(1);
            setSelectedModifiers([]);
        }
    }, [product]);

    if (!product) return null;

    const toggleModifier = (mod: Modifier) => {
        setSelectedModifiers(prev =>
            prev.find(m => m.id === mod.id) ? prev.filter(m => m.id !== mod.id) : [...prev, mod]
        );
    };

    const total = (product.price + selectedModifiers.reduce((a, m) => a + m.price, 0)) * quantity;

    return (
        <AnimatePresence>
            {product && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-[#502314]/40 backdrop-blur-sm z-[60]"
                    />
                    <motion.div
                        layoutId={`product-${product.id}`}
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                        className="fixed bottom-0 left-0 right-0 bg-[#F5EBDC] rounded-t-[2.5rem] z-[70] h-[90vh] overflow-hidden flex flex-col shadow-2xl"
                    >
                        <div className="relative h-[35vh] w-full">
                            <img src={product.image || 'https://via.placeholder.com/400'} alt={product.name} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#F5EBDC] via-[#F5EBDC]/20 to-transparent" />
                            <button onClick={onClose} className="absolute top-6 right-6 w-12 h-12 bg-white/20 backdrop-blur-md border border-white/30 rounded-full flex items-center justify-center text-bk-brown hover:bg-white/40 transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="flex-1 px-6 -mt-6 relative overflow-y-auto pb-32 hide-scrollbar">
                            <div className="glass-panel p-6 rounded-[2rem] mb-6">
                                <div className="flex justify-between items-start mb-3">
                                    <h2 className="text-3xl font-black text-bk-brown leading-tight tracking-tight flex-1">{product.name}</h2>
                                    <div className="bg-bk-red px-4 py-2 rounded-full ml-4">
                                        <span className="text-white font-black text-lg">{product.price.toLocaleString()} ₸</span>
                                    </div>
                                </div>
                                <p className="text-bk-brown/70 text-base font-medium leading-relaxed">{product.description}</p>
                            </div>

                            {product.availableModifiers && product.availableModifiers.length > 0 && (
                                <div className="glass-panel p-5 rounded-[2rem] mb-6">
                                    <h3 className="font-bold text-bk-brown text-lg mb-4 flex items-center gap-2">
                                        <Flame size={18} className="text-bk-red fill-bk-red" /> Customize
                                    </h3>
                                    <div className="space-y-3">
                                        {product.availableModifiers.map(mod => {
                                            const isSelected = selectedModifiers.find(m => m.id === mod.id);
                                            return (
                                                <div
                                                    key={mod.id}
                                                    onClick={() => toggleModifier(mod)}
                                                    className={`p-4 rounded-2xl flex justify-between items-center cursor-pointer border-2 ${isSelected ? 'bg-white border-bk-red shadow-lg' : 'bg-white/50 border-transparent'}`}
                                                >
                                                    <span className="font-bold text-bk-brown">{mod.name}</span>
                                                    <span className="text-sm font-bold text-bk-red">+{mod.price.toLocaleString()} ₸</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="absolute bottom-0 left-0 right-0 p-6 glass-panel border-t-0 rounded-t-[2rem] shadow-2xl">
                            <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3 bg-white/60 p-2 rounded-full border border-bk-brown/10">
                                    <motion.button whileTap={{ scale: 0.9 }} onClick={() => setQuantity(q => Math.max(1, q - 1))} className="w-10 h-10 rounded-full bg-white flex items-center justify-center"><Minus size={18} /></motion.button>
                                    <span className="text-xl font-black text-bk-brown w-8 text-center">{quantity}</span>
                                    <motion.button whileTap={{ scale: 0.9 }} onClick={() => setQuantity(q => q + 1)} className="w-10 h-10 rounded-full bg-bk-brown text-white flex items-center justify-center"><Plus size={18} /></motion.button>
                                </div>
                                <BouncyButton
                                    onClick={() => { addToCart(product, quantity, selectedModifiers); onClose(); }}
                                    className="flex-1 bg-bk-red text-white h-14 rounded-full font-bold flex justify-between items-center px-6"
                                >
                                    <span>Add to Cart</span>
                                    <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-black">{total.toLocaleString()} ₸</span>
                                </BouncyButton>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

// ============================================================================
// 📱 NAVIGATION (Floating Glass Dock)
// ============================================================================
const BottomNav: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { totalItems } = useCart();

    const navItems = [
        { path: '/customer', icon: Home, label: 'Home' },
        { path: '/customer/menu', icon: Utensils, label: 'Menu' },
        { path: '/customer/favorites', icon: Heart, label: 'Likes' },
        { path: '/customer/profile', icon: UserIcon, label: 'Profile' },
        { path: '/customer/cart', icon: ShoppingBag, label: 'Cart', badge: totalItems }
    ];

    return (
        <div className="fixed bottom-6 left-0 right-0 px-4 z-50 flex justify-center pointer-events-none">
            <div className="glass-nav rounded-[2.5rem] px-4 py-4 flex items-center gap-6 pointer-events-auto">
                {navItems.map((item) => {
                    const isActive = location.pathname === item.path || (item.path !== '/customer' && location.pathname.startsWith(item.path));
                    return (
                        <motion.button
                            key={item.path}
                            onClick={() => navigate(item.path)}
                            className="relative flex flex-col items-center justify-center min-w-[48px]"
                            whileTap={{ scale: 0.8 }}
                        >
                            <div className={`p-2 rounded-full transition-all duration-300 ${isActive ? 'bg-[#F5EBDC] text-[#D62300]' : 'text-[#F5EBDC]/60'}`}>
                                <item.icon size={22} strokeWidth={2.5} />
                            </div>
                            {item.badge ? (
                                <motion.span
                                    initial={{ scale: 0 }} animate={{ scale: 1 }}
                                    className="absolute -top-1 -right-1 bg-[#D62300] text-[#F5EBDC] text-[10px] w-5 h-5 flex items-center justify-center rounded-full font-bold border-2 border-[#502314]"
                                >
                                    {item.badge}
                                </motion.span>
                            ) : null}
                            {isActive && (
                                <motion.div
                                    layoutId="active-dot"
                                    className="absolute -bottom-1.5 w-1 h-1 bg-[#F5EBDC] rounded-full"
                                />
                            )}
                        </motion.button>
                    );
                })}
            </div>
        </div>
    );
};


// ============================================================================
// 🏠 HOME PAGE (Immersive)
// ============================================================================
const HomePage: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [userData, setUserData] = useState<any>(null);

    useEffect(() => {
        if (user) {
            const unsub = onSnapshot(doc(db, 'users', user.uid), (snap) => {
                setUserData(snap.data());
            });
            return () => unsub();
        }
    }, [user]);

    return (
        <div className="min-h-screen pt-14 pb-32 px-6">
            <header className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-5xl font-black text-bk-brown tracking-tighter uppercase italic">Muslim<span className="text-bk-red">Food</span></h1>
                    <p className="text-bk-brown/60 font-medium">Salam, {userData?.displayName?.split(' ')[0] || 'Gourmet'}! Hungry?</p>
                </div>
                <motion.div
                    whileTap={{ scale: 0.9 }}
                    onClick={() => navigate('/customer/profile')}
                    className="w-14 h-14 bg-white border-4 border-white rounded-full flex items-center justify-center shadow-xl overflow-hidden cursor-pointer"
                >
                    <img src={userData?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email}`} alt="User" className="w-full h-full object-cover" />
                </motion.div>
            </header>

            {/* Hero Banner */}
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="relative overflow-hidden bg-[#502314] rounded-[2.5rem] p-8 text-[#F5EBDC] mb-10 shadow-2xl shadow-brown-900/20"
            >
                <div className="absolute top-0 right-0 w-64 h-64 bg-bk-red rounded-full filter blur-[80px] opacity-40 -translate-y-1/2 translate-x-1/2" />
                <div className="relative z-10">
                    <span className="inline-block px-4 py-1.5 bg-bk-red text-white text-xs font-bold rounded-full mb-4 shadow-lg shadow-red-600/40">HALAL PRIDE</span>
                    <h2 className="text-4xl font-black mb-2 leading-tight">MuslimFood<br />Treats</h2>
                    <p className="text-white/70 mb-6 max-w-[200px]">Get 50% off on all signature burgers today.</p>
                    <BouncyButton onClick={() => navigate('/customer/menu')} className="bg-[#F5EBDC] text-bk-brown px-8 py-4 rounded-2xl font-black flex items-center gap-2">
                        Order Now <ArrowRight size={18} />
                    </BouncyButton>
                </div>
                <img src="https://cdn-icons-png.flaticon.com/512/3075/3075977.png" className="absolute -bottom-4 -right-8 w-48 h-48 object-contain drop-shadow-2xl rotate-12" alt="Burger" />
            </motion.div>

            <h3 className="text-2xl font-black text-bk-brown mb-6">Explore</h3>
            <div className="grid grid-cols-2 gap-4">
                <BouncyButton onClick={() => navigate('/customer/menu')} className="glass-panel p-6 rounded-[2rem] flex flex-col items-center gap-3 text-center">
                    <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center text-orange-500 mb-2">
                        <Utensils size={32} />
                    </div>
                    <span className="font-bold text-bk-brown text-lg">Full Menu</span>
                </BouncyButton>
                <BouncyButton onClick={() => navigate('/customer/cart')} className="glass-panel p-6 rounded-[2rem] flex flex-col items-center gap-3 text-center">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center text-red-500 mb-2">
                        <ShoppingBag size={32} />
                    </div>
                    <span className="font-bold text-bk-brown text-lg">My Cart</span>
                </BouncyButton>
            </div>
        </div>
    );
};

// ============================================================================
// 🍟 MENU PAGE (Filter & Grid)
// ============================================================================
const MenuPage: React.FC = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('All');
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, 'products'), (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
            setProducts(data);
        });
        return () => unsubscribe();
    }, []);

    const categories = ['All', ...new Set(products.map(p => p.category))];
    const filtered = products.filter(p => {
        const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
        const matchCategory = category === 'All' || p.category === category;
        return matchSearch && matchCategory && p.isAvailable;
    });

    return (
        <div className="min-h-screen pt-12 pb-32 px-6">
            <h1 className="text-4xl font-black text-bk-brown mb-6">Our Menu</h1>
            <div className="relative mb-8">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-bk-brown/40">
                    <Search size={22} strokeWidth={3} />
                </div>
                <input
                    type="text"
                    placeholder="Search..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full h-14 pl-14 pr-4 bg-white/60 rounded-2xl text-bk-brown font-bold outline-none"
                />
            </div>

            <div className="flex gap-3 overflow-x-auto pb-6 -mx-6 px-6 no-scrollbar">
                {categories.map(c => (
                    <button
                        key={c}
                        onClick={() => setCategory(c)}
                        className={`px-6 py-3 rounded-full text-sm font-bold whitespace-nowrap ${category === c ? 'bg-bk-red text-white' : 'bg-white text-bk-brown'}`}
                    >
                        {c}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-2 gap-4">
                {filtered.map(p => (
                    <ProductCard key={p.id} product={p} onClick={() => setSelectedProduct(p)} />
                ))}
            </div>
            <ProductModal product={selectedProduct} onClose={() => setSelectedProduct(null)} />
        </div>
    );
};

// ============================================================================
// 🛒 CART PAGE (Clean & Functional)
// ============================================================================
const CartPage: React.FC = () => {
    const { cart, removeFromCart, totalPrice, clearCart } = useCart();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    const handleCheckout = async () => {
        if (cart.length === 0 || !user) return;
        setLoading(true);
        try {
            await addDoc(collection(db, 'orders'), {
                ticketNumber: Math.floor(1000 + Math.random() * 9000).toString(),
                items: cart,
                totalAmount: totalPrice,
                customerEmail: user.email,
                status: 'Pending',
                createdAt: serverTimestamp(),
            });
            clearCart();
            navigate('/customer');
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    if (cart.length === 0) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="w-32 h-32 bg-white/50 rounded-full flex items-center justify-center mb-8 border-4 border-white shadow-inner"
                >
                    <ShoppingBag size={64} className="text-bk-brown/10" />
                </motion.div>
                <h2 className="text-3xl font-black text-bk-brown mb-4 tracking-tight">Your Tray is Empty</h2>
                <p className="text-bk-brown/40 font-medium mb-10 max-w-[240px]">Seems like you haven't added any cravings yet.</p>
                <BouncyButton onClick={() => navigate('/customer/menu')} className="bg-bk-red text-white px-10 py-5 rounded-[2rem] font-bold shadow-2xl shadow-red-500/30">Start Ordering</BouncyButton>
            </div>
        );
    }

    return (
        <div className="min-h-screen pt-14 pb-48 px-6">
            <header className="flex justify-between items-center mb-10">
                <h1 className="text-4xl font-black text-bk-brown tracking-tight italic uppercase">Your Tray</h1>
                <div className="bg-white/50 px-4 py-2 rounded-2xl border border-white">
                    <span className="font-bold text-bk-brown text-sm">{cart.length} items</span>
                </div>
            </header>

            <div className="space-y-6">
                <AnimatePresence mode="popLayout">
                    {cart.map((item, i) => (
                        <motion.div
                            key={`${item.productId}-${i}`}
                            layout
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: 20, opacity: 0 }}
                            className="glass-panel p-4 rounded-[2.5rem] flex items-center gap-5 relative group"
                        >
                            <div className="w-24 h-24 bg-white rounded-[1.8rem] overflow-hidden flex-shrink-0 shadow-inner">
                                <img src={item.image || 'https://via.placeholder.com/200'} alt={item.name} className="w-full h-full object-cover" />
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between items-start mb-1">
                                    <h3 className="font-bold text-bk-brown text-lg leading-tight">{item.name}</h3>
                                    <button
                                        onClick={() => removeFromCart(item.productId)}
                                        className="p-1.5 text-bk-brown/20 hover:text-bk-red transition-colors"
                                    >
                                        <X size={18} strokeWidth={3} />
                                    </button>
                                </div>
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="text-[10px] font-black uppercase tracking-widest text-bk-brown/30 bg-bk-brown/5 px-2 py-0.5 rounded-md">Qty: {item.quantity}</div>
                                    {item.modifiers.length > 0 && (
                                        <div className="text-[10px] font-black uppercase tracking-widest text-bk-orange bg-bk-orange/10 px-2 py-0.5 rounded-md">Custom</div>
                                    )}
                                </div>
                                <div className="flex justify-between items-end">
                                    <div className="font-black text-bk-red text-xl leading-none">{item.price.toLocaleString()} ₸</div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {/* Premium Summary Card */}
            <div className="fixed bottom-28 left-6 right-6 z-40">
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="glass-panel p-8 rounded-[3rem] bg-[#502314]/95 text-[#F5EBDC] shadow-[0_20px_50px_rgba(80,35,20,0.4)] border-none overflow-hidden relative"
                >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-bk-red rounded-full filter blur-[60px] opacity-20 -translate-y-1/2 translate-x-1/2" />

                    <div className="flex justify-between items-center mb-6 relative z-10">
                        <div>
                            <p className="text-[#F5EBDC]/40 text-xs font-black uppercase tracking-widest mb-1">Total Payable</p>
                            <h2 className="text-4xl font-black italic tracking-tighter">{totalPrice.toLocaleString()} <span className="text-xl">₸</span></h2>
                        </div>
                        <div className="text-right">
                            <p className="text-[#F5EBDC]/40 text-[10px] font-bold uppercase mb-1">Fee included</p>
                            <div className="bg-bk-red/20 px-3 py-1 rounded-full text-[10px] font-black text-bk-red border border-bk-red/30">EXPRESS</div>
                        </div>
                    </div>

                    <BouncyButton
                        onClick={handleCheckout}
                        disabled={loading}
                        className="w-full bg-[#F5EBDC] text-[#502314] h-16 rounded-[2rem] font-black text-lg flex items-center justify-center gap-3 shadow-xl overflow-hidden relative group"
                    >
                        {loading ? (
                            <div className="w-6 h-6 border-4 border-[#502314] border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <>
                                <span>Place Order</span>
                                <motion.div
                                    animate={{ x: [0, 5, 0] }}
                                    transition={{ repeat: Infinity, duration: 1.5 }}
                                >
                                    <ArrowRight size={20} />
                                </motion.div>
                            </>
                        )}
                    </BouncyButton>
                </motion.div>
            </div>
        </div>
    );
};

// ============================================================================
// 👤 PROFILE PAGE (Account, Settings, Orders)
// ============================================================================
const ProfilePage: React.FC = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [userData, setUserData] = useState<any>(null);
    const [orders, setOrders] = useState<Order[]>([]);
    const [isEditing, setIsEditing] = useState(false);
    const [newName, setNewName] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (user) {
            const unsubUser = onSnapshot(doc(db, 'users', user.uid), (snap) => {
                const data = snap.data();
                setUserData(data);
                setNewName(data?.displayName || '');
            });
            const q = query(collection(db, 'orders'), where('customerEmail', '==', user.email), orderBy('createdAt', 'desc'));
            const unsubOrders = onSnapshot(q, (snap) => {
                setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() } as Order)));
            });
            return () => { unsubUser(); unsubOrders(); };
        }
    }, [user]);

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;

        setIsSaving(true);
        try {
            const url = await uploadImageToImgBB(file);
            await updateDoc(doc(db, 'users', user.uid), { photoURL: url });
        } catch (e) {
            console.error("Upload error:", e);
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveProfile = async () => {
        if (!user || !newName.trim()) return;
        setIsSaving(true);
        try {
            await updateDoc(doc(db, 'users', user.uid), { displayName: newName.trim() });
            setIsEditing(false);
        } catch (e) { console.error(e); }
        finally { setIsSaving(false); }
    };

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    return (
        <div className="min-h-screen pt-14 pb-32 px-6 overflow-x-hidden">
            <div className="flex justify-between items-center mb-10">
                <h1 className="text-4xl font-black text-bk-brown tracking-tight italic uppercase">Profile</h1>
                <BouncyButton onClick={handleLogout} className="bg-red-50 text-bk-red px-5 py-2.5 rounded-full font-bold flex items-center gap-2 border border-red-100">
                    <LogOut size={16} /> Logout
                </BouncyButton>
            </div>

            {/* Profile Header Card */}
            <div className="glass-panel p-8 rounded-[2.5rem] mb-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-bk-orange/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
                <div className="flex flex-col items-center text-center relative z-10">
                    <div className="relative mb-6">
                        <div className="w-28 h-28 rounded-[2.5rem] bg-white border-4 border-white shadow-2xl overflow-hidden relative">
                            {isSaving && <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-10"><div className="w-6 h-6 border-4 border-bk-red border-t-transparent rounded-full animate-spin" /></div>}
                            <img src={userData?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email}`} alt="Avatar" className="w-full h-full object-cover" />
                        </div>
                        <label className="absolute -bottom-2 -right-2 w-10 h-10 bg-bk-red text-white flex items-center justify-center rounded-2xl shadow-lg border-2 border-white cursor-pointer hover:scale-110 transition-transform">
                            <Camera size={18} />
                            <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} disabled={isSaving} />
                        </label>
                    </div>

                    {isEditing ? (
                        <div className="w-full max-w-[240px]">
                            <input
                                type="text"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                className="w-full h-12 bg-white/50 border-2 border-bk-orange/30 rounded-xl px-4 text-center font-bold text-bk-brown outline-none focus:border-bk-red transition-all"
                                autoFocus
                            />
                            <div className="flex gap-2 mt-3">
                                <button onClick={() => setIsEditing(false)} className="flex-1 py-2 text-xs font-bold text-bk-brown/40">Cancel</button>
                                <button
                                    onClick={handleSaveProfile}
                                    disabled={isSaving}
                                    className="flex-1 py-2 bg-bk-red text-white text-xs font-bold rounded-lg shadow-lg shadow-red-500/20"
                                >
                                    {isSaving ? '...' : 'Save'}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div onClick={() => setIsEditing(true)} className="cursor-pointer group">
                            <h2 className="text-2xl font-black text-bk-brown px-4 py-1 rounded-full group-hover:bg-bk-orange/10 transition-colors">{userData?.displayName || 'User'}</h2>
                            <p className="text-bk-brown/40 text-sm font-medium">{user?.email}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="glass-panel p-6 rounded-[2rem] text-center bg-white/40">
                    <div className="text-3xl font-black text-bk-red mb-1">{orders.length}</div>
                    <div className="text-xs font-bold text-bk-brown/40 uppercase tracking-widest">Orders</div>
                </div>
                <div className="glass-panel p-6 rounded-[2rem] text-center bg-white/40">
                    <div className="text-3xl font-black text-bk-orange mb-1">0</div>
                    <div className="text-xs font-bold text-bk-brown/40 uppercase tracking-widest">Points</div>
                </div>
            </div>

            {/* Order History */}
            <div className="mb-8">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-black text-bk-brown flex items-center gap-2">
                        <History size={20} className="text-bk-red" /> Order History
                    </h3>
                </div>

                {orders.length === 0 ? (
                    <div className="bg-white/30 rounded-[2rem] p-10 text-center border border-dashed border-bk-brown/10">
                        <ShoppingBag size={40} className="mx-auto text-bk-brown/10 mb-4" />
                        <p className="text-bk-brown/30 font-bold">No orders yet</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {orders.map(order => (
                            <div key={order.id} className="glass-panel p-5 rounded-[2rem] flex items-center justify-between group hover:bg-white/80 transition-all">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-bk-cream rounded-2xl flex items-center justify-center text-bk-brown">
                                        <Utensils size={24} />
                                    </div>
                                    <div>
                                        <div className="font-bold text-bk-brown">#{order.ticketNumber}</div>
                                        <div className="text-[10px] text-bk-brown/40 font-bold uppercase">{order.status}</div>
                                    </div>
                                </div>
                                <div className="text-right flex items-center gap-4">
                                    <div className="font-black text-bk-red text-lg">{order.totalAmount.toLocaleString()} ₸</div>
                                    <ChevronRight size={20} className="text-bk-brown/20 group-hover:text-bk-red transition-colors" />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

// ============================================================================
// ❤️ FAVORITES (Placeholder)
// ============================================================================
const FavoritesPage: React.FC = () => (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
        <Heart size={64} className="text-bk-red/20 mb-6" fill="currentColor" />
        <h2 className="text-2xl font-black text-bk-brown">Saved Craving</h2>
        <p className="text-bk-brown/50">Coming soon</p>
    </div>
);

// ============================================================================
// 🚀 APP ENTRY
// ============================================================================
const CustomerApp: React.FC = () => {
    const [cart, setCart] = useState<OrderItem[]>([]);
    const { user, loading } = useAuth();

    if (!loading && !user) return <Navigate to="/login" replace />;

    // Logic kept simple for demo
    const addToCart = (product: Product, quantity: number, modifiers: Modifier[]) => {
        setCart(prev => [...prev, {
            productId: product.id,
            name: product.name,
            price: product.price,
            quantity,
            modifiers,
            image: product.image
        }]);
    };
    const removeFromCart = (id: string) => setCart(p => p.filter(i => i.productId !== id));
    const clearCart = () => setCart([]);
    const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);
    const totalPrice = cart.reduce((acc, item) => acc + (item.price + item.modifiers.reduce((a, m) => a + m.price, 0)) * item.quantity, 0);

    return (
        <CartContext.Provider value={{ cart, addToCart, removeFromCart, clearCart, totalItems, totalPrice }}>
            <GlobalStyles />
            <div className="min-h-screen text-bk-brown overflow-hidden bg-[#F5EBDC]">
                <AnimatePresence mode="wait">
                    <Routes>
                        <Route path="/" element={<HomePage />} />
                        <Route path="/menu" element={<MenuPage />} />
                        <Route path="/cart" element={<CartPage />} />
                        <Route path="/favorites" element={<FavoritesPage />} />
                        <Route path="/profile" element={<ProfilePage />} />
                        <Route path="*" element={<Navigate to="/customer" replace />} />
                    </Routes>
                </AnimatePresence>
                <BottomNav />
            </div>
        </CartContext.Provider>
    );
};

export default CustomerApp;