-- Enable RLS on scheduled_broadcasts
ALTER TABLE scheduled_broadcasts ENABLE ROW LEVEL SECURITY;

-- Users can insert their own broadcasts
CREATE POLICY "Users can insert their own broadcasts"
ON scheduled_broadcasts
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can view their own broadcasts
CREATE POLICY "Users can view their own broadcasts"
ON scheduled_broadcasts
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can update their own broadcasts
CREATE POLICY "Users can update their own broadcasts"
ON scheduled_broadcasts
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Users can delete their own broadcasts
CREATE POLICY "Users can delete their own broadcasts"
ON scheduled_broadcasts
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);