import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { CartProvider, useCart, CART_STORAGE_KEY } from './cart';

describe('Cart Context & Hook', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <CartProvider>{children}</CartProvider>
  );

  it('initializes with empty cart and totalCount 0', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    expect(result.current.items).toEqual([]);
    expect(result.current.totalCount).toBe(0);
    expect(result.current.isLoaded).toBe(true);
  });

  it('restores existing items from localStorage', () => {
    window.localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify([
        { productId: 'prod-1', quantity: 2 },
        { productId: 'prod-2', quantity: 3 },
      ]),
    );

    const { result } = renderHook(() => useCart(), { wrapper });
    expect(result.current.items).toHaveLength(2);
    expect(result.current.totalCount).toBe(5);
  });

  it('handles invalid or corrupted JSON in localStorage gracefully without throwing', () => {
    window.localStorage.setItem(CART_STORAGE_KEY, 'invalid-json{{{');
    const { result } = renderHook(() => useCart(), { wrapper });
    expect(result.current.items).toEqual([]);
    expect(result.current.totalCount).toBe(0);
  });

  it('adds items and increments quantities correctly', () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => {
      result.current.addToCart('prod-1', 2);
    });

    expect(result.current.items).toEqual([{ productId: 'prod-1', quantity: 2 }]);
    expect(result.current.totalCount).toBe(2);

    // Add same product
    act(() => {
      result.current.addToCart('prod-1', 3);
    });

    expect(result.current.items).toEqual([{ productId: 'prod-1', quantity: 5 }]);
    expect(result.current.totalCount).toBe(5);

    // Add different product
    act(() => {
      result.current.addToCart('prod-2', 1);
    });

    expect(result.current.items).toHaveLength(2);
    expect(result.current.totalCount).toBe(6);

    // Check localStorage
    const saved = JSON.parse(window.localStorage.getItem(CART_STORAGE_KEY)!);
    expect(saved).toEqual([
      { productId: 'prod-1', quantity: 5 },
      { productId: 'prod-2', quantity: 1 },
    ]);
  });

  it('updates quantity and removes item if quantity <= 0', () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => {
      result.current.addToCart('prod-1', 4);
    });

    act(() => {
      result.current.updateQuantity('prod-1', 2);
    });
    expect(result.current.items[0].quantity).toBe(2);

    // Set to 0 -> removes from cart
    act(() => {
      result.current.updateQuantity('prod-1', 0);
    });
    expect(result.current.items).toHaveLength(0);
    expect(result.current.totalCount).toBe(0);
  });

  it('removes item directly via removeFromCart', () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => {
      result.current.addToCart('prod-1', 2);
      result.current.addToCart('prod-2', 1);
    });

    act(() => {
      result.current.removeFromCart('prod-1');
    });

    expect(result.current.items).toEqual([{ productId: 'prod-2', quantity: 1 }]);
    expect(result.current.totalCount).toBe(1);
  });

  it('clears all items in cart', () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => {
      result.current.addToCart('prod-1', 2);
      result.current.addToCart('prod-2', 1);
    });

    act(() => {
      result.current.clearCart();
    });

    expect(result.current.items).toEqual([]);
    expect(result.current.totalCount).toBe(0);
    expect(JSON.parse(window.localStorage.getItem(CART_STORAGE_KEY)!)).toEqual([]);
  });
});
