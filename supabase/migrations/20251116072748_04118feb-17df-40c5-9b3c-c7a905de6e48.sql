-- Create function to send notification via edge function
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

  -- Make HTTP request to edge function
  PERFORM net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/send-notification-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.supabase_anon_key')
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

-- Create trigger for flow executions
DROP TRIGGER IF EXISTS trigger_notify_flow_execution ON flow_executions;
CREATE TRIGGER trigger_notify_flow_execution
  AFTER INSERT ON flow_executions
  FOR EACH ROW
  EXECUTE FUNCTION notify_user_event();

-- Create trigger for orders
DROP TRIGGER IF EXISTS trigger_notify_order ON orders;
CREATE TRIGGER trigger_notify_order
  AFTER INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION notify_user_event();

-- Create trigger for subscribers
DROP TRIGGER IF EXISTS trigger_notify_subscriber ON subscribers;
CREATE TRIGGER trigger_notify_subscriber
  AFTER INSERT ON subscribers
  FOR EACH ROW
  EXECUTE FUNCTION notify_user_event();