import React, { useState } from 'react';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    sendPasswordResetEmail
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../../core/firebase';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, Loader2, ShoppingBag, ArrowLeft, Sparkles, Flame, ChefHat, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================================================
// 🎨 DESIGN SYSTEM (iOS 26.2 x Burger King)
// ============================================================================
const AuthStyles = () => (
    <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap');
    
    :root {
      --bk-red: #D62300;
      --bk-orange: #FAAF18;
      --bk-brown: #502314;
      --bk-cream: #F5EBDC;
      --bk-dark: #2B1810;
    }

    body {
      font-family: 'Outfit', sans-serif;
      background-color: var(--bk-brown);
      color: white;
      margin: 0;
      overflow-x: hidden;
    }

    .auth-glass {
      background: rgba(43, 24, 16, 0.65);
      backdrop-filter: blur(40px) saturate(180%);
      -webkit-backdrop-filter: blur(40px) saturate(180%);
      border: 1px solid rgba(255, 255, 255, 0.1);
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
    }

    .auth-input {
      background: rgba(255, 255, 255, 0.05);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: white;
      transition: all 0.3s ease;
    }

    .auth-input:focus {
      background: rgba(255, 255, 255, 0.1);
      border-color: var(--bk-orange);
      box-shadow: 0 0 0 4px rgba(250, 175, 24, 0.15);
      transform: scale(1.01);
    }
    
    .auth-input::placeholder {
      color: rgba(255, 255, 255, 0.3);
    }

    .shimmer-text {
      background: linear-gradient(90deg, #fff 0%, #FAAF18 50%, #fff 100%);
      background-size: 200% auto;
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      animation: shimmer 3s linear infinite;
    }

    @keyframes shimmer {
      to { background-position: 200% center; }
    }
  `}</style>
);

const BackgroundMesh = () => (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <motion.div
            animate={{
                scale: [1, 1.2, 1],
                opacity: [0.4, 0.6, 0.4]
            }}
            transition={{ duration: 8, repeat: Infinity }}
            className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] bg-bk-red rounded-full blur-[150px] opacity-40"
        />
        <motion.div
            animate={{
                scale: [1.2, 1, 1.2],
                opacity: [0.3, 0.5, 0.3]
            }}
            transition={{ duration: 10, repeat: Infinity }}
            className="absolute bottom-[-20%] right-[-20%] w-[80%] h-[80%] bg-bk-orange rounded-full blur-[150px] opacity-30"
        />
        <div className="absolute inset-0 bg-black/20 backdrop-blur-[1px]" />
    </div>
);

// ============================================================================
// 🧠 LOGIC & COMPONENT
// ============================================================================
const AuthPage: React.FC = () => {
    const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    // Predefined staff roles mapping
    const STAFF_CREDENTIALS: Record<string, { role: 'admin' | 'kitchen' | 'manager' }> = {
        'admin@gmail.com': { role: 'admin' },
        'povar@gmail.com': { role: 'kitchen' },
        'menedje@gmail.com': { role: 'manager' },
    };

    const handleSeed = async () => {
        setLoading(true);
        setError('');
        setMessage('');

        const staffToCreate = [
            { email: 'admin@gmail.com', password: 'admin74', role: 'admin' },
            { email: 'povar@gmail.com', password: 'povar74', role: 'kitchen' },
            { email: 'menedje@gmail.com', password: 'menedjer74', role: 'manager' },
        ];

        const productsToSeed = [
            {
                name: "Golden Beast",
                category: "Burgers",
                price: 45000,
                image: "https://burgerking.co.uk/images/products/whopper.png",
                description: "Premium double beef patty with triple cheddar and crispy golden bacon.",
                isAvailable: true,
                tags: ["new", "heavy", "meat"],
                removableIngredients: ["Piyoz (Onion)", "Tuzlangan bodiring (Pickles)", "Sous (Sauce)"],
                availableModifiers: [{ id: "extra-cheese", name: "Double Cheese", price: 5000 }, { id: "extra-bacon", name: "Extra Bacon", price: 7000 }]
            },
            {
                name: "Classic Cheese",
                category: "Burgers",
                price: 32000,
                image: "https://images.unsplash.com/photo-1571091723267-3dfd5234d0b0?auto=format&fit=crop&q=80&w=800",
                description: "The timeless classic with our secret sauce.",
                isAvailable: true,
                tags: ["bestseller", "meat"],
                removableIngredients: ["Piyoz", "Pomidor"],
                availableModifiers: [{ id: "jalapeno", name: "Jalapeno", price: 3000 }]
            },
            {
                name: "Crispy Fries",
                category: "Sides",
                price: 15000,
                image: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&q=80&w=800",
                description: "Golden and crispy potato fries.",
                isAvailable: true,
                tags: ["side", "vegan"]
            },
            {
                name: "Coca-Cola 0.5",
                category: "Drinks",
                price: 8000,
                image: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&q=80&w=800",
                description: "Refreshing cold drink.",
                isAvailable: true,
                tags: ["drink", "cold"]
            },
            {
                name: "Berry Cheesecake",
                category: "Desserts",
                price: 25000,
                image: "https://images.unsplash.com/photo-1533134242443-d4fd215305ad?auto=format&fit=crop&q=80&w=800",
                description: "Creamy cheesecake with fresh berry topping.",
                isAvailable: true,
                tags: ["dessert", "sweet"]
            }
        ];

        try {
            for (const staff of staffToCreate) {
                try {
                    const cred = await createUserWithEmailAndPassword(auth, staff.email, staff.password);
                    await setDoc(doc(db, 'users', cred.user.uid), {
                        email: staff.email,
                        role: staff.role,
                        createdAt: new Date().toISOString()
                    });
                } catch (e: any) { console.log(`User ${staff.email} exists.`); }
            }
            for (const p of productsToSeed) {
                await setDoc(doc(db, 'products', p.name.replace(/\s+/g, '-').toLowerCase()), p);
            }
            setMessage('🔥 Kitchen Initialized! Staff & Menu Ready.');
        } catch (err: any) {
            setError('Init Error: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setMessage('');

        try {
            if (mode === 'login') {
                const userCredential = await signInWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;
                const lowerEmail = email.toLowerCase();

                if (STAFF_CREDENTIALS[lowerEmail]) {
                    const staffRole = STAFF_CREDENTIALS[lowerEmail].role;
                    await setDoc(doc(db, 'users', user.uid), { email: user.email, role: staffRole, updatedAt: new Date().toISOString() }, { merge: true });
                    navigate(staffRole === 'kitchen' ? '/kitchen' : '/admin');
                } else {
                    const userDoc = await getDoc(doc(db, 'users', user.uid));
                    const role = userDoc.data()?.role || 'customer';
                    navigate('/customer'); // Redirect to customer mobile app
                }
            } else if (mode === 'register') {
                if (STAFF_CREDENTIALS[email.toLowerCase()]) throw new Error('Staff email reserved. Please login.');
                if (!fullName) throw new Error('Please enter your full name');

                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                await setDoc(doc(db, 'users', userCredential.user.uid), {
                    email: email,
                    displayName: fullName,
                    role: 'customer',
                    photoURL: `https://api.dicebear.com/7.x/avataaars/svg?seed=${fullName}`,
                    createdAt: new Date().toISOString()
                });
                navigate('/customer');
            } else if (mode === 'forgot') {
                await sendPasswordResetEmail(auth, email);
                setMessage('Check your email for the magic link!');
            }
        } catch (err: any) {
            setError(err.message || 'Authentication failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen relative flex items-center justify-center p-6">
            <AuthStyles />
            <BackgroundMesh />

            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="w-full max-w-[420px] relative z-10"
            >
                {/* 3D Glass Card */}
                <div className="auth-glass rounded-[3rem] p-8 md:p-10 relative overflow-hidden group">
                    {/* Gloss Reflection */}
                    <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-bl from-white/10 to-transparent pointer-events-none" />

                    {/* Header */}
                    <div className="text-center mb-10 relative z-10">
                        <motion.div
                            whileHover={{ rotate: 10, scale: 1.1 }}
                            className="w-20 h-20 bg-gradient-to-tr from-bk-orange to-bk-red rounded-3xl mx-auto mb-6 flex items-center justify-center shadow-2xl shadow-bk-red/40"
                        >
                            <Flame size={40} className="text-white fill-white" />
                        </motion.div>
                        <h1 className="text-4xl font-black text-white italic tracking-tighter mb-2 uppercase">
                            Muslim<span className="text-bk-orange">Food</span>
                        </h1>
                        <p className="text-white/50 text-sm font-medium tracking-wide first-letter:uppercase">
                            {mode === 'login' ? 'Staff & Customer Access' : mode === 'register' ? 'Join the MuslimFood' : 'Recover Credentials'}
                        </p>
                    </div>

                    {/* Quick Seed Button (Hidden/Subtle) */}
                    <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={handleSeed}
                        disabled={loading}
                        className="absolute top-6 right-6 p-2 rounded-full hover:bg-white/10 text-white/20 hover:text-white transition-colors"
                        title="Initialize Demo Data"
                    >
                        {loading ? <Loader2 className="animate-spin" size={16} /> : <ChefHat size={16} />}
                    </motion.button>

                    {/* Mode Switcher */}
                    {mode !== 'forgot' && (
                        <div className="flex bg-black/20 p-1.5 rounded-2xl mb-8 relative">
                            <motion.div
                                layoutId="activeTab"
                                className={`absolute inset-1.5 w-[calc(50%-6px)] h-[calc(100%-12px)] rounded-xl bg-bk-orange shadow-lg`}
                                style={{ left: mode === 'login' ? '6px' : '50%' }}
                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            />
                            <button
                                onClick={() => setMode('login')}
                                className={`flex-1 py-3 rounded-xl font-black text-xs relative z-10 transition-colors ${mode === 'login' ? 'text-bk-brown' : 'text-white/50 hover:text-white'}`}
                            >
                                LOGIN
                            </button>
                            <button
                                onClick={() => setMode('register')}
                                className={`flex-1 py-3 rounded-xl font-black text-xs relative z-10 transition-colors ${mode === 'register' ? 'text-bk-brown' : 'text-white/50 hover:text-white'}`}
                            >
                                REGISTER
                            </button>
                        </div>
                    )}

                    {/* Alerts */}
                    <AnimatePresence mode="wait">
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, height: 0 }}
                                className="bg-red-500/10 border border-red-500/20 text-red-200 p-4 rounded-2xl mb-6 text-xs font-bold text-center"
                            >
                                {error}
                            </motion.div>
                        )}
                        {message && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, height: 0 }}
                                className="bg-green-500/10 border border-green-500/20 text-green-200 p-4 rounded-2xl mb-6 text-xs font-bold text-center flex items-center justify-center gap-2"
                            >
                                <Sparkles size={14} /> {message}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Form */}
                    <form onSubmit={handleAuth} className="space-y-4">
                        {mode === 'register' && (
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest pl-3">Full Name</label>
                                <div className="relative">
                                    <User className="absolute left-5 top-1/2 -translate-y-1/2 text-white/30" size={18} />
                                    <input
                                        type="text"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        className="w-full auth-input rounded-2xl py-4 pl-12 pr-4 text-sm font-bold outline-none h-14"
                                        placeholder="Muslim Ostanov"
                                        required
                                    />
                                </div>
                            </div>
                        )}

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest pl-3">Email Access</label>
                            <div className="relative">
                                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-white/30" size={18} />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full auth-input rounded-2xl py-4 pl-12 pr-4 text-sm font-bold outline-none h-14"
                                    placeholder="crew@burgerking.com"
                                    required
                                />
                            </div>
                        </div>

                        {mode !== 'forgot' && (
                            <div className="space-y-1.5">
                                <div className="flex justify-between items-center px-3">
                                    <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Passcode</label>
                                    {mode === 'login' && (
                                        <button
                                            type="button"
                                            onClick={() => setMode('forgot')}
                                            className="text-[10px] font-bold text-bk-orange hover:text-white transition-colors"
                                        >
                                            RECOVER?
                                        </button>
                                    )}
                                </div>
                                <div className="relative">
                                    <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-white/30" size={18} />
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full auth-input rounded-2xl py-4 pl-12 pr-4 text-sm font-bold outline-none h-14"
                                        placeholder="••••••••"
                                        required
                                    />
                                </div>
                            </div>
                        )}

                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            disabled={loading}
                            className={`w-full h-16 rounded-[1.25rem] font-black text-base uppercase tracking-wider shadow-xl flex items-center justify-center gap-3 mt-4 transition-all ${mode === 'forgot'
                                ? 'bg-white text-bk-brown hover:bg-gray-100'
                                : 'bg-gradient-to-r from-bk-red to-orange-600 text-white shadow-red-900/40'
                                }`}
                        >
                            {loading ? (
                                <Loader2 className="animate-spin" />
                            ) : (
                                <>
                                    <span>{mode === 'login' ? 'Unlock Terminal' : mode === 'register' ? 'Create ID' : 'Send Link'}</span>
                                    {mode !== 'forgot' && <ShoppingBag className="opacity-50" size={20} />}
                                </>
                            )}
                        </motion.button>

                        {mode === 'forgot' && (
                            <button
                                type="button"
                                onClick={() => setMode('login')}
                                className="w-full py-4 text-xs font-bold text-white/40 hover:text-white transition-colors flex items-center justify-center gap-2"
                            >
                                <ArrowLeft size={14} /> Back to Login
                            </button>
                        )}
                    </form>

                    {/* Footer */}
                    <div className="mt-8 pt-6 border-t border-white/5 text-center">
                        <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">
                            Powered by DastFood OS
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default AuthPage;
