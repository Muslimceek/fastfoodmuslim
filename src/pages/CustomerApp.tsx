import React, { useState, useEffect, createContext, useContext } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, Heart, ShoppingBag, X, Plus, Minus, Search, ArrowRight, Zap, Flame, Utensils } from 'lucide-react';
import { collection, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../core/firebase';
import type { Product, OrderItem, Modifier } from '../core/types';

// ============================================================================
// 🎨 DESIGN SYSTEM & ASSETS (God-tier Styling)
// ============================================================================
// Имитация шрифта "Flame Sans" через Google Fonts
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

// Кнопка с физикой нажатия "Jelly"
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
        { path: '/customer/cart', icon: ShoppingBag, label: 'Cart', badge: totalItems }
    ];

    return (
        <div className="fixed bottom-6 left-0 right-0 px-4 z-50 flex justify-center pointer-events-none">
            <div className="glass-nav rounded-[2.5rem] px-6 py-4 flex items-center gap-8 pointer-events-auto">
                {navItems.map((item) => {
                    const isActive = location.pathname === item.path || (item.path !== '/customer' && location.pathname.startsWith(item.path));
                    return (
                        <motion.button
                            key={item.path}
                            onClick={() => navigate(item.path)}
                            className="relative flex flex-col items-center justify-center"
                            whileTap={{ scale: 0.8 }}
                        >
                            <div className={`p-2 rounded-full transition-all duration-300 ${isActive ? 'bg-[#F5EBDC] text-[#D62300]' : 'text-[#F5EBDC]/60'}`}>
                                <item.icon size={24} strokeWidth={2.5} />
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
                                    className="absolute -bottom-2 w-1 h-1 bg-[#F5EBDC] rounded-full"
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
        {/* Price Badge */}
        <div className="absolute top-3 right-3 z-10 bg-bk-red backdrop-blur px-3 py-1.5 rounded-full shadow-lg shadow-red-500/20">
            <span className="text-xs font-black text-white">{product.price.toLocaleString()} ₸</span>
        </div>

        {/* Category Badge */}
        <div className="absolute top-3 left-3 z-10 bg-white/80 backdrop-blur px-2 py-1 rounded-full">
            <span className="text-[10px] font-bold text-bk-brown uppercase">{product.category}</span>
        </div>

        {/* Product Image */}
        <div className="w-full aspect-square rounded-[1.5rem] mb-3 overflow-hidden bg-white">
            <motion.img
                src={product.image || 'https://via.placeholder.com/300'}
                alt={product.name}
                className="w-full h-full object-cover"
                whileHover={{ scale: 1.1 }}
                transition={{ duration: 0.4 }}
            />
        </div>

        {/* Product Info */}
        <div className="px-1 pb-1">
            <h3 className="font-bold text-bk-brown text-base leading-tight mb-1.5">{product.name}</h3>
            <p className="text-bk-brown/50 text-xs line-clamp-2 leading-relaxed mb-2">{product.description}</p>

            {/* Quick Info Pills */}
            <div className="flex gap-1.5 flex-wrap">
                {product.calories && (
                    <span className="px-2 py-0.5 bg-white/60 rounded-full text-[10px] font-bold text-bk-brown flex items-center gap-1">
                        <Zap size={10} className="text-bk-red" /> {product.calories} cal
                    </span>
                )}
                {product.prepTime && (
                    <span className="px-2 py-0.5 bg-white/60 rounded-full text-[10px] font-bold text-bk-brown">
                        ⏱️ {product.prepTime}m
                    </span>
                )}
            </div>
        </div>

        {/* Quick Add Button Visual */}
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
                        {/* Header Image */}
                        <div className="relative h-[35vh] w-full">
                            <img src={product.image || 'https://via.placeholder.com/400'} alt={product.name} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#F5EBDC] via-[#F5EBDC]/20 to-transparent" />
                            <button onClick={onClose} className="absolute top-6 right-6 w-12 h-12 bg-white/20 backdrop-blur-md border border-white/30 rounded-full flex items-center justify-center text-bk-brown hover:bg-white/40 transition-colors">
                                <X size={24} />
                            </button>

                            {/* Category Badge */}
                            <div className="absolute top-6 left-6 px-4 py-2 bg-bk-red/90 backdrop-blur-md rounded-full">
                                <span className="text-white font-bold text-sm">{product.category}</span>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 px-6 -mt-6 relative overflow-y-auto pb-32 hide-scrollbar">
                            {/* Title & Price */}
                            <div className="glass-panel p-6 rounded-[2rem] mb-6">
                                <div className="flex justify-between items-start mb-3">
                                    <h2 className="text-3xl font-black text-bk-brown leading-tight tracking-tight flex-1">{product.name}</h2>
                                    <div className="bg-bk-red px-4 py-2 rounded-full ml-4">
                                        <span className="text-white font-black text-lg">{product.price.toLocaleString()} ₸</span>
                                    </div>
                                </div>
                                <p className="text-bk-brown/70 text-base font-medium leading-relaxed">{product.description}</p>
                            </div>

                            {/* Nutritional Info */}
                            {(product.calories || product.prepTime || product.servingSize) && (
                                <div className="glass-panel p-5 rounded-[2rem] mb-6">
                                    <h3 className="font-bold text-bk-brown text-lg mb-4 flex items-center gap-2">
                                        <Zap size={18} className="text-bk-red" /> Nutritional Info
                                    </h3>
                                    <div className="grid grid-cols-3 gap-3">
                                        {product.calories && (
                                            <div className="bg-white/50 p-3 rounded-xl text-center">
                                                <div className="text-2xl font-black text-bk-red">{product.calories}</div>
                                                <div className="text-xs text-bk-brown/60 font-bold mt-1">Calories</div>
                                            </div>
                                        )}
                                        {product.prepTime && (
                                            <div className="bg-white/50 p-3 rounded-xl text-center">
                                                <div className="text-2xl font-black text-bk-brown">{product.prepTime}</div>
                                                <div className="text-xs text-bk-brown/60 font-bold mt-1">Min</div>
                                            </div>
                                        )}
                                        {product.servingSize && (
                                            <div className="bg-white/50 p-3 rounded-xl text-center">
                                                <div className="text-sm font-black text-bk-brown leading-tight pt-1">{product.servingSize}</div>
                                                <div className="text-xs text-bk-brown/60 font-bold mt-1">Serving</div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Ingredients */}
                            {product.ingredients && product.ingredients.length > 0 && (
                                <div className="glass-panel p-5 rounded-[2rem] mb-6">
                                    <h3 className="font-bold text-bk-brown text-lg mb-4 flex items-center gap-2">
                                        <Utensils size={18} className="text-bk-brown" /> Ingredients
                                    </h3>
                                    <div className="flex flex-wrap gap-2">
                                        {product.ingredients.map((ingredient, idx) => (
                                            <span key={idx} className="px-3 py-1.5 bg-white/60 rounded-full text-sm font-bold text-bk-brown border border-bk-brown/10">
                                                {ingredient}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Allergens */}
                            {product.allergens && product.allergens.length > 0 && (
                                <div className="glass-panel p-5 rounded-[2rem] mb-6 border-2 border-red-200">
                                    <h3 className="font-bold text-red-600 text-lg mb-4 flex items-center gap-2">
                                        ⚠️ Allergen Information
                                    </h3>
                                    <div className="flex flex-wrap gap-2">
                                        {product.allergens.map((allergen, idx) => (
                                            <span key={idx} className="px-3 py-1.5 bg-red-50 rounded-full text-sm font-bold text-red-600 border border-red-200">
                                                {allergen}
                                            </span>
                                        ))}
                                    </div>
                                    <p className="text-xs text-red-500/70 mt-3 font-medium">Contains allergens listed above. Please inform staff of any allergies.</p>
                                </div>
                            )}

                            {/* Modifiers */}
                            {product.availableModifiers && product.availableModifiers.length > 0 && (
                                <div className="glass-panel p-5 rounded-[2rem] mb-6">
                                    <h3 className="font-bold text-bk-brown text-lg mb-4 flex items-center gap-2">
                                        <Flame size={18} className="text-bk-red fill-bk-red" /> Customize Your Order
                                    </h3>
                                    <div className="space-y-3">
                                        {product.availableModifiers.map(mod => {
                                            const isSelected = selectedModifiers.find(m => m.id === mod.id);
                                            return (
                                                <motion.div
                                                    key={mod.id}
                                                    onClick={() => toggleModifier(mod)}
                                                    whileTap={{ scale: 0.98 }}
                                                    className={`p-4 rounded-2xl flex justify-between items-center transition-all cursor-pointer border-2 ${isSelected ? 'bg-white border-bk-red shadow-lg shadow-red-500/10' : 'bg-white/50 border-transparent hover:bg-white/70'}`}
                                                >
                                                    <span className="font-bold text-bk-brown">{mod.name}</span>
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-sm font-bold text-bk-red">+{mod.price.toLocaleString()} ₸</span>
                                                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-bk-red border-bk-red' : 'border-bk-brown/20'}`}>
                                                            {isSelected && <Zap size={12} className="text-white fill-white" />}
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Removable Ingredients */}
                            {product.removableIngredients && product.removableIngredients.length > 0 && (
                                <div className="glass-panel p-5 rounded-[2rem] mb-6">
                                    <h3 className="font-bold text-bk-brown text-lg mb-3">Remove Ingredients</h3>
                                    <p className="text-xs text-bk-brown/60 mb-3 font-medium">Tap to remove from your order</p>
                                    <div className="flex flex-wrap gap-2">
                                        {product.removableIngredients.map((ingredient, idx) => (
                                            <button key={idx} className="px-3 py-1.5 bg-white/60 hover:bg-red-50 hover:text-red-600 hover:border-red-200 rounded-full text-sm font-bold text-bk-brown border border-bk-brown/10 transition-colors">
                                                🚫 {ingredient}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Action Bar (Glass) */}
                        <div className="absolute bottom-0 left-0 right-0 p-6 glass-panel border-t-0 rounded-t-[2rem] shadow-2xl">
                            <div className="flex items-center justify-between gap-4">
                                {/* Quantity Selector */}
                                <div className="flex items-center gap-3 bg-white/60 p-2 rounded-full border border-bk-brown/10">
                                    <motion.button
                                        whileTap={{ scale: 0.9 }}
                                        onClick={() => setQuantity(q => Math.max(1, q - 1))}
                                        className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-bk-brown shadow-sm hover:bg-bk-brown hover:text-white transition-colors"
                                    >
                                        <Minus size={18} strokeWidth={3} />
                                    </motion.button>
                                    <span className="text-xl font-black text-bk-brown w-8 text-center">{quantity}</span>
                                    <motion.button
                                        whileTap={{ scale: 0.9 }}
                                        onClick={() => setQuantity(q => q + 1)}
                                        className="w-10 h-10 rounded-full bg-bk-brown text-white flex items-center justify-center shadow-sm hover:bg-bk-red transition-colors"
                                    >
                                        <Plus size={18} strokeWidth={3} />
                                    </motion.button>
                                </div>

                                {/* Add to Cart Button */}
                                <BouncyButton
                                    onClick={() => { addToCart(product, quantity, selectedModifiers); onClose(); }}
                                    className="flex-1 bg-bk-red text-white h-14 rounded-full font-bold text-base flex justify-between items-center px-6 shadow-xl shadow-red-500/30 hover:bg-bk-red/90 transition-colors"
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
// 🏠 HOME PAGE (Immersive)
// ============================================================================
const HomePage: React.FC = () => {
    const navigate = useNavigate();
    return (
        <div className="min-h-screen pt-14 pb-32 px-6">
            <header className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-5xl font-black text-bk-brown tracking-tighter">Food<span className="text-bk-red">Go</span></h1>
                    <p className="text-bk-brown/60 font-medium">Hungry? You're in the right place.</p>
                </div>
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg shadow-orange-900/10">
                    <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="User" className="w-8 h-8" />
                </div>
            </header>

            {/* Hero Banner */}
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="relative overflow-hidden bg-[#502314] rounded-[2.5rem] p-8 text-[#F5EBDC] mb-10 shadow-2xl shadow-brown-900/20"
            >
                <div className="absolute top-0 right-0 w-64 h-64 bg-bk-red rounded-full filter blur-[80px] opacity-40 -translate-y-1/2 translate-x-1/2" />
                <div className="relative z-10">
                    <span className="inline-block px-4 py-1.5 bg-bk-red text-white text-xs font-bold rounded-full mb-4 shadow-lg shadow-red-600/40">FLAME GRILLED PROMO</span>
                    <h2 className="text-4xl font-black mb-2 leading-tight">Whopper<br />Wednesday</h2>
                    <p className="text-white/70 mb-6 max-w-[200px]">Get 50% off on all heavy hitters today.</p>
                    <BouncyButton onClick={() => navigate('/customer/menu')} className="bg-[#F5EBDC] text-bk-brown px-8 py-4 rounded-2xl font-black flex items-center gap-2">
                        Grab Deal <ArrowRight size={18} />
                    </BouncyButton>
                </div>
                <img src="https://cdn-icons-png.flaticon.com/512/3075/3075977.png" className="absolute -bottom-4 -right-8 w-48 h-48 object-contain drop-shadow-2xl rotate-12" alt="Burger" />
            </motion.div>

            <h3 className="text-2xl font-black text-bk-brown mb-6">Categories</h3>
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

    // Mock Data for Demo if Firebase is empty/slow
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

            {/* Glass Search */}
            <div className="relative mb-8">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-bk-brown/40">
                    <Search size={22} strokeWidth={3} />
                </div>
                <input
                    type="text"
                    placeholder="What are you craving?"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full h-14 pl-14 pr-4 bg-white/60 border-none rounded-2xl text-bk-brown font-bold placeholder:font-medium placeholder:text-bk-brown/30 focus:outline-none focus:ring-2 focus:ring-bk-red/50 shadow-sm"
                />
            </div>

            {/* Category Pills */}
            <div className="flex gap-3 overflow-x-auto pb-6 -mx-6 px-6 no-scrollbar">
                {categories.map(c => (
                    <motion.button
                        key={c}
                        onClick={() => setCategory(c)}
                        whileTap={{ scale: 0.9 }}
                        className={`px-6 py-3 rounded-full text-sm font-bold whitespace-nowrap shadow-lg transition-all ${category === c ? 'bg-bk-red text-white shadow-red-500/30' : 'bg-white text-bk-brown shadow-orange-900/5'}`}
                    >
                        {c}
                    </motion.button>
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
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    const handleCheckout = async () => {
        if (cart.length === 0) return;
        setLoading(true);
        try {
            await addDoc(collection(db, 'orders'), {
                ticketNumber: Math.floor(1000 + Math.random() * 9000).toString(),
                items: cart,
                totalAmount: totalPrice,
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
                <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center mb-6 shadow-xl shadow-orange-900/10">
                    <ShoppingBag size={48} className="text-bk-brown/20" />
                </div>
                <h2 className="text-3xl font-black text-bk-brown mb-2">Cart Empty</h2>
                <p className="text-bk-brown/50 mb-8 font-medium">Your stomach is growling. Feed it.</p>
                <BouncyButton onClick={() => navigate('/customer/menu')} className="bg-bk-red text-white px-10 py-4 rounded-full font-bold shadow-xl shadow-red-500/30">
                    Start Ordering
                </BouncyButton>
            </div>
        );
    }

    return (
        <div className="min-h-screen pt-12 pb-40 px-6">
            <h1 className="text-4xl font-black text-bk-brown mb-8">Your Tray</h1>
            <div className="space-y-4">
                {cart.map((item, i) => (
                    <motion.div
                        initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
                        key={`${item.productId}-${i}`}
                        className="bg-white p-4 rounded-[1.5rem] flex items-center gap-4 shadow-sm"
                    >
                        <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-bk-brown text-lg">{item.name}</h3>
                            <div className="text-sm text-bk-brown/50 font-medium">Qty: {item.quantity}</div>
                        </div>
                        <div className="text-right">
                            <p className="text-bk-red font-black text-lg">{item.price.toLocaleString()}</p>
                            <button onClick={() => removeFromCart(item.productId)} className="text-xs text-bk-brown/40 font-bold mt-1 underline">Remove</button>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Total Float */}
            <div className="fixed bottom-24 left-6 right-6">
                <div className="glass-panel p-6 rounded-[2rem] bg-[#502314]/95 text-[#F5EBDC]">
                    <div className="flex justify-between mb-6 opacity-80">
                        <span className="font-medium">Total Amount</span>
                        <span className="font-bold text-xl">{totalPrice.toLocaleString()} UZS</span>
                    </div>
                    <BouncyButton
                        onClick={handleCheckout}
                        disabled={loading}
                        className="w-full bg-[#F5EBDC] text-[#502314] py-4 rounded-xl font-black text-lg flex items-center justify-center gap-2"
                    >
                        {loading ? 'Firing up the grill...' : <>Checkout <ArrowRight size={20} strokeWidth={3} /></>}
                    </BouncyButton>
                </div>
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
        <p className="text-bk-brown/50">Coming soon in v26.3</p>
    </div>
);

// ============================================================================
// 🚀 APP ENTRY
// ============================================================================
const CustomerApp: React.FC = () => {
    const [cart, setCart] = useState<OrderItem[]>([]);

    // Logic kept simple for demo
    const addToCart = (product: Product, quantity: number, modifiers: Modifier[]) => {
        setCart(prev => [...prev, { productId: product.id, name: product.name, price: product.price, quantity, modifiers }]);
    };
    const removeFromCart = (id: string) => setCart(p => p.filter(i => i.productId !== id));
    const clearCart = () => setCart([]);
    const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);
    const totalPrice = cart.reduce((acc, item) => acc + (item.price + item.modifiers.reduce((a, m) => a + m.price, 0)) * item.quantity, 0);

    return (
        <CartContext.Provider value={{ cart, addToCart, removeFromCart, clearCart, totalItems, totalPrice }}>
            <GlobalStyles />
            <div className="min-h-screen text-bk-brown overflow-hidden bg-[#F5EBDC]">
                <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/menu" element={<MenuPage />} />
                    <Route path="/cart" element={<CartPage />} />
                    <Route path="/favorites" element={<FavoritesPage />} />
                    <Route path="*" element={<Navigate to="/customer" replace />} />
                </Routes>
                <BottomNav />
            </div>
        </CartContext.Provider>
    );
};

export default CustomerApp;