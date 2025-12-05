-- Allow public checkout to create orders safely without RLS conflicts
GRANT INSERT ON orders TO anon, authenticated;
GRANT INSERT ON order_items TO anon, authenticated;

REVOKE SELECT, UPDATE, DELETE ON orders FROM anon, authenticated;
REVOKE SELECT, UPDATE, DELETE ON order_items FROM anon, authenticated;

ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE order_items DISABLE ROW LEVEL SECURITY;