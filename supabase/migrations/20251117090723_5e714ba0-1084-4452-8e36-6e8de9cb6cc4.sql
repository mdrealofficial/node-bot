-- Add max image size configuration to admin_config
ALTER TABLE admin_config 
ADD COLUMN IF NOT EXISTS max_image_size_mb INTEGER DEFAULT 5;

COMMENT ON COLUMN admin_config.max_image_size_mb IS 'Maximum image upload size in megabytes for flow images';