import React, { useEffect, useState, useRef, useMemo } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../../../core/firebase';
import type { Order } from '../../../core/types';
import { CheckCircle, Flame, LogOut, ChefHat, Volume2, VolumeX, Activity, AlertTriangle, AlertOctagon, UtensilsCrossed } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { signOut } from 'firebase/auth';

// ----------------------------------------------------------------------------
// 🎨 DESIGN SYSTEM (Cook-Centric "Minimalism x Hype")
// ----------------------------------------------------------------------------
const KitchenStyles = () => (
    <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap');
    
    :root {
      --bk-red: #D62300;
      --bk-orange: #FAAF18;
      --bk-brown: #502314;
      --bk-dark: #1A1A1A;
      --bk-green: #27AE60;
      --glass-border: rgba(255, 255, 255, 0.08);
      --glass-bg: rgba(20, 10, 5, 0.85);
    }

    body {
      background-color: #050505;
      font-family: 'Outfit', sans-serif;
      overflow: hidden;
    }

    .ultra-glass {
      background: var(--glass-bg);
      backdrop-filter: blur(24px);
      -webkit-backdrop-filter: blur(24px);
      border: 1px solid var(--glass-border);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    }

    .cook-card {
        background: #141414;
        border: 2px solid #333;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    }
    
    .status-new { border-color: #FAAF18; box-shadow: 0 0 20px -10px rgba(250, 175, 24, 0.3); }
    .status-cooking { border-color: #3B82F6; box-shadow: 0 0 20px -10px rgba(59, 130, 246, 0.3); }
    .status-critical { border-color: #D62300; animation: pulse-border 2s infinite; }
    
    @keyframes pulse-border {
        0% { border-color: #D62300; box-shadow: 0 0 0 0 rgba(214, 35, 0, 0.4); }
        70% { border-color: #D62300; box-shadow: 0 0 0 10px rgba(214, 35, 0, 0); }
        100% { border-color: #D62300; box-shadow: 0 0 0 0 rgba(214, 35, 0, 0); }
    }

    .no-scrollbar::-webkit-scrollbar { display: none; }
    .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
  `}</style>
);

const ALERT_SOUND = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';

const getSafeTime = (createdAt: any): number => {
    if (!createdAt) return Date.now();
    if (typeof createdAt.toMillis === 'function') return createdAt.toMillis();
    if (createdAt.seconds) return createdAt.seconds * 1000;
    if (createdAt instanceof Date) return createdAt.getTime();
    return new Date(createdAt).getTime();
};

// ============================================================================
// 🎫 COOK CARD (Streamlined for Speed)
// ============================================================================
interface KitchenOrderCardProps {
    order: Order;
    onUpdateStatus: (orderId: string, newStatus: Order['status'] | 'Problem') => void;
}

const KitchenOrderCard: React.FC<KitchenOrderCardProps> = ({ order, onUpdateStatus }) => {
    const [elapsed, setElapsed] = useState(0);
    const TARGET = 600; // 10m
    const URGENT = 420; // 7m

    useEffect(() => {
        const start = getSafeTime(order.createdAt);
        const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000));
        tick();
        const int = setInterval(tick, 1000);
        return () => clearInterval(int);
    }, [order.createdAt]);

    const statusProps = useMemo(() => {
        const isCrit = elapsed >= TARGET;
        const isUrg = elapsed >= URGENT;
        let theme = 'status-new';
        if (order.status === 'Cooking') theme = 'status-cooking';
        if (isCrit) theme = 'status-critical'; // Critical overrides all

        return { theme, isCrit, isUrg };
    }, [elapsed, order.status]);

    const formatTime = (sec: number) => {
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className={`cook-card ${statusProps.theme} flex flex-col rounded-3xl w-full max-w-[340px] h-[480px] relative overflow-hidden`}
        >
            {/* Header */}
            <div className="p-4 bg-[#0A0A0A] border-b border-white/10 flex justify-between items-start">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="text-5xl font-black italic tracking-tighter text-white">
                            #{order.ticketNumber}
                        </span>
                    </div>
                    <div className="flex gap-2 mt-2">
                        <span className={`text-[10px] font-black uppercase px-2 py-1 rounded bg-white/10 text-white`}>
                            {order.orderType}
                        </span>
                        {order.status === 'Cooking' && (
                            <span className="text-[10px] font-black uppercase px-2 py-1 rounded bg-blue-500/20 text-blue-400 flex items-center gap-1">
                                <Flame size={10} /> Cooking
                            </span>
                        )}
                    </div>
                </div>

                <div className={`
                    flex flex-col items-center justify-center w-16 h-16 rounded-xl border
                    ${statusProps.isCrit ? 'bg-bk-red border-bk-red animate-pulse' : 'bg-white/5 border-white/10'}
                `}>
                    <span className="font-mono font-bold text-lg text-white leading-none">
                        {formatTime(elapsed)}
                    </span>
                    <span className="text-[9px] font-bold uppercase text-white/50 mt-1">Min</span>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 no-scrollbar bg-[#111]">
                {order.items.map((item, idx) => (
                    <div key={idx} className="flex gap-4 items-start pb-3 border-b border-white/5 last:border-0">
                        <div className="w-8 h-8 rounded bg-white/10 flex items-center justify-center font-black text-white shrink-0">
                            {item.quantity}
                        </div>
                        <div className="flex-1">
                            <span className="text-lg font-bold text-neutral-200 leading-tight block">
                                {item.name}
                            </span>
                            {item.modifiers?.map((m, i) => (
                                <span key={i} className={`
                                    inline-block mr-1 mt-1 px-1.5 py-0.5 rounded text-[10px] font-black uppercase
                                    ${(m.id?.startsWith('remove') || m.name.includes('No '))
                                        ? 'bg-red-500/10 text-red-400 line-through'
                                        : 'bg-green-500/10 text-green-400'}
                                `}>
                                    {m.name.replace('🚫 ', '')}
                                </span>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Actions */}
            <div className="p-3 bg-[#0A0A0A] border-t border-white/10 grid grid-cols-[auto_1fr] gap-2">
                <button
                    onClick={() => onUpdateStatus(order.id!, 'Problem')}
                    className="w-14 h-14 rounded-2xl bg-white/5 hover:bg-bk-red/20 hover:text-bk-red hover:border-bk-red border border-white/10 flex items-center justify-center transition-colors"
                >
                    <AlertTriangle size={20} />
                </button>

                <button
                    onClick={() => onUpdateStatus(order.id!, order.status === 'Pending' ? 'Cooking' : 'Ready')}
                    className={`
                        h-14 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all
                        ${order.status === 'Pending'
                            ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/40'
                            : 'bg-bk-green hover:bg-green-500 text-white shadow-green-900/40'}
                    `}
                >
                    {order.status === 'Pending' ? (
                        <>Start Cook <Flame size={18} /></>
                    ) : (
                        <>Order Ready <CheckCircle size={18} /></>
                    )}
                </button>
            </div>
        </motion.div>
    );
};

// ============================================================================
// 📊 KITCHEN LOAD GAUGE
// ============================================================================
const LoadGauge = ({ load }: { load: number }) => {
    // 0-30: Low, 30-70: Med, 70+: High/Overload
    let color = 'bg-green-500';
    let text = 'LOW LOAD';

    if (load > 30) { color = 'bg-yellow-500'; text = 'MODERATE'; }
    if (load > 60) { color = 'bg-bk-orange'; text = 'BUSY'; }
    if (load > 85) { color = 'bg-bk-red'; text = 'CRITICAL'; }

    return (
        <div className="flex flex-col items-end">
            <div className="flex items-center gap-2 mb-1">
                <Activity size={12} className={color.replace('bg-', 'text-')} />
                <span className={`text-[10px] font-black uppercase tracking-widest ${color.replace('bg-', 'text-')}`}>
                    {text}
                </span>
            </div>
            <div className="w-32 h-2 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(load, 100)}%` }}
                    className={`h-full ${color} shadow-[0_0_10px_currentColor] transition-colors duration-500`}
                />
            </div>
        </div>
    );
};

// ============================================================================
// 👨‍🍳 MAIN: KitchenDisplay (Workflow V2)
// ============================================================================
const KitchenDisplay: React.FC = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [isMuted, setIsMuted] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const prevCount = useRef(0);

    // --- Data Stream ---
    useEffect(() => {
        // Only fetch Pending and Cooking 
        const q = query(
            collection(db, 'orders'),
            where('status', 'in', ['Pending', 'Cooking'])
        );

        const unsub = onSnapshot(q, (snap) => {
            const data = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Order[];
            data.sort((a, b) => getSafeTime(a.createdAt) - getSafeTime(b.createdAt));
            if (data.length > prevCount.current && !isMuted) {
                audioRef.current?.play().catch(() => { });
            }
            prevCount.current = data.length;
            setOrders(data);
        });

        audioRef.current = new Audio(ALERT_SOUND);
        window.addEventListener('online', () => setIsOnline(true));
        window.addEventListener('offline', () => setIsOnline(false));
        return () => unsub();
    }, []);

    // --- Actions ---
    const updateStatus = async (id: string, status: Order['status'] | 'Problem') => {
        if (status === 'Problem') {
            // For now just console log, could move to a "Issues" collection
            if (!confirm('Mark this order as having a problem? (Kitchen Manager will be notified)')) return;
            // In real app: await addDoc(collection(db, 'kitchen_issues'), { orderId: id, ... })
        }

        // Optimistic update
        setOrders(p => p.filter(o => o.id !== id || (status !== 'Ready' && status !== 'Problem')));

        try {
            // If 'Ready' or 'Problem', we conceptually 'finish' it for this screen 
            // Check types: if status is Problem, we might need a separate field or just map to 'Cancelled'/'Ready'
            // For now mapping Problem -> 'Pending' with a flag, but easier to just keep as is or map to standard
            const dbStatus = status === 'Problem' ? 'Pending' : status;
            await updateDoc(doc(db, 'orders', id), {
                status: dbStatus,
                updatedAt: new Date()
            });
        } catch (e) {
            console.error(e);
        }
    };

    // --- Derived Data ---
    const newOrders = orders.filter(o => o.status === 'Pending');
    const cookingOrders = orders.filter(o => o.status === 'Cooking');

    // Load Calculation (Arbitrary: 10 items = 100% capacity per cook, assume 3 cooks = 30 cap)
    const totalItems = orders.reduce((acc, o) => acc + o.items.reduce((s, i) => s + i.quantity, 0), 0);
    const kitchenLoad = (totalItems / 20) * 100; // 20 items = 100% load baseline

    return (
        <div className="h-screen w-screen bg-[#050505] text-white flex flex-col relative">
            <KitchenStyles />

            {/* Offline Alert */}
            <AnimatePresence>
                {!isOnline && (
                    <motion.div initial={{ y: -50 }} animate={{ y: 0 }} className="absolute top-0 w-full bg-red-600 z-50 text-center font-bold py-1 text-sm">
                        OFFLINE CONNECTION
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 🛑 HEADER */}
            <header className="h-20 shrink-0 border-b border-white/5 bg-[#0A0A0A]/50 backdrop-blur-md px-6 flex items-center justify-between z-20">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-bk-red to-orange-600 flex items-center justify-center shadow-lg shadow-red-900/20">
                        <Flame className="text-white fill-white" size={20} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black italic tracking-tighter leading-none">
                            KITCHEN<span className="text-bk-orange">OS</span>
                        </h1>
                        <span className="text-white/30 text-[10px] font-bold uppercase tracking-widest">
                            Cook Station • Alpha
                        </span>
                    </div>
                </div>

                {/* Queue Counts Pill */}
                <div className="flex items-center gap-6 bg-[#111] border border-white/5 rounded-full px-6 py-2">
                    <div className="flex items-center gap-3">
                        <span className="text-white/50 text-[10px] uppercase font-black tracking-wider">Queue</span>
                        <div className="flex items-center gap-2">
                            <span className="text-bk-orange font-bold text-lg">{newOrders.length}</span>
                            <span className="text-white/20 text-xs">/</span>
                            <span className="text-blue-400 font-bold text-lg">{cookingOrders.length}</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <LoadGauge load={kitchenLoad} />

                    <button onClick={() => setIsMuted(!isMuted)} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/50 hover:text-white">
                        {isMuted ? <VolumeX size={20} className="text-red-500" /> : <Volume2 size={20} />}
                    </button>

                    <button onClick={() => signOut(auth)} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/50 hover:text-white">
                        <LogOut size={20} />
                    </button>
                </div>
            </header>

            {/* 🍱 MAIN WORKSPACE (Kanban-ish split) */}
            <main className="flex-1 overflow-hidden flex relative z-10">

                {/* 🟠 NEW ORDERS COLUMN */}
                <section className="flex-1 flex flex-col border-r border-white/5 bg-gradient-to-b from-[#0A0A0A] to-black relative">
                    <div className="p-4 border-b border-white/5 flex justify-between items-center bg-[#0F0F0F]">
                        <h2 className="flex items-center gap-2 font-black italic text-xl uppercase tracking-tighter text-white">
                            <AlertOctagon size={20} className="text-bk-orange" />
                            New Orders
                        </h2>
                        <span className="bg-bk-orange text-black font-black text-xs px-2 py-0.5 rounded">
                            {newOrders.length}
                        </span>
                    </div>

                    <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 custom-scrollbar space-y-6">
                        <AnimatePresence>
                            {newOrders.map(order => (
                                <KitchenOrderCard key={order.id} order={order} onUpdateStatus={updateStatus} />
                            ))}
                            {newOrders.length === 0 && (
                                <div className="h-64 flex flex-col items-center justify-center opacity-20">
                                    <UtensilsCrossed size={48} className="mb-4" />
                                    <span className="font-bold uppercase tracking-widest text-sm">No Pending Orders</span>
                                </div>
                            )}
                        </AnimatePresence>
                    </div>
                </section>

                {/* 🔵 COOKING COLUMN */}
                <section className="flex-1 flex flex-col bg-[#050505] relative">
                    <div className="p-4 border-b border-white/5 flex justify-between items-center bg-[#080808]">
                        <h2 className="flex items-center gap-2 font-black italic text-xl uppercase tracking-tighter text-white">
                            <Flame size={20} className="text-blue-500 fill-blue-500" />
                            In Progress
                        </h2>
                        <span className="bg-blue-600 text-white font-black text-xs px-2 py-0.5 rounded">
                            {cookingOrders.length}
                        </span>
                    </div>

                    <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 custom-scrollbar space-y-6">
                        <AnimatePresence>
                            {cookingOrders.map(order => (
                                <KitchenOrderCard key={order.id} order={order} onUpdateStatus={updateStatus} />
                            ))}
                            {cookingOrders.length === 0 && (
                                <div className="h-64 flex flex-col items-center justify-center opacity-20">
                                    <ChefHat size={48} className="mb-4" />
                                    <span className="font-bold uppercase tracking-widest text-sm">Station Clear</span>
                                </div>
                            )}
                        </AnimatePresence>
                    </div>
                </section>

            </main>
        </div>
    );
};

export default KitchenDisplay;