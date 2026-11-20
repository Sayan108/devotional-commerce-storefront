import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { request, useApi } from "./api";

function useRemembered(key, fallback, restore = value => value ?? fallback) {
  const [value, setValue] = useState(() => {
    try { return restore(JSON.parse(localStorage.getItem(key))); }
    catch { return fallback; }
  });
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage is optional */ }
  }, [key, value]);
  return [value, setValue];
}

function readBag(value) {
  const items = Array.isArray(value) ? value : value?.items;
  return {
    items: Array.isArray(items) ? items.filter(line => typeof line?.id === "string").map(line => ({
      id: line.id, quantity: Math.max(1, Math.min(10, Math.trunc(Number(line.quantity) || 1))),
      ...(line.kind === "plan" && { kind: "plan" })
    })) : [],
    pending: Array.isArray(value?.pending) ? value.pending : [],
    settled: Array.isArray(value?.settled) ? value.settled : []
  };
}

const Store = createContext(null);
export const useStore = () => useContext(Store);

export function StoreProvider({ children }) {
  const [bag, setBag] = useRemembered("arghya-bag", { items: [], pending: [], settled: [] }, readBag);
  const [guestSaved, setGuestSaved] = useRemembered("arghya-saved", [], value => Array.isArray(value) ? value.filter(id => typeof id === "string") : []);
  const [location, setLocation] = useRemembered("arghya-delivery-area", null);
  const [identity, setIdentity] = useState(null);
  const session = useApi("/auth/session");
  const buyer = identity || session.data;
  const [wishlist, setWishlist] = useState(null);
  const [wishlistVersion, refreshWishlist] = useState(0);
  const wishlistAction = useRef(false);
  const [notice, setNotice] = useState(null);
  const announce = (message, to, label) => setNotice({ message, to, label });
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 3800);
    return () => clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    if (!buyer?.account) {
      setWishlist(null);
      return;
    }
    const controller = new AbortController();
    const merge = guestSaved.length > 0;
    request("/wishlist", {
      signal: controller.signal,
      ...(merge && { method: "POST", body: { ids: guestSaved.slice(0, 100) } })
    }).then(({ items }) => {
      if (!controller.signal.aborted) {
        setWishlist({ phone: buyer.phone, items });
        if (merge) setGuestSaved([]);
      }
    }).catch(error => {
      if (!controller.signal.aborted) announce(error.message);
    });
    return () => controller.abort();
  }, [buyer?.account, buyer?.phone, wishlistVersion]);

  function add(product, variant, quantity = 1, showMessage = true) {
    const limit = Math.min(variant.stock, 10);
    const existing = bag.items.find(line => line.id === variant.id);
    if ((existing?.quantity || 0) + quantity > limit) {
      announce(limit ? "Your bag already has the available quantity." : "This item is sold out.", "/bag", "View bag");
      return false;
    }
    setBag(previous => {
      const current = previous.items.find(line => line.id === variant.id);
      const items = current ? previous.items.map(line => line.id === variant.id ? {
        ...line, quantity: Math.min(limit, line.quantity + quantity)
      } : line) : [...previous.items, { id: variant.id, quantity }];
      return { ...previous, items };
    });
    if (showMessage) announce(product.name + " added to bag.", "/bag", "View bag");
    return true;
  }

  function updateQuantity(id, quantity) {
    setBag(previous => ({
      ...previous,
      items: quantity <= 0 ? previous.items.filter(line => line.id !== id) :
        previous.items.map(line => line.id === id ? { ...line, quantity: Math.min(10, quantity) } : line)
    }));
  }

  function rememberCheckout(order) {
    if (order.planId) return;
    setBag(previous => previous.pending.includes(order.orderRef) || previous.settled.includes(order.orderRef) ? previous :
      { ...previous, pending: [...previous.pending, order.orderRef] });
  }

  function settle(order) {
    if (order.paymentStatus !== "paid") return;
    setBag(previous => {
      if (order.planId) {
        const items = previous.items.filter(line => line.kind !== "plan" || line.id !== order.planId);
        return items.length === previous.items.length ? previous : { ...previous, items };
      }
      if (!previous.pending.includes(order.orderRef)) return previous;
      const paid = Object.fromEntries(order.lines.map(line => [line.id, line.quantity]));
      return {
        items: previous.items.map(line => ({ ...line, quantity: line.quantity - (paid[line.id] || 0) })).filter(line => line.quantity > 0),
        pending: previous.pending.filter(ref => ref !== order.orderRef),
        settled: [...previous.settled, order.orderRef]
      };
    });
  }

  const saved = buyer?.account ? (wishlist?.phone === buyer.phone ? wishlist.items : []) : guestSaved;
  async function toggleSaved(id) {
    if (!buyer?.account) {
      setGuestSaved(previous => previous.includes(id) ? previous.filter(item => item !== id) : [...previous, id]);
      return;
    }
    if (wishlistAction.current) return;
    if (wishlist?.phone !== buyer.phone) {
      refreshWishlist(version => version + 1);
      announce("Loading your saved items.");
      return;
    }
    wishlistAction.current = true;
    try {
      const result = saved.includes(id)
        ? await request("/wishlist/" + encodeURIComponent(id), { method: "DELETE" })
        : await request("/wishlist", { method: "POST", body: { ids: [id] } });
      setWishlist({ phone: buyer.phone, items: result.items });
    } catch (error) {
      announce(error.message);
    } finally {
      wishlistAction.current = false;
    }
  }
  return <Store.Provider value={{
    bag: bag.items, add, updateQuantity, rememberCheckout, settle, saved, toggleSaved,
    location, setLocation, buyer, authError: identity ? null : session.error,
    setIdentity, announce
  }}>
    {children}
    {notice && <div className="toast" role="status"><span>{notice.message}</span>{notice.to && <Link to={notice.to}>{notice.label}</Link>}</div>}
  </Store.Provider>;
}

export function useBagCatalog() {
  const { bag } = useStore();
  const listing = useApi("/products");
  const index = new Map(listing.data?.items.flatMap(product => product.variants.map(variant => [variant.id, { product, variant }])));
  return {
    ...listing,
    lines: bag.filter(line => line.kind !== "plan").map(line => ({ ...line, ...index.get(line.id) })),
    legacy: bag.find(line => line.kind === "plan")
  };
}
