-- Create backups tracking table
CREATE TABLE IF NOT EXISTS public.backups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename TEXT NOT NULL,
  backup_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  file_size BIGINT,
  tables_count INTEGER,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.backups ENABLE ROW LEVEL SECURITY;

-- Admins can view all backups
CREATE POLICY "Admins can view all backups"
  ON public.backups
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Admins can insert backups
CREATE POLICY "Admins can insert backups"
  ON public.backups
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Admins can delete backups
CREATE POLICY "Admins can delete backups"
  ON public.backups
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Create index for faster queries
CREATE INDEX idx_backups_created_by ON public.backups(created_by);
CREATE INDEX idx_backups_backup_date ON public.backups(backup_date DESC);