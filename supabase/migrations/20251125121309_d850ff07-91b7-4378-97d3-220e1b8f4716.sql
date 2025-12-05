-- Add parent_id column to support nested elements
ALTER TABLE landing_page_elements 
ADD COLUMN parent_id UUID REFERENCES landing_page_elements(id) ON DELETE CASCADE;

-- Add index for better query performance
CREATE INDEX idx_landing_page_elements_parent_id ON landing_page_elements(parent_id);