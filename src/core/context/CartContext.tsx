import React, { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import type { OrderItem, Product, Modifier } from '../types';

interface CartContextType {
    cart: OrderItem[];
    addToCart: (product: Product, quantity: number, modifiers: Modifier[]) => void;
    removeFromCart: (productId: string) => void;
    clearCart: () => void;
    totalItems: number;
    totalPrice: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [cart, setCart] = useState<OrderItem[]>([]);

    const addToCart = (product: Product, quantity: number, modifiers: Modifier[]) => {
        setCart(prev => {
            const existing = prev.find(item =>
                item.productId === product.id &&
                JSON.stringify(item.modifiers) === JSON.stringify(modifiers)
            );

            if (existing) {
                return prev.map(item =>
                    item.productId === product.id ? { ...item, quantity: item.quantity + quantity } : item
                );
            }

            return [...prev, {
                productId: product.id,
                name: product.name,
                price: product.price,
                quantity,
                modifiers
            }];
        });
    };

    const removeFromCart = (productId: string) => {
        setCart(prev => prev.filter(item => item.productId !== productId));
    };

    const clearCart = () => setCart([]);

    const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);
    const totalPrice = cart.reduce((acc, item) => {
        const modifiersTotal = item.modifiers.reduce((sum, mod) => sum + mod.price, 0);
        return acc + (item.price + modifiersTotal) * item.quantity;
    }, 0);

    return (
        <CartContext.Provider value={{ cart, addToCart, removeFromCart, clearCart, totalItems, totalPrice }}>
            {children}
        </CartContext.Provider>
    );
};

export const useCart = () => {
    const context = useContext(CartContext);
    if (!context) throw new Error('useCart must be used within a CartProvider');
    return context;
};
