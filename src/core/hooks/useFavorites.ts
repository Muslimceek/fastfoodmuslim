import { useState, useEffect } from 'react';
import { doc, setDoc, getDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';

export const useFavorites = () => {
    const { user } = useAuth();
    const [favorites, setFavorites] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) {
            setFavorites([]);
            setLoading(false);
            return;
        }

        const loadFavorites = async () => {
            try {
                const userProfileRef = doc(db, 'userProfiles', user.uid);
                const userProfileSnap = await getDoc(userProfileRef);

                if (userProfileSnap.exists()) {
                    setFavorites(userProfileSnap.data().favoriteProducts || []);
                } else {
                    // Create initial profile
                    await setDoc(userProfileRef, {
                        uid: user.uid,
                        email: user.email,
                        favoriteProducts: [],
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    });
                    setFavorites([]);
                }
            } catch (error) {
                console.error('Error loading favorites:', error);
            } finally {
                setLoading(false);
            }
        };

        loadFavorites();
    }, [user]);

    const toggleFavorite = async (productId: string) => {
        if (!user) return;

        const userProfileRef = doc(db, 'userProfiles', user.uid);
        const isFav = favorites.includes(productId);

        try {
            if (isFav) {
                await updateDoc(userProfileRef, {
                    favoriteProducts: arrayRemove(productId),
                    updatedAt: new Date(),
                });
                setFavorites(prev => prev.filter(id => id !== productId));
            } else {
                await updateDoc(userProfileRef, {
                    favoriteProducts: arrayUnion(productId),
                    updatedAt: new Date(),
                });
                setFavorites(prev => [...prev, productId]);
            }
        } catch (error) {
            console.error('Error toggling favorite:', error);
        }
    };

    const isFavorite = (productId: string) => favorites.includes(productId);

    return { favorites, toggleFavorite, isFavorite, loading };
};
