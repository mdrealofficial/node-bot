import { createContext, useContext, useState, useEffect } from 'react';

interface CartItem {
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  imageUrl: string | null;
  maxStock: number;
  attributes?: string;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'quantity'>) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  getTotalItems: () => number;
  getTotalPrice: () => number;
  storeSlug: string | null;
  setStoreSlug: (slug: string) => void;
  couponCode: string | null;
  setCouponCode: (code: string | null) => void;
  discountAmount: number;
  setDiscountAmount: (amount: number) => void;
  deliveryLocation: 'inside_dhaka' | 'outside_dhaka' | null;
  setDeliveryLocation: (location: 'inside_dhaka' | 'outside_dhaka' | null) => void;
  shippingCharge: number;
  setShippingCharge: (charge: number) => void;
  isFreeShipping: boolean;
  setIsFreeShipping: (free: boolean) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [storeSlug, setStoreSlug] = useState<string | null>(null);
  const [couponCode, setCouponCode] = useState<string | null>(null);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [deliveryLocation, setDeliveryLocation] = useState<'inside_dhaka' | 'outside_dhaka' | null>(null);
  const [shippingCharge, setShippingCharge] = useState<number>(0);
  const [isFreeShipping, setIsFreeShipping] = useState<boolean>(false);

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem('shopping_cart');
    const savedSlug = localStorage.getItem('cart_store_slug');
    const savedCoupon = localStorage.getItem('cart_coupon_code');
    const savedDiscount = localStorage.getItem('cart_discount_amount');
    const savedLocation = localStorage.getItem('cart_delivery_location');
    const savedShipping = localStorage.getItem('cart_shipping_charge');
    
    if (savedCart) {
      try {
        setItems(JSON.parse(savedCart));
      } catch (error) {
        console.error('Failed to parse cart from localStorage');
      }
    }
    
    if (savedSlug) {
      setStoreSlug(savedSlug);
    }
    
    if (savedCoupon) {
      setCouponCode(savedCoupon);
    }
    
    if (savedDiscount) {
      setDiscountAmount(parseFloat(savedDiscount));
    }

    if (savedLocation) {
      setDeliveryLocation(savedLocation as 'inside_dhaka' | 'outside_dhaka');
    }

    if (savedShipping) {
      setShippingCharge(parseFloat(savedShipping));
    }
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('shopping_cart', JSON.stringify(items));
    if (storeSlug) {
      localStorage.setItem('cart_store_slug', storeSlug);
    }
    if (couponCode) {
      localStorage.setItem('cart_coupon_code', couponCode);
    } else {
      localStorage.removeItem('cart_coupon_code');
    }
    localStorage.setItem('cart_discount_amount', discountAmount.toString());
    
    if (deliveryLocation) {
      localStorage.setItem('cart_delivery_location', deliveryLocation);
    } else {
      localStorage.removeItem('cart_delivery_location');
    }
    
    localStorage.setItem('cart_shipping_charge', shippingCharge.toString());
  }, [items, storeSlug, couponCode, discountAmount, deliveryLocation, shippingCharge]);

  const addItem = (newItem: Omit<CartItem, 'quantity'>) => {
    setItems(currentItems => {
      const existingItem = currentItems.find(item => item.productId === newItem.productId);
      
      if (existingItem) {
        // Increase quantity if item already exists
        return currentItems.map(item =>
          item.productId === newItem.productId
            ? { ...item, quantity: Math.min(item.quantity + 1, item.maxStock) }
            : item
        );
      } else {
        // Add new item with quantity 1
        return [...currentItems, { ...newItem, quantity: 1 }];
      }
    });
  };

  const removeItem = (productId: string) => {
    setItems(currentItems => currentItems.filter(item => item.productId !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(productId);
      return;
    }

    setItems(currentItems =>
      currentItems.map(item =>
        item.productId === productId
          ? { ...item, quantity: Math.min(quantity, item.maxStock) }
          : item
      )
    );
  };

  const clearCart = () => {
    setItems([]);
    setStoreSlug(null);
    setCouponCode(null);
    setDiscountAmount(0);
    setDeliveryLocation(null);
    setShippingCharge(0);
    setIsFreeShipping(false);
    localStorage.removeItem('shopping_cart');
    localStorage.removeItem('cart_store_slug');
    localStorage.removeItem('cart_coupon_code');
    localStorage.removeItem('cart_discount_amount');
    localStorage.removeItem('cart_delivery_location');
    localStorage.removeItem('cart_shipping_charge');
    localStorage.removeItem('cart_free_shipping');
  };

  const getTotalItems = () => {
    return items.reduce((total, item) => total + item.quantity, 0);
  };

  const getTotalPrice = () => {
    return items.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        getTotalItems,
        getTotalPrice,
        storeSlug,
        setStoreSlug,
        couponCode,
        setCouponCode,
        discountAmount,
        setDiscountAmount,
        deliveryLocation,
        setDeliveryLocation,
        shippingCharge,
        setShippingCharge,
        isFreeShipping,
        setIsFreeShipping,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
