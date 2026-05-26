import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';

const CartContext = createContext(null);
const BASE_STORAGE_KEY = 'store_cart';

export const CartProvider = ({ children }) => {
    const { user } = useAuth();
    const storageKey = user ? `${BASE_STORAGE_KEY}_${user.userId}` : `${BASE_STORAGE_KEY}_guest`;

    const [items, setItems] = useState([]);
    const [loadedKey, setLoadedKey] = useState(null);

    useEffect(() => {
        const stored = localStorage.getItem(storageKey);
        setItems(stored ? JSON.parse(stored) : []);
        setLoadedKey(storageKey);
    }, [storageKey]);

    useEffect(() => {
        if (loadedKey === storageKey) {
            localStorage.setItem(storageKey, JSON.stringify(items));
        }
    }, [items, storageKey, loadedKey]);

    const addItem = (product, quantity = 1) => {
        setItems((currentItems) => {
            const existing = currentItems.find((item) => item.productId === product.id);
            if (existing) {
                return currentItems.map((item) =>
                    item.productId === product.id
                        ? { ...item, quantity: Math.min(item.quantity + quantity, product.stock || item.quantity + quantity) }
                        : item
                );
            }

            return [
                ...currentItems,
                {
                    productId: product.id,
                    quantity: Math.min(quantity, product.stock || quantity),
                    product,
                },
            ];
        });
    };

    const updateQuantity = (productId, quantity) => {
        setItems((currentItems) =>
            currentItems
                .map((item) => {
                    if (item.productId === productId) {
                        const maxStock = item.product?.stock ?? quantity;
                        const validQuantity = Math.min(Math.max(1, quantity), maxStock);
                        return { ...item, quantity: validQuantity };
                    }
                    return item;
                })
                .filter((item) => item.quantity > 0)
        );
    };

    const removeItem = (productId) => {
        setItems((currentItems) => currentItems.filter((item) => item.productId !== productId));
    };

    const clearCart = () => setItems([]);

    const totals = useMemo(() => {
        const count = items.reduce((sum, item) => sum + item.quantity, 0);
        const amount = items.reduce((sum, item) => sum + (item.product?.price || 0) * item.quantity, 0);
        return { count, amount };
    }, [items]);

    return (
        <CartContext.Provider
            value={{
                items,
                addItem,
                updateQuantity,
                removeItem,
                clearCart,
                itemCount: totals.count,
                totalAmount: totals.amount,
            }}
        >
            {children}
        </CartContext.Provider>
    );
};

export const useCart = () => {
    const context = useContext(CartContext);
    if (!context) {
        throw new Error('useCart must be used within CartProvider');
    }
    return context;
};
