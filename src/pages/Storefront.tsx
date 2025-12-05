import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useCart } from '@/contexts/CartContext';
import { useCustomDomain } from '@/hooks/useCustomDomain';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { 
  Loader2, 
  ShoppingCart, 
  Store as StoreIcon, 
  ArrowLeft, 
  UserCircle, 
  LogOut,
  Search,
  Home,
  ShoppingBag,
  Package,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

import { MobileBottomNav } from '@/components/user/store/MobileBottomNav';
import { formatPrice } from '@/lib/currencyUtils';
import Index from './Index';

interface Store {
  id: string;
  name: string;
  logo_url: string | null;
  favicon_url: string | null;
  description: string | null;
  facebook_pixel_id: string | null;
  google_analytics_id: string | null;
  slug: string;
  currency: string | null;
  products_per_row: number;
  mobile_featured_per_row: number;
  desktop_featured_per_row: number;
  mobile_products_per_row: number;
  desktop_products_per_row: number;
  category_view_type: string;
  delivery_zone_coordinates: { lat: number; lng: number } | null;
  delivery_zone_radius: number | null;
  delivery_zone_method: string | null;
  delivery_zone_polygon: { lat: number; lng: number }[] | null;
  require_location: boolean;
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  product_type: 'digital' | 'physical' | 'both';
  image_url: string | null;
  is_active: boolean;
  stock_quantity: number;
  category_id: string | null;
  categories?: { id: string; name: string };
}

interface Category {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  display_order: number;
}

interface ProductImage {
  id: string;
  image_url: string;
  attribute_combination: Record<string, string>;
  is_primary: boolean;
  display_order: number;
}

export default function Storefront() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { addItem, getTotalItems, setStoreSlug } = useCart();
  const { isCustomDomain, domain, isLoading: domainLoading } = useCustomDomain();
  const [loading, setLoading] = useState(true);
  const [store, setStore] = useState<Store | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [productImages, setProductImages] = useState<Record<string, ProductImage[]>>({});
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [autoAuthChecked, setAutoAuthChecked] = useState(false);
  const [isCategoryListExpanded, setIsCategoryListExpanded] = useState(false);
  const [locationPermissionDenied, setLocationPermissionDenied] = useState(false);
  const [outsideDeliveryZone, setOutsideDeliveryZone] = useState(false);
  const [checkingLocation, setCheckingLocation] = useState(false);

  // Handle auto-authentication from FB/IG links
  const handleAutoAuth = async () => {
    if (autoAuthChecked) return;
    setAutoAuthChecked(true);

    const urlParams = new URLSearchParams(window.location.search);
    const subscriberId = urlParams.get('sub_id');
    const subscriberName = urlParams.get('sub_name');
    const subscriberPic = urlParams.get('sub_pic');
    const platform = urlParams.get('platform');

    if (subscriberId && platform) {
      try {
        // Store subscriber info in localStorage for checkout
        localStorage.setItem('subscriber_info', JSON.stringify({
          id: subscriberId,
          name: subscriberName,
          profile_pic: subscriberPic,
          platform: platform
        }));

        // Auto-authenticate via edge function
        await supabase.functions.invoke('subscriber-auth', {
          body: {
            action: 'auto-auth',
            subscriber_id: subscriberId,
            subscriber_name: subscriberName,
            subscriber_pic: subscriberPic,
            platform: platform
          }
        });

        // Clean URL
        window.history.replaceState({}, '', window.location.pathname);
      } catch (error) {
        console.error('Auto-auth failed:', error);
      }
    }
  };

  useEffect(() => {
    if (!domainLoading) {
      handleAutoAuth();
      loadStorefront();
    }
    
    // Disable pinch zoom and horizontal scroll on mobile
    const viewport = document.querySelector("meta[name=viewport]");
    if (viewport) {
      viewport.setAttribute("content", "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no");
    }
    
    return () => {
      if (viewport) {
        viewport.setAttribute("content", "width=device-width, initial-scale=1.0");
      }
    };
  }, [slug, isCustomDomain, domain, domainLoading]);

  useEffect(() => {
    if (store && store.require_location) {
      if (store.delivery_zone_method === 'radius' && store.delivery_zone_coordinates) {
        checkDeliveryLocation();
      } else if (store.delivery_zone_method === 'manual' && store.delivery_zone_polygon) {
        checkDeliveryLocation();
      }
    }
  }, [store]);


  const checkDeliveryLocation = async () => {
    if (!store?.require_location) return;
    if (store.delivery_zone_method === 'radius' && !store.delivery_zone_coordinates) return;
    if (store.delivery_zone_method === 'manual' && !store.delivery_zone_polygon) return;

    setCheckingLocation(true);
    
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        });
      });

      const userLat = position.coords.latitude;
      const userLng = position.coords.longitude;

      let isInZone = false;

      if (store.delivery_zone_method === 'radius' && store.delivery_zone_coordinates) {
        // Calculate distance using Haversine formula
        const centerLat = (store.delivery_zone_coordinates as any).lat;
        const centerLng = (store.delivery_zone_coordinates as any).lng;
        const R = 6371; // Earth's radius in km
        const dLat = (centerLat - userLat) * Math.PI / 180;
        const dLng = (centerLng - userLng) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(userLat * Math.PI / 180) * Math.cos(centerLat * Math.PI / 180) *
                  Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;

        isInZone = distance <= ((store as any).delivery_zone_radius || 5);
      } else if (store.delivery_zone_method === 'manual' && store.delivery_zone_polygon) {
        // Check if point is inside polygon using ray casting algorithm
        const polygon = store.delivery_zone_polygon as any[];
        let inside = false;
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
          const xi = polygon[i].lat, yi = polygon[i].lng;
          const xj = polygon[j].lat, yj = polygon[j].lng;
          
          const intersect = ((yi > userLng) !== (yj > userLng))
            && (userLat < (xj - xi) * (userLng - yi) / (yj - yi) + xi);
          if (intersect) inside = !inside;
        }
        isInZone = inside;
      }

      setOutsideDeliveryZone(!isInZone);
      setLocationPermissionDenied(false);
    } catch (error) {
      setLocationPermissionDenied(true);
      toast.error('Location access is required to view products');
    } finally {
      setCheckingLocation(false);
    }
  };

  // Set favicon when store is loaded
  useEffect(() => {
    if (store?.favicon_url) {
      let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.getElementsByTagName('head')[0].appendChild(link);
      }
      link.href = store.favicon_url;
    }
  }, [store?.favicon_url]);

  // Load Facebook Pixel
  useEffect(() => {
    if (store?.facebook_pixel_id) {
      (function(f: any, b: any, e: any, v: any, n?: any, t?: any, s?: any) {
        if (f.fbq) return;
        n = f.fbq = function() {
          n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
        };
        if (!f._fbq) f._fbq = n;
        n.push = n;
        n.loaded = !0;
        n.version = '2.0';
        n.queue = [];
        t = b.createElement(e);
        t.async = !0;
        t.src = v;
        s = b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t, s);
      })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');

      (window as any).fbq('init', store.facebook_pixel_id);
      (window as any).fbq('track', 'PageView');

      if (products.length > 0) {
        (window as any).fbq('track', 'ViewContent', {
          content_type: 'product_group',
          content_ids: products.map(p => p.id),
          contents: products.map(p => ({ id: p.id, quantity: 1 })),
        });
      }
    }
  }, [store?.facebook_pixel_id, products]);

  // Load Google Analytics
  useEffect(() => {
    if (store?.google_analytics_id) {
      // Check if already loaded
      if ((window as any).gtag) return;

      // Load gtag.js script
      const script = document.createElement('script');
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${store.google_analytics_id}`;
      document.head.appendChild(script);

      // Initialize gtag
      (window as any).dataLayer = (window as any).dataLayer || [];
      function gtag(...args: any[]) {
        (window as any).dataLayer.push(args);
      }
      (window as any).gtag = gtag;

      gtag('js', new Date());
      gtag('config', store.google_analytics_id, {
        page_path: window.location.pathname,
      });

      // Track page view
      gtag('event', 'page_view', {
        page_title: store.name,
        page_location: window.location.href,
        page_path: window.location.pathname,
      });
    }
  }, [store?.google_analytics_id, store?.name]);

  const loadStorefront = async () => {
    try {
      let storeData;
      let storeError;

      if (isCustomDomain && domain) {
        const result = await supabase
          .from('stores')
          .select('*')
          .eq('custom_domain', domain)
          .eq('custom_domain_verified', true)
          .eq('is_active', true)
          .maybeSingle();
        
        storeData = result.data;
        storeError = result.error;
      } else if (slug) {
        const result = await supabase
          .from('stores')
          .select('*')
          .eq('slug', slug)
          .eq('is_active', true)
          .maybeSingle();
        
        storeData = result.data;
        storeError = result.error;
      } else {
        setLoading(false);
        return;
      }

      if (storeError) throw storeError;
      if (!storeData) {
        toast.error('Store not found');
        setLoading(false);
        return;
      }

      setStore(storeData);
      setStoreSlug(storeData.slug);

      // Load categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .eq('store_id', storeData.id)
        .order('display_order', { ascending: true })
        .order('name', { ascending: true });

      if (categoriesError) throw categoriesError;
      setCategories(categoriesData || []);

      // Load products
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*, categories(id, name)')
        .eq('store_id', storeData.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (productsError) throw productsError;
      setProducts(productsData || []);

      // Load product images
      if (productsData && productsData.length > 0) {
        const productIds = productsData.map(p => p.id);
        const { data: imagesData } = await supabase
          .from('product_images')
          .select('*')
          .in('product_id', productIds)
          .order('display_order', { ascending: true });

        if (imagesData) {
          const groupedImages: Record<string, ProductImage[]> = {};
          imagesData.forEach((img: any) => {
            if (!groupedImages[img.product_id]) {
              groupedImages[img.product_id] = [];
            }
            groupedImages[img.product_id].push({
              ...img,
              attribute_combination: (img.attribute_combination || {}) as Record<string, string>
            });
          });
          setProductImages(groupedImages);
        }
      }
    } catch (error: any) {
      toast.error('Failed to load store');
    } finally {
      setLoading(false);
    }
  };

  const getProductImage = (product: Product): string => {
    const images = productImages[product.id] || [];
    if (images.length === 0) return product.image_url || '/placeholder.svg';
    const primaryImage = images.find(img => img.is_primary);
    return primaryImage?.image_url || images[0]?.image_url || product.image_url || '/placeholder.svg';
  };

  const getGridClass = (): string => {
    const mobilePerRow = store?.mobile_products_per_row || 2;
    const desktopPerRow = store?.desktop_products_per_row || 4;
    
    const mobileClass = mobilePerRow === 1 ? 'grid-cols-1' :
                       mobilePerRow === 2 ? 'grid-cols-2' :
                       mobilePerRow === 3 ? 'grid-cols-3' :
                       mobilePerRow === 4 ? 'grid-cols-4' : 'grid-cols-2';
    
    const desktopClass = desktopPerRow === 1 ? 'md:grid-cols-1' :
                        desktopPerRow === 2 ? 'md:grid-cols-2' :
                        desktopPerRow === 3 ? 'md:grid-cols-3' :
                        desktopPerRow === 4 ? 'md:grid-cols-4' :
                        desktopPerRow === 5 ? 'md:grid-cols-5' :
                        desktopPerRow === 6 ? 'md:grid-cols-6' : 'md:grid-cols-4';
    
    return `grid ${mobileClass} ${desktopClass} gap-2 md:gap-3`;
  };

  const getFeaturedGridClass = (): string => {
    const mobilePerRow = store?.mobile_featured_per_row || 2;
    const desktopPerRow = store?.desktop_featured_per_row || 5;

    const mobileClass = mobilePerRow === 1 ? 'grid-cols-1' :
                       mobilePerRow === 2 ? 'grid-cols-2' :
                       mobilePerRow === 3 ? 'grid-cols-3' :
                       mobilePerRow === 4 ? 'grid-cols-4' : 'grid-cols-2';

    const desktopClass = desktopPerRow === 1 ? 'md:grid-cols-1' :
                        desktopPerRow === 2 ? 'md:grid-cols-2' :
                        desktopPerRow === 3 ? 'md:grid-cols-3' :
                        desktopPerRow === 4 ? 'md:grid-cols-4' :
                        desktopPerRow === 5 ? 'md:grid-cols-5' :
                        desktopPerRow === 6 ? 'md:grid-cols-6' : 'md:grid-cols-5';

    return `grid ${mobileClass} ${desktopClass} gap-2 md:gap-3`;
  };

  const handleAddToCart = (e: React.MouseEvent, product: Product) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (product.stock_quantity === 0) {
      toast.error('Product is out of stock');
      return;
    }

    addItem({
      productId: product.id,
      productName: product.name,
      price: product.price,
      imageUrl: product.image_url,
      maxStock: product.stock_quantity,
    });

    // Track Facebook Pixel AddToCart
    if (store?.facebook_pixel_id && (window as any).fbq) {
      (window as any).fbq('track', 'AddToCart', {
        content_ids: [product.id],
        content_type: 'product',
        value: product.price,
        currency: store.currency || 'BDT',
      });
    }

    // Track Google Analytics AddToCart
    if (store?.google_analytics_id && (window as any).gtag) {
      (window as any).gtag('event', 'add_to_cart', {
        currency: store.currency || 'BDT',
        value: product.price,
        items: [{
          item_id: product.id,
          item_name: product.name,
          price: product.price,
          quantity: 1,
        }],
      });
    }

    toast.success('Added to cart!');
  };

  // Filter products
  const filteredProducts = products.filter((product) => {
    const matchesCategory = !selectedCategory || product.category_id === selectedCategory;
    const matchesSearch = !searchQuery || 
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Get featured products (first 10)
  const featuredProducts = filteredProducts.slice(0, 10);
  
  // Group products by category
  const productsByCategory = categories.reduce((acc, category) => {
    const categoryProducts = filteredProducts.filter(
      (product) => product.category_id === category.id
    );
    if (categoryProducts.length > 0) {
      acc[category.id] = { category, products: categoryProducts };
    }
    return acc;
  }, {} as Record<string, { category: Category; products: Product[] }>);

  const cartItemsCount = getTotalItems();

  if (loading || checkingLocation) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (locationPermissionDenied) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md p-6 text-center">
          <div className="h-12 w-12 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
            <Loader2 className="h-6 w-6 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Location Access Required</h2>
          <p className="text-muted-foreground mb-4">
            This store requires location access to verify delivery availability in your area.
          </p>
          <Button onClick={checkDeliveryLocation}>
            Grant Location Access
          </Button>
        </Card>
      </div>
    );
  }

  if (outsideDeliveryZone) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md p-6 text-center">
          <div className="h-12 w-12 mx-auto mb-4 rounded-full bg-destructive/10 flex items-center justify-center">
            <StoreIcon className="h-6 w-6 text-destructive" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Outside Delivery Area</h2>
          <p className="text-muted-foreground mb-4">
            Unfortunately, we don't deliver to your location yet. Please check back later.
          </p>
        </Card>
      </div>
    );
  }

  if (!store) {
    if (isCustomDomain) {
      return <Index />;
    }
    
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <StoreIcon className="h-16 w-16 text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold mb-2">Store Not Found</h1>
        <p className="text-muted-foreground mb-4">The store you're looking for doesn't exist or is inactive</p>
        <Button asChild>
          <Link to="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Home
          </Link>
        </Button>
      </div>
    );
  }

  const ProductCard = ({ product }: { product: Product }) => (
    <Card className="group overflow-hidden h-full border-border/50 hover:shadow-lg transition-all duration-300 hover:border-primary/50">
      <Link to={`/store/${store.slug}/product/${product.id}`} className="block">
        <div className="relative">
          <div className="aspect-square bg-gradient-to-br from-muted/30 to-muted/10">
            <img
              src={getProductImage(product)}
              alt={product.name}
              className="w-full h-full object-contain p-2 md:p-4 group-hover:scale-105 transition-transform duration-300"
            />
          </div>
          {product.stock_quantity === 0 && (
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center">
              <Badge variant="destructive" className="text-xs md:text-base px-2 py-1 md:px-4 md:py-2">
                Out of Stock
              </Badge>
            </div>
          )}
          {product.stock_quantity > 0 && product.stock_quantity <= 5 && (
            <Badge className="absolute top-1 right-1 md:top-3 md:right-3 bg-orange-500 text-white border-0 text-xs md:text-sm px-1.5 py-0.5 md:px-2 md:py-1">
              Only {product.stock_quantity} left
            </Badge>
          )}
        </div>
      </Link>
      <CardContent className="p-2 md:p-4">
        <Link to={`/store/${store.slug}/product/${product.id}`}>
          <h3 className="font-medium text-xs md:text-sm mb-1 md:mb-2 line-clamp-2 group-hover:text-primary transition-colors min-h-[2rem] md:min-h-[2.5rem]">
            {product.name}
          </h3>
        </Link>
        <div className="flex items-center justify-between mb-2 md:mb-3">
          <p className="text-sm md:text-lg font-bold text-primary">
            {store.currency || 'BDT'} {product.price.toLocaleString()}
          </p>
        </div>
        <div className="flex gap-1 md:gap-2">
          <Button
            onClick={(e) => {
              e.preventDefault();
              handleAddToCart(e, product);
            }}
            disabled={product.stock_quantity === 0}
            variant="outline"
            size="sm"
            className="flex-1 text-xs md:text-sm h-7 md:h-9 px-1 md:px-3"
          >
            <ShoppingCart className="h-3 w-3 md:h-4 md:w-4 md:mr-1" />
            <span className="hidden md:inline">Add</span>
          </Button>
          <Button
            onClick={(e) => {
              e.preventDefault();
              handleAddToCart(e, product);
              setTimeout(() => navigate('/checkout'), 100);
            }}
            disabled={product.stock_quantity === 0}
            size="sm"
            className="flex-1 text-xs md:text-sm h-7 md:h-9 px-1 md:px-3"
          >
            Buy Now
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-muted/30 pb-20 md:pb-0 store-page">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-gradient-to-r from-primary to-primary/90 shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4 mb-3">
            <button 
              onClick={() => {
                setSelectedCategory(null);
                setSearchQuery('');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="flex items-center gap-3 flex-shrink-0 hover:opacity-80 transition-opacity"
            >
              {store.logo_url && (
                <img
                  src={store.logo_url}
                  alt={store.name}
                  className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-md"
                />
              )}
              <div>
                <h1 className="text-xl font-bold text-white">{store.name}</h1>
                {store.description && (
                  <p className="text-xs text-white/80 hidden md:block">{store.description}</p>
                )}
              </div>
            </button>
            
            {/* Search Bar */}
            <div className="relative flex-1 max-w-md hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white h-9 rounded-lg"
              />
            </div>
            
            {/* Desktop Cart */}
            <div className="hidden md:flex items-center gap-3 flex-shrink-0">
              <Link to="/cart">
                <Button variant="secondary" size="sm" className="relative">
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Cart
                  {cartItemsCount > 0 && (
                    <span className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
                      {cartItemsCount}
                    </span>
                  )}
                </Button>
              </Link>
            </div>
          </div>
          
          {/* Category Icons/Cards/List */}
          {categories.length > 0 && (
            <div className="mt-3 py-3 px-4 bg-white/10 backdrop-blur-sm rounded-lg">
              {store?.category_view_type === 'icons' && (
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide justify-center">
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className={`flex flex-col items-center gap-1 min-w-[70px] transition-all ${
                      !selectedCategory ? "opacity-100" : "opacity-60 hover:opacity-90"
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all shadow-sm ${
                      !selectedCategory ? "bg-white scale-105 shadow-md" : "bg-white/10 hover:bg-white/20"
                    }`}>
                      <Package className={`h-5 w-5 ${
                        !selectedCategory ? "text-primary" : "text-white"
                      }`} />
                    </div>
                    <span className={`text-xs font-medium text-center ${
                      !selectedCategory ? "text-white" : "text-white/80"
                    }`}>All</span>
                  </button>
                  {categories.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className={`flex flex-col items-center gap-1 min-w-[70px] transition-all ${
                        selectedCategory === category.id ? "opacity-100" : "opacity-60 hover:opacity-90"
                      }`}
                    >
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden transition-all shadow-sm ${
                        selectedCategory === category.id ? "bg-white scale-105 shadow-md" : "bg-white/10 hover:bg-white/20"
                      }`}>
                        {category.image_url ? (
                          <img
                            src={category.image_url}
                            alt={category.name}
                            className={`w-full h-full object-cover ${
                              selectedCategory === category.id ? "" : "opacity-80"
                            }`}
                          />
                        ) : (
                          <span className={`text-lg font-bold ${
                            selectedCategory === category.id ? "text-primary" : "text-white"
                          }`}>
                            {category.name[0]}
                          </span>
                        )}
                      </div>
                      <span className={`text-xs font-medium text-center line-clamp-1 ${
                        selectedCategory === category.id ? "text-white" : "text-white/80"
                      }`}>{category.name}</span>
                    </button>
                  ))}
                </div>
              )}

              {store?.category_view_type === 'cards' && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className={`p-4 rounded-xl transition-all ${
                      !selectedCategory 
                        ? "bg-white shadow-md scale-105" 
                        : "bg-white/10 hover:bg-white/20"
                    }`}
                  >
                    <div className={`w-16 h-16 mx-auto rounded-lg flex items-center justify-center mb-2 ${
                      !selectedCategory ? "bg-primary/10" : "bg-white/10"
                    }`}>
                      <Package className={`h-8 w-8 ${
                        !selectedCategory ? "text-primary" : "text-white"
                      }`} />
                    </div>
                    <p className={`text-sm font-medium text-center ${
                      !selectedCategory ? "text-foreground" : "text-white"
                    }`}>All Products</p>
                  </button>
                  {categories.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className={`p-4 rounded-xl transition-all ${
                        selectedCategory === category.id 
                          ? "bg-white shadow-md scale-105" 
                          : "bg-white/10 hover:bg-white/20"
                      }`}
                    >
                      <div className={`w-16 h-16 mx-auto rounded-lg overflow-hidden mb-2 flex items-center justify-center ${
                        selectedCategory === category.id ? "bg-primary/10" : "bg-white/10"
                      }`}>
                        {category.image_url ? (
                          <img
                            src={category.image_url}
                            alt={category.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className={`text-2xl font-bold ${
                            selectedCategory === category.id ? "text-primary" : "text-white"
                          }`}>
                            {category.name[0]}
                          </span>
                        )}
                      </div>
                      <p className={`text-sm font-medium text-center line-clamp-2 ${
                        selectedCategory === category.id ? "text-foreground" : "text-white"
                      }`}>{category.name}</p>
                    </button>
                  ))}
                </div>
              )}

              {store?.category_view_type === 'list' && (
                <div className="space-y-2">
                  {/* Collapsible Header */}
                  <button
                    onClick={() => setIsCategoryListExpanded(!isCategoryListExpanded)}
                    className="w-full flex items-center justify-between p-3 rounded-lg bg-white/20 hover:bg-white/30 transition-all"
                  >
                    <span className="text-sm font-semibold text-white">Categories</span>
                    {isCategoryListExpanded ? (
                      <ChevronUp className="h-5 w-5 text-white" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-white" />
                    )}
                  </button>

                  {/* Collapsible Content */}
                  {isCategoryListExpanded && (
                    <div className="space-y-2">
                      <button
                        onClick={() => setSelectedCategory(null)}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${
                          !selectedCategory 
                            ? "bg-white shadow-sm" 
                            : "bg-white/10 hover:bg-white/20"
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          !selectedCategory ? "bg-primary/10" : "bg-white/10"
                        }`}>
                          <Package className={`h-5 w-5 ${
                            !selectedCategory ? "text-primary" : "text-white"
                          }`} />
                        </div>
                        <span className={`text-sm font-medium ${
                          !selectedCategory ? "text-foreground" : "text-white"
                        }`}>All Products</span>
                      </button>
                      {categories.map((category) => (
                        <button
                          key={category.id}
                          onClick={() => setSelectedCategory(category.id)}
                          className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${
                            selectedCategory === category.id 
                              ? "bg-white shadow-sm" 
                              : "bg-white/10 hover:bg-white/20"
                          }`}
                        >
                          <div className={`w-10 h-10 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0 ${
                            selectedCategory === category.id ? "bg-primary/10" : "bg-white/10"
                          }`}>
                            {category.image_url ? (
                              <img
                                src={category.image_url}
                                alt={category.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className={`text-lg font-bold ${
                                selectedCategory === category.id ? "text-primary" : "text-white"
                              }`}>
                                {category.name[0]}
                              </span>
                            )}
                          </div>
                          <span className={`text-sm font-medium ${
                            selectedCategory === category.id ? "text-foreground" : "text-white"
                          }`}>{category.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* Featured Products */}
        {!selectedCategory && featuredProducts.length > 0 && (
          <section className="mb-10">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-8 bg-primary rounded-full"></div>
                <h2 className="text-2xl font-bold">Featured Products</h2>
              </div>
            </div>
            <div className={getFeaturedGridClass()}>
              {featuredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </section>
        )}

        {/* Products by Category */}
        {!selectedCategory && Object.values(productsByCategory).map(({ category, products: categoryProducts }) => (
          <section key={category.id} className="mb-10">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-8 bg-primary rounded-full"></div>
                <h2 className="text-2xl font-bold">{category.name}</h2>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setSelectedCategory(category.id)}
              >
                View All
              </Button>
            </div>
            <div className={getGridClass()}>
              {categoryProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </section>
        ))}

        {/* Filtered Products (when category selected) */}
        {selectedCategory && (
          <div className={getGridClass()}>
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}

        {filteredProducts.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground">No products found</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav
        storeSlug={slug || ''}
        onHomeClick={() => {
          setSelectedCategory(null);
          setSearchQuery('');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />
    </div>
  );
}
