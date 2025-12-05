-- Rename and restructure automation_rules for match/no-match logic
ALTER TABLE automation_rules 
  RENAME COLUMN follower_dm TO match_dm;

ALTER TABLE automation_rules 
  RENAME COLUMN non_follower_dm TO no_match_dm;

-- Update comments_log to remove is_follower column as it's no longer needed
ALTER TABLE comments_log 
  DROP COLUMN IF EXISTS is_follower;

-- Add comment to clarify the new logic
COMMENT ON COLUMN automation_rules.match_dm IS 'DM sent when comment matches the keyword';
COMMENT ON COLUMN automation_rules.no_match_dm IS 'DM sent when comment does not match the keyword';