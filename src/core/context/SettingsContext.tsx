import React, { createContext, useContext, useEffect, useState } from 'react';
import { doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './AuthContext';

type Language = 'ru' | 'uz' | 'ky' | 'kk' | 'tg';
type Currency = 'KZT' | 'RUB' | 'USD' | 'UZS' | 'KGS' | 'TJS';

interface Translations {
    [key: string]: {
        [lang in Language]: string;
    };
}

const translations: Translations = {
    // Shared
    'home': { ru: 'Главная', uz: 'Asosiy', ky: 'Башкы', kk: 'Басты', tg: 'Асосӣ' },
    'menu': { ru: 'Меню', uz: 'Menyu', ky: 'Меню', kk: 'Мәзір', tg: 'Меню' },
    'cart': { ru: 'Корзина', uz: 'Savat', ky: 'Корзина', kk: 'Себет', tg: 'Сабад' },
    'profile': { ru: 'Профиль', uz: 'Profil', ky: 'Профиль', kk: 'Профиль', tg: 'Профил' },
    'favorites': { ru: 'Избранное', uz: 'Sevimlilar', ky: 'Тандалгандар', kk: 'Таңдаулылар', tg: 'Дӯстдошта' },

    // Home
    'salam': { ru: 'Салам', uz: 'Salom', ky: 'Салам', kk: 'Сәлем', tg: 'Салом' },
    'hungry': { ru: 'Голодны?', uz: 'Ochmisiz?', ky: 'Ачсызбы?', kk: 'Ашсыз ба?', tg: 'Гуршна?' },
    'halal_pride': { ru: 'HALAL PRIDE', uz: 'HALOL IFTIXORI', ky: 'HALAL PRIDE', kk: 'ХАЛАЛ МАҚТАНЫШЫ', tg: 'HALAL PRIDE' },
    'signature_treats': { ru: 'Фирменные блюда', uz: 'Maxsus taomlar', ky: 'Фирмалык тамактар', kk: 'Фирмалық тағамдар', tg: 'Таомҳои махсус' },
    'order_now': { ru: 'Заказать сейчас', uz: 'Hozir buyurtma bering', ky: 'Азыр заказ бериңиз', kk: 'Қазір тапсырыс беріңіз', tg: 'Ҳоло фармоиш диҳед' },

    // Cart
    'your_tray': { ru: 'Ваш поднос', uz: 'Sizning savatingiz', ky: 'Сиздин подносуңуз', kk: 'Сіздің науаңыз', tg: 'Ҷойгоҳи шумо' },
    'checkout': { ru: 'Оформить заказ', uz: 'Buyurtmani rasmiylashtirish', ky: 'Заказды тариздөө', kk: 'Тапсырыс беру', tg: 'Тартиб додани фармоиш' },
    'total': { ru: 'Итого', uz: 'Jami', ky: 'Жалпы', kk: 'Барлығы', tg: 'Ҳамагӣ' },
    'empty_tray': { ru: 'Поднос пуст', uz: 'Savat bo\'sh', ky: 'Поднос бош', kk: 'Науа бос', tg: 'Ҷойгоҳ холи аст' },

    // Profile
    'language': { ru: 'Язык', uz: 'Til', ky: 'Тил', kk: 'Тіл', tg: 'Забон' },
    'currency': { ru: 'Валюта', uz: 'Valyuta', ky: 'Валюта', kk: 'Валюта', tg: 'Асъор' },
    'logout': { ru: 'Выйти', uz: 'Chiqish', ky: 'Чыгуу', kk: 'Шығу', tg: 'Хуруҷ' },
    'order_history': { ru: 'История заказов', uz: 'Buyurtmalar tarixi', ky: 'Заказдын тарыхы', kk: 'Тапсырыстар тарихы', tg: 'Таърихи фармоишҳо' },
};

const currencySymbols: Record<Currency, string> = {
    KZT: '₸', RUB: '₽', USD: '$', UZS: 'so\'m', KGS: 'сом', TJS: 'смн'
};

const exchangeRates: Record<Currency, number> = {
    KZT: 1, // Base
    RUB: 5.2,
    USD: 480,
    UZS: 0.038,
    KGS: 5.5,
    TJS: 45
};

interface SettingsContextType {
    language: Language;
    currency: Currency;
    setLanguage: (lang: Language) => Promise<void>;
    setCurrency: (curr: Currency) => Promise<void>;
    t: (key: string) => string;
    formatPrice: (priceInKZT: number) => string;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const [language, setLanguageState] = useState<Language>('ru');
    const [currency, setCurrencyState] = useState<Currency>('KZT');

    useEffect(() => {
        if (user) {
            const unsub = onSnapshot(doc(db, 'users', user.uid), (snap) => {
                if (snap.exists()) {
                    const data = snap.data();
                    if (data.language) setLanguageState(data.language);
                    if (data.currency) setCurrencyState(data.currency);
                }
            });
            return () => unsub();
        }
    }, [user]);

    const setLanguage = async (lang: Language) => {
        setLanguageState(lang);
        if (user) await updateDoc(doc(db, 'users', user.uid), { language: lang });
    };

    const setCurrency = async (curr: Currency) => {
        setCurrencyState(curr);
        if (user) await updateDoc(doc(db, 'users', user.uid), { currency: curr });
    };

    const t = (key: string) => translations[key]?.[language] || key;

    const formatPrice = (priceInKZT: number) => {
        const converted = priceInKZT / exchangeRates[currency];
        return `${Math.round(converted).toLocaleString()} ${currencySymbols[currency]}`;
    };

    return (
        <SettingsContext.Provider value={{ language, currency, setLanguage, setCurrency, t, formatPrice }}>
            {children}
        </SettingsContext.Provider>
    );
};

export const useSettings = () => {
    const context = useContext(SettingsContext);
    if (!context) throw new Error('useSettings must be used within SettingsProvider');
    return context;
};
