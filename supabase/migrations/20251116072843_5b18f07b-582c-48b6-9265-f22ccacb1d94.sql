-- Enable pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Update the notification function to use hardcoded values
CREATE OR REPLACE FUNCTION notify_user_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  notification_payload jsonb;
  page_name_val text;
  flow_name_val text;
BEGIN
  -- Determine notification type and build payload
  IF TG_TABLE_NAME = 'flow_executions' THEN
    -- Get page name and flow name
    SELECT fp.page_name INTO page_name_val
    FROM facebook_pages fp
    WHERE fp.id = NEW.page_id;
    
    SELECT cf.name INTO flow_name_val
    FROM chatbot_flows cf
    WHERE cf.id = NEW.flow_id;
    
    notification_payload := jsonb_build_object(
      'user_id', NEW.user_id,
      'notification_type', 'flow_execution',
      'data', jsonb_build_object(
        'flow_name', flow_name_val,
        'page_name', page_name_val
      )
    );
    
  ELSIF TG_TABLE_NAME = 'orders' THEN
    notification_payload := jsonb_build_object(
      'user_id', (SELECT user_id FROM stores WHERE id = NEW.store_id),
      'notification_type', 'order',
      'data', jsonb_build_object(
        'order_id', NEW.id::text
      )
    );
    
  ELSIF TG_TABLE_NAME = 'subscribers' THEN
    -- Get page name
    SELECT fp.page_name INTO page_name_val
    FROM facebook_pages fp
    WHERE fp.id = NEW.page_id;
    
    notification_payload := jsonb_build_object(
      'user_id', NEW.user_id,
      'notification_type', 'new_subscriber',
      'data', jsonb_build_object(
        'subscriber_name', NEW.subscriber_name,
        'page_name', page_name_val
      )
    );
  END IF;

  -- Make HTTP request to edge function using pg_net
  PERFORM net.http_post(
    url := 'https://dbbntsmjshndkvyrvsad.supabase.co/functions/v1/send-notification-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRiYm50c21qc2huZGt2eXJ2c2FkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5NzQyNTAsImV4cCI6MjA3ODU1MDI1MH0._4GblxbdcI3AYEUCbdRE69p7Px7JWz1cMnxsM4QtlMY'
    ),
    body := notification_payload
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the main operation
    RAISE WARNING 'Error sending notification: %', SQLERRM;
    RETURN NEW;
END;
$$;