-- Make dm_message nullable in instagram_comment_triggers to allow templates without DM automation
ALTER TABLE instagram_comment_triggers
ALTER COLUMN dm_message DROP NOT NULL;