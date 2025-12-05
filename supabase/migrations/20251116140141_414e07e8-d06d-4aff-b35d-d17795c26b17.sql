-- Create storage bucket for flow builder images
INSERT INTO storage.buckets (id, name, public)
VALUES ('flow-images', 'flow-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for flow-images bucket
CREATE POLICY "Authenticated users can upload flow images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'flow-images');

CREATE POLICY "Anyone can view flow images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'flow-images');

CREATE POLICY "Users can update their own flow images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'flow-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own flow images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'flow-images' AND auth.uid()::text = (storage.foldername(name))[1]);