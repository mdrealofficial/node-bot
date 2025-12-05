-- Create enum for product types
CREATE TYPE product_type AS ENUM ('digital', 'physical', 'both');

-- Create enum for order status
CREATE TYPE order_status AS ENUM ('pending', 'paid', 'partially_paid', 'processing', 'shipped', 'completed', 'cancelled');

-- Create stores table
CREATE TABLE stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create categories table
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create products table
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  product_type product_type NOT NULL DEFAULT 'physical',
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  stock_quantity INTEGER DEFAULT 0,
  digital_file_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create product variations table
CREATE TABLE product_variations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sku TEXT,
  price_modifier DECIMAL(10, 2) DEFAULT 0,
  stock_quantity INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create orders table
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  shipping_address TEXT,
  total_amount DECIMAL(10, 2) NOT NULL,
  paid_amount DECIMAL(10, 2) DEFAULT 0,
  status order_status DEFAULT 'pending',
  payment_method TEXT,
  stripe_payment_id TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create order items table
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  variation_id UUID REFERENCES product_variations(id),
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL,
  total_price DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variations ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for stores
CREATE POLICY "Users can view their own stores" ON stores FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own stores" ON stores FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own stores" ON stores FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own stores" ON stores FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Anyone can view active stores" ON stores FOR SELECT USING (is_active = true);

-- RLS Policies for categories
CREATE POLICY "Store owners can manage categories" ON categories FOR ALL USING (
  EXISTS (SELECT 1 FROM stores WHERE stores.id = categories.store_id AND stores.user_id = auth.uid())
);
CREATE POLICY "Anyone can view categories" ON categories FOR SELECT USING (true);

-- RLS Policies for products
CREATE POLICY "Store owners can manage products" ON products FOR ALL USING (
  EXISTS (SELECT 1 FROM stores WHERE stores.id = products.store_id AND stores.user_id = auth.uid())
);
CREATE POLICY "Anyone can view active products" ON products FOR SELECT USING (is_active = true);

-- RLS Policies for product_variations
CREATE POLICY "Store owners can manage variations" ON product_variations FOR ALL USING (
  EXISTS (SELECT 1 FROM products JOIN stores ON products.store_id = stores.id 
  WHERE products.id = product_variations.product_id AND stores.user_id = auth.uid())
);
CREATE POLICY "Anyone can view variations" ON product_variations FOR SELECT USING (true);

-- RLS Policies for orders
CREATE POLICY "Store owners can view their orders" ON orders FOR SELECT USING (
  EXISTS (SELECT 1 FROM stores WHERE stores.id = orders.store_id AND stores.user_id = auth.uid())
);
CREATE POLICY "Store owners can update their orders" ON orders FOR UPDATE USING (
  EXISTS (SELECT 1 FROM stores WHERE stores.id = orders.store_id AND stores.user_id = auth.uid())
);
CREATE POLICY "Anyone can create orders" ON orders FOR INSERT WITH CHECK (true);

-- RLS Policies for order_items
CREATE POLICY "Store owners can view order items" ON order_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM orders JOIN stores ON orders.store_id = stores.id 
  WHERE orders.id = order_items.order_id AND stores.user_id = auth.uid())
);
CREATE POLICY "Anyone can create order items" ON order_items FOR INSERT WITH CHECK (true);

-- Create updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_stores_updated_at BEFORE UPDATE ON stores FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create storage bucket for store assets
INSERT INTO storage.buckets (id, name, public) VALUES ('store-assets', 'store-assets', true);

-- Storage policies for store assets
CREATE POLICY "Store owners can upload assets" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'store-assets' AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Store owners can update their assets" ON storage.objects FOR UPDATE USING (
  bucket_id = 'store-assets' AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Store owners can delete their assets" ON storage.objects FOR DELETE USING (
  bucket_id = 'store-assets' AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Anyone can view store assets" ON storage.objects FOR SELECT USING (bucket_id = 'store-assets');