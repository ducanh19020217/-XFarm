'use client';

import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';

export const CART_STORAGE_KEY = 'xfarm.cart.v1';

export interface CartItem {
  productId: string;
  quantity: number;
}

export interface CartContextValue {
  items: CartItem[];
  totalCount: number;
  isLoaded: boolean;
  addToCart: (productId: string, quantity?: number) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

function loadCartFromStorage(): CartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (item): item is { productId: string; quantity: number } =>
          Boolean(item) &&
          typeof item.productId === 'string' &&
          typeof item.quantity === 'number' &&
          item.quantity > 0,
      )
      .map((item) => ({
        productId: item.productId,
        quantity: Math.max(1, Math.round(item.quantity)),
      }));
  } catch {
    return [];
  }
}

function saveCartToStorage(items: CartItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    const payload = items.map((item) => ({
      productId: item.productId,
      quantity: Math.max(1, Math.round(item.quantity)),
    }));
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Quota exceeded or private browsing restrictions
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Initialize from localStorage after mount
  useEffect(() => {
    const initial = loadCartFromStorage();
    setItems(initial);
    setIsLoaded(true);

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === CART_STORAGE_KEY) {
        setItems(loadCartFromStorage());
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Update storage on item state change (only after initial load)
  const syncItems = useCallback((updater: (prev: CartItem[]) => CartItem[]) => {
    setItems((prev) => {
      const next = updater(prev);
      saveCartToStorage(next);
      return next;
    });
  }, []);

  const addToCart = useCallback(
    (productId: string, quantity: number = 1) => {
      if (!productId || quantity <= 0) return;
      syncItems((prev) => {
        const existingIndex = prev.findIndex((item) => item.productId === productId);
        if (existingIndex >= 0) {
          const next = [...prev];
          next[existingIndex] = {
            productId,
            quantity: next[existingIndex].quantity + quantity,
          };
          return next;
        }
        return [...prev, { productId, quantity }];
      });
    },
    [syncItems],
  );

  const updateQuantity = useCallback(
    (productId: string, quantity: number) => {
      if (!productId) return;
      syncItems((prev) => {
        if (quantity <= 0) {
          return prev.filter((item) => item.productId !== productId);
        }
        return prev.map((item) =>
          item.productId === productId
            ? { ...item, quantity: Math.max(1, Math.round(quantity)) }
            : item,
        );
      });
    },
    [syncItems],
  );

  const removeFromCart = useCallback(
    (productId: string) => {
      if (!productId) return;
      syncItems((prev) => prev.filter((item) => item.productId !== productId));
    },
    [syncItems],
  );

  const clearCart = useCallback(() => {
    syncItems(() => []);
  }, [syncItems]);

  const totalCount = useMemo(() => {
    return items.reduce((sum, item) => sum + item.quantity, 0);
  }, [items]);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      totalCount,
      isLoaded,
      addToCart,
      updateQuantity,
      removeFromCart,
      clearCart,
    }),
    [items, totalCount, isLoaded, addToCart, updateQuantity, removeFromCart, clearCart],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) {
    // Provide a safe fallback if accessed outside provider (e.g., during tests or static rendering)
    return {
      items: [],
      totalCount: 0,
      isLoaded: false,
      addToCart: () => {},
      updateQuantity: () => {},
      removeFromCart: () => {},
      clearCart: () => {},
    };
  }
  return context;
}
