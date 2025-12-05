-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Allow public order creation" ON orders;
DROP POLICY IF EXISTS "Allow public order items creation" ON order_items;

-- Enable RLS on orders and order_items if not already enabled
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert orders (for public checkout)
CREATE POLICY "Allow public order creation" ON orders
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Allow anyone to insert order items (for public checkout)  
CREATE POLICY "Allow public order items creation" ON order_items
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);