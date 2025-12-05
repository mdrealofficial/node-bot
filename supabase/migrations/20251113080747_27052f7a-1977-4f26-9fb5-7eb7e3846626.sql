-- Add post_id column to automation_rules
ALTER TABLE automation_rules 
ADD COLUMN post_id text;

-- Add comment for clarity
COMMENT ON COLUMN automation_rules.post_id IS 'Facebook post ID. NULL means rule applies globally to all posts';