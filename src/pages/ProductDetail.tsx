import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, ShoppingCart, ArrowLeft, Minus, Plus, UserCircle, LogOut } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { CustomerAuthDialog } from '@/components/user/store/CustomerAuthDialog';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { MobileBottomNav } from '@/components/user/store/MobileBottomNav';
import { formatPrice } from '@/lib/currencyUtils';

interface Store {
  id: string;
  name: string;
  logo_url: string | null;
  slug: string;
  facebook_pixel_id: string | null;
  google_analytics_id: string | null;
  currency: string | null;
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
  categories?: { name: string };
}

interface ProductImage {
  id: string;
  image_url: string;
  attribute_combination: Record<string, string>;
  is_primary: boolean;
  display_order: number;
}

interface ProductAttribute {
  id: string;
  name: string;
  values: string[];
  value_prices: any;
  multi_select: boolean;
  optional: boolean;
}

interface ProductAttributeValue {
  attribute_id: string;
  attribute_value: string;
  price_modifier: number;
  product_attributes: ProductAttribute;
}

export default function ProductDetail() {
  const { slug, productId } = useParams();
  const navigate = useNavigate();
  const { addItem, getTotalItems } = useCart();
  const [loading, setLoading] = useState(true);
  const [store, setStore] = useState<Store | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [productAttributes, setProductAttributes] = useState<ProductAttributeValue[]>([]);
  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string>>({});
  const [productImages, setProductImages] = useState<ProductImage[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [customerUser, setCustomerUser] = useState<any>(null);
  const [isGuestMode, setIsGuestMode] = useState(false);
  const [autoAuthChecked, setAutoAuthChecked] = useState(false);

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
    handleAutoAuth();
    loadProductDetail();
    checkCustomerAuth();
    
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
  }, [slug, productId]);

  const checkCustomerAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.user) {
      setCustomerUser(session.user);
    } else {
      const guestMode = localStorage.getItem('guestMode');
      if (guestMode) {
        setIsGuestMode(true);
      }
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setCustomerUser(session.user);
        setIsGuestMode(false);
        localStorage.removeItem('guestMode');
      } else {
        setCustomerUser(null);
      }
    });

    return () => subscription.unsubscribe();
  };

  const handleGuestMode = () => {
    setIsGuestMode(true);
    localStorage.setItem('guestMode', 'true');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCustomerUser(null);
    toast.success('Logged out successfully');
  };

  const loadProductDetail = async () => {
    try {
      // Load store
      const { data: storeData, error: storeError } = await supabase
        .from('stores')
        .select('id, name, logo_url, slug, facebook_pixel_id, google_analytics_id, currency')
        .eq('slug', slug)
        .eq('is_active', true)
        .maybeSingle();

      if (storeError) throw storeError;
      if (!storeData) {
        toast.error('Store not found');
        setLoading(false);
        return;
      }
      setStore(storeData);

      // Load product
      const { data: productData, error: productError } = await supabase
        .from('products')
        .select('*, categories(name)')
        .eq('id', productId)
        .eq('store_id', storeData.id)
        .eq('is_active', true)
        .maybeSingle();

      if (productError) throw productError;
      if (!productData) {
        toast.error('Product not found');
        setLoading(false);
        return;
      }
      setProduct(productData);

      // Load product attributes
      const { data: attrData } = await supabase
        .from('product_attribute_values')
        .select('*, product_attributes(*)')
        .eq('product_id', productId);

      if (attrData) {
        setProductAttributes(attrData);
      }

      // Load product images
      const { data: imagesData } = await supabase
        .from('product_images')
        .select('*')
        .eq('product_id', productId)
        .order('display_order', { ascending: true });

      if (imagesData && imagesData.length > 0) {
        setProductImages(imagesData.map((img: any) => ({
          ...img,
          attribute_combination: (img.attribute_combination || {}) as Record<string, string>
        })));
        setSelectedImage(imagesData[0].image_url);
      } else if (productData.image_url) {
        setSelectedImage(productData.image_url);
      }

      // Track Facebook Pixel ViewContent event
      if (storeData.facebook_pixel_id && (window as any).fbq) {
        (window as any).fbq('track', 'ViewContent', {
          content_ids: [productId],
          content_type: 'product',
          value: productData.price,
          currency: storeData.currency || 'BDT',
        });
      }

      // Track Google Analytics ViewItem event
      if (storeData.google_analytics_id && (window as any).gtag) {
        (window as any).gtag('event', 'view_item', {
          currency: storeData.currency || 'BDT',
          value: productData.price,
          items: [{
            item_id: productId,
            item_name: productData.name,
            price: productData.price,
          }],
        });
      }
    } catch (error: any) {
      console.error('Error loading product:', error);
      toast.error('Failed to load product details');
    } finally {
      setLoading(false);
    }
  };

  const getUniqueAttributes = (): Record<string, ProductAttributeValue[]> => {
    const grouped: Record<string, ProductAttributeValue[]> = {};
    productAttributes.forEach(av => {
      if (!grouped[av.attribute_id]) {
        grouped[av.attribute_id] = [];
      }
      grouped[av.attribute_id].push(av);
    });
    return grouped;
  };

  const calculateProductPrice = (): number => {
    if (!product) return 0;
    let additionalPrice = 0;
    Object.entries(selectedAttributes).forEach(([attrId, value]) => {
      const attrValue = productAttributes.find(a => a.attribute_id === attrId && a.attribute_value === value);
      if (attrValue) {
        additionalPrice += attrValue.price_modifier || 0;
      }
    });
    return product.price + additionalPrice;
  };

  const handleAttributeChange = (attributeId: string, value: string) => {
    setSelectedAttributes(prev => ({
      ...prev,
      [attributeId]: value
    }));

    // Update image based on selected attributes
    const newAttrs = { ...selectedAttributes, [attributeId]: value };
    const matchingImage = productImages.find(img => {
      const imgAttrs = img.attribute_combination;
      if (!imgAttrs || Object.keys(imgAttrs).length === 0) return false;
      return Object.entries(imgAttrs).every(([attrId, val]) => newAttrs[attrId] === val);
    });

    if (matchingImage) {
      setSelectedImage(matchingImage.image_url);
    }
  };

  const handleAddToCart = () => {
    if (!product) return;

    if (product.stock_quantity === 0) {
      toast.error('Product is out of stock');
      return;
    }

    // Check if all required attributes are selected
    const productAttrs = getUniqueAttributes();
    for (const [attrId, attrValues] of Object.entries(productAttrs)) {
      const attr = attrValues[0]?.product_attributes;
      if (attr && !attr.optional && !selectedAttributes[attrId]) {
        toast.error(`Please select ${attr.name}`);
        return;
      }
    }

    const finalPrice = calculateProductPrice();
    const attributeDetails = Object.entries(selectedAttributes).map(([attrId, value]) => {
      const attrValues = productAttrs[attrId];
      const attr = attrValues?.[0]?.product_attributes;
      return attr ? `${attr.name}: ${value}` : '';
    }).filter(Boolean).join(', ');

    for (let i = 0; i < quantity; i++) {
      addItem({
        productId: product.id,
        productName: product.name,
        price: finalPrice,
        imageUrl: selectedImage || product.image_url,
        maxStock: product.stock_quantity,
        attributes: attributeDetails || undefined,
      });
    }

    // Track Facebook Pixel AddToCart event
    if (store?.facebook_pixel_id && (window as any).fbq) {
      (window as any).fbq('track', 'AddToCart', {
        content_ids: [product.id],
        content_type: 'product',
        value: finalPrice * quantity,
        currency: store.currency || 'BDT',
      });
    }

    // Track Google Analytics AddToCart event
    if (store?.google_analytics_id && (window as any).gtag) {
      (window as any).gtag('event', 'add_to_cart', {
        currency: store.currency || 'BDT',
        value: finalPrice * quantity,
        items: [{
          item_id: product.id,
          item_name: product.name,
          price: finalPrice,
          quantity: quantity,
        }],
      });
    }

    toast.success(`Added ${quantity} item(s) to cart!`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!store || !product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <h1 className="text-2xl font-bold mb-2">Product Not Found</h1>
        <p className="text-muted-foreground mb-4">The product you're looking for doesn't exist</p>
        <Button asChild>
          <Link to={`/store/${slug}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Store
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background store-page">
      {/* Customer Auth Dialog */}
      <CustomerAuthDialog
        open={showAuthDialog}
        onClose={() => setShowAuthDialog(false)}
        onGuestMode={handleGuestMode}
        storeName={store?.name || 'Our Store'}
      />

      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" asChild>
                <Link to={`/store/${slug}`}>
                  <ArrowLeft className="h-5 w-5" />
                </Link>
              </Button>
              {store.logo_url && (
                <img src={store.logo_url} alt={store.name} className="h-10 w-10 rounded-lg object-cover" />
              )}
              <div>
                <h1 className="text-xl font-bold">{store.name}</h1>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Customer Auth Status */}
              {customerUser ? (
                <div className="flex items-center gap-2">
                  <div className="text-sm text-muted-foreground hidden sm:block">
                    {customerUser.phone || 'Customer'}
                  </div>
                  <Button variant="ghost" size="sm" onClick={handleLogout}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </Button>
                </div>
              ) : isGuestMode ? (
                <Button variant="ghost" size="sm" onClick={() => setShowAuthDialog(true)}>
                  <UserCircle className="h-4 w-4 mr-2" />
                  Guest
                </Button>
              ) : (
                <Button variant="ghost" size="sm" onClick={() => setShowAuthDialog(true)}>
                  <UserCircle className="h-4 w-4 mr-2" />
                  Sign In
                </Button>
              )}
              <Button asChild variant="outline">
                <Link to="/cart">
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  Cart ({getTotalItems()})
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Product Detail */}
      <main className="container mx-auto px-4 py-6 lg:py-8">
        <div className="grid gap-6 lg:gap-8 md:grid-cols-2">
          {/* Image Gallery */}
          <div className="space-y-3 lg:space-y-4">
            <Card className="overflow-hidden border-0 shadow-lg mx-auto max-w-[320px] sm:max-w-none">
              <AspectRatio ratio={1}>
                <img
                  src={selectedImage || '/placeholder.svg'}
                  alt={product.name}
                  className="w-full h-full object-cover"
                  loading="eager"
                />
              </AspectRatio>
            </Card>
            
            {/* Thumbnails */}
            {productImages.length > 1 && (
              <div className="grid grid-cols-5 sm:grid-cols-6 gap-2">
                {productImages.map((img) => (
                  <button
                    key={img.id}
                    onClick={() => setSelectedImage(img.image_url)}
                    className={`rounded-md overflow-hidden border-2 transition-all ${
                      selectedImage === img.image_url ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <AspectRatio ratio={1}>
                      <img
                        src={img.image_url}
                        alt="Product thumbnail"
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </AspectRatio>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="space-y-4 lg:space-y-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold mb-2 leading-tight">{product.name}</h1>
              {product.categories && (
                <Badge variant="secondary" className="mb-3">{product.categories.name}</Badge>
              )}
              <div className="flex items-baseline gap-2 mb-3">
                <span className="text-3xl sm:text-4xl font-bold text-primary">
                  {formatPrice(calculateProductPrice(), store?.currency || 'USD')}
                </span>
                {calculateProductPrice() !== product.price && (
                  <span className="text-base sm:text-lg text-muted-foreground line-through">
                    {formatPrice(product.price, store?.currency || 'USD')}
                  </span>
                )}
              </div>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">{product.description || 'No description available'}</p>
            </div>

            {/* Attributes */}
            {(() => {
              const productAttrs = getUniqueAttributes();
              const hasAttributes = Object.keys(productAttrs).length > 0;
              
              if (!hasAttributes) return null;
              
              return (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Options</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {Object.entries(productAttrs).map(([attrId, attrValues]) => {
                      const attr = attrValues[0]?.product_attributes;
                      if (!attr) return null;
                      
                      const selectedValue = selectedAttributes[attrId] || '';
                      
                      return (
                        <div key={attrId} className="space-y-2">
                          <Label className="text-sm font-medium">
                            {attr.name}
                            {!attr.optional && <span className="text-destructive ml-1">*</span>}
                          </Label>
                          <Select
                            value={selectedValue}
                            onValueChange={(value) => handleAttributeChange(attrId, value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={`Select ${attr.name}`} />
                            </SelectTrigger>
                            <SelectContent>
                              {attrValues.map((av) => {
                                const priceModifier = av.price_modifier || 0;
                                return (
                                  <SelectItem key={av.attribute_value} value={av.attribute_value}>
                                    {av.attribute_value}
                                    {priceModifier !== 0 && (
                                      <span className="ml-2 text-xs font-semibold text-primary">
                                        ({priceModifier > 0 ? '+' : ''}{formatPrice(Math.abs(priceModifier), store?.currency || 'BDT')})
                                      </span>
                                    )}
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              );
            })()}

            {/* Quantity and Add to Cart */}
            <Card className="sticky top-20">
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Quantity</Label>
                  <div className="flex items-center gap-2">
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-8 w-8"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      disabled={quantity <= 1}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-10 text-center font-semibold text-sm">{quantity}</span>
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-8 w-8"
                      onClick={() => setQuantity(Math.min(product.stock_quantity, quantity + 1))}
                      disabled={quantity >= product.stock_quantity}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                
                <div className="text-xs text-muted-foreground">
                  {product.stock_quantity > 0 ? `${product.stock_quantity} in stock` : 'Out of stock'}
                </div>

                <div className="flex flex-col gap-2">
                  <Button
                    className="w-full"
                    size="lg"
                    variant="outline"
                    onClick={handleAddToCart}
                    disabled={product.stock_quantity === 0}
                  >
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    Add to Cart
                  </Button>
                  <Button
                    className="w-full"
                    size="lg"
                    onClick={() => {
                      handleAddToCart();
                      setTimeout(() => navigate('/checkout'), 100);
                    }}
                    disabled={product.stock_quantity === 0}
                  >
                    Buy Now - {formatPrice(calculateProductPrice() * quantity, store?.currency || 'USD')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav
        storeSlug={slug || ''}
        onHomeClick={() => navigate(`/store/${slug}`)}
      />
    </div>
  );
}
