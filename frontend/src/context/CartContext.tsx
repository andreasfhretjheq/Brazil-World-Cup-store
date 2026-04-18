import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import api, { CartItem } from "../api";
import { useAuth } from "./AuthContext";

interface CartContextType {
  items: CartItem[];
  loading: boolean;
  refresh: () => Promise<void>;
  addItem: (productId: number, quantity: number, size: string) => Promise<void>;
  updateItem: (itemId: number, quantity: number) => Promise<void>;
  removeItem: (itemId: number) => Promise<void>;
  clearCart: () => Promise<void>;
  itemCount: number;
  subtotal: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) {
      setItems([]);
      return;
    }
    setLoading(true);
    try {
      const res = await api.get<CartItem[]>("/cart");
      setItems(res.data);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addItem = async (productId: number, quantity: number, size: string) => {
    await api.post("/cart/items", { product_id: productId, quantity, size });
    await refresh();
  };

  const updateItem = async (itemId: number, quantity: number) => {
    await api.patch(`/cart/items/${itemId}`, { quantity });
    await refresh();
  };

  const removeItem = async (itemId: number) => {
    await api.delete(`/cart/items/${itemId}`);
    await refresh();
  };

  const clearCart = async () => {
    await api.delete("/cart");
    await refresh();
  };

  const itemCount = items.reduce((a, i) => a + i.quantity, 0);
  const subtotal = items.reduce((a, i) => a + i.quantity * i.product.price, 0);

  return (
    <CartContext.Provider
      value={{ items, loading, refresh, addItem, updateItem, removeItem, clearCart, itemCount, subtotal }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart precisa estar dentro de <CartProvider>");
  return ctx;
}
