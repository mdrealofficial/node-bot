-- Ensure chat-attachments bucket exists and is public
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-attachments', 'chat-attachments', true)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public;

-- Allow public read access to chat attachments (needed for Facebook/Instagram to fetch media)
CREATE POLICY "Chat attachments public read"
ON storage.objects
FOR SELECT
USING (bucket_id = 'chat-attachments');

-- Allow authenticated users to upload chat attachments
CREATE POLICY "Chat attachments user upload"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'chat-attachments');
