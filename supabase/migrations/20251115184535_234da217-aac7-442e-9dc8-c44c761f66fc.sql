-- Create storage bucket for product images if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('products', 'products', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for product images storage
CREATE POLICY "Anyone can view product images"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'products');

CREATE POLICY "Store owners can upload product images"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'products' 
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "Store owners can update their product images"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'products' 
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "Store owners can delete their product images"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'products' 
    AND auth.uid() IS NOT NULL
  );