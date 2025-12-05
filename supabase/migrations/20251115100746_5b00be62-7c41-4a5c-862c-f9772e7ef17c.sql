-- Drop the existing check constraint
ALTER TABLE comment_reply_templates 
DROP CONSTRAINT IF EXISTS comment_reply_templates_template_type_check;

-- Add the updated check constraint to allow all three template types
ALTER TABLE comment_reply_templates
ADD CONSTRAINT comment_reply_templates_template_type_check 
CHECK (template_type IN ('individual_post', 'full_page', 'general'));