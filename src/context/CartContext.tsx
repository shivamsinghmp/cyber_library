"use client";

import { createContext, useCallback, useContext, useState } from "react";

const CART_KEY = "vl_cart";

export type CartItem = {
  slotId: string;
  name: string;
  timeLabel: string;
  price: number;
  roomId?: string | null;
};

function getStoredCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CART_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveCart(items: CartItem[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
  } catch {
    // ignore
  }
}

type CartContextValue = {
  items: CartItem[];
  count: number;
  addItem: (item: CartItem) => void;
  removeItem: (slotId: string) => void;
  clear: () => void;
  isInCart: (slotId: string) => boolean;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    if (typeof window !== "undefined") {
      return getStoredCart();
    }
    return [];
  });

  const addItem = useCallback((item: CartItem) => {
    setItems((prev) => {
      if (prev.some((i) => i.slotId === item.slotId)) return prev;
      const next = [...prev, item];
      saveCart(next);
      return next;
    });
  }, []);

  const removeItem = useCallback((slotId: string) => {
    setItems((prev) => {
      const next = prev.filter((i) => i.slotId !== slotId);
      saveCart(next);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setItems([]);
    saveCart([]);
  }, []);

  const isInCart = useCallback(
    (slotId: string) => items.some((i) => i.slotId === slotId),
    [items]
  );

  const value: CartContextValue = {
    items,
    count: items.length,
    addItem,
    removeItem,
    clear,
    isInCart,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
