import { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import type { Order, OrderItem } from '../types';

export const useOrder = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const submitOrder = async (items: OrderItem[], totalAmount: number) => {
        setLoading(true);
        setError(null);
        try {
            const orderData: Order = {
                ticketNumber: Math.floor(1000 + Math.random() * 9000).toString(), // Simple random ticket
                items,
                totalAmount,
                status: 'Pending',
                customerEmail: 'guest@example.com', // In a real app, use auth user
                createdAt: serverTimestamp(),
                orderType: 'Dine-in'
            };

            await addDoc(collection(db, 'orders'), orderData);
            return true;
        } catch (err) {
            console.error("Error submitting order:", err);
            setError("Failed to submit order. Please try again.");
            return false;
        } finally {
            setLoading(false);
        }
    };

    return { submitOrder, loading, error };
};
