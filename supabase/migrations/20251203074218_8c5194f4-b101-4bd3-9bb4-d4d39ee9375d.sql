-- Phase 1: Modify store_customers table
-- Make phone nullable (customers can be identified by platform ID first)
ALTER TABLE store_customers ALTER COLUMN phone DROP NOT NULL;

-- Add web_visitor_id for website chat widget customers
ALTER TABLE store_customers ADD COLUMN IF NOT EXISTS web_visitor_id text;

-- Add unique partial indexes for secondary keys (per store)
CREATE UNIQUE INDEX IF NOT EXISTS idx_store_customers_facebook_psid 
  ON store_customers(store_id, facebook_psid) WHERE facebook_psid IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_store_customers_instagram_id 
  ON store_customers(store_id, instagram_id) WHERE instagram_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_store_customers_whatsapp_phone 
  ON store_customers(store_id, whatsapp_phone) WHERE whatsapp_phone IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_store_customers_web_visitor 
  ON store_customers(store_id, web_visitor_id) WHERE web_visitor_id IS NOT NULL;

-- Phase 2: Modify store_customer_addresses table
-- Add receiver name and phone per address (each address can have different receiver)
ALTER TABLE store_customer_addresses 
  ADD COLUMN IF NOT EXISTS receiver_name text,
  ADD COLUMN IF NOT EXISTS receiver_phone text;

-- Phase 3: Create helper function to find or create customer by any identifier
CREATE OR REPLACE FUNCTION find_or_create_store_customer(
  p_store_id UUID,
  p_full_name TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL,
  p_facebook_psid TEXT DEFAULT NULL,
  p_instagram_id TEXT DEFAULT NULL,
  p_whatsapp_phone TEXT DEFAULT NULL,
  p_web_visitor_id TEXT DEFAULT NULL,
  p_profile_pic_url TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_customer_id UUID;
BEGIN
  -- Try to find existing customer by platform IDs first (most specific)
  IF p_facebook_psid IS NOT NULL THEN
    SELECT id INTO v_customer_id FROM store_customers 
    WHERE store_id = p_store_id AND facebook_psid = p_facebook_psid;
  END IF;
  
  IF v_customer_id IS NULL AND p_instagram_id IS NOT NULL THEN
    SELECT id INTO v_customer_id FROM store_customers 
    WHERE store_id = p_store_id AND instagram_id = p_instagram_id;
  END IF;
  
  IF v_customer_id IS NULL AND p_whatsapp_phone IS NOT NULL THEN
    SELECT id INTO v_customer_id FROM store_customers 
    WHERE store_id = p_store_id AND whatsapp_phone = p_whatsapp_phone;
  END IF;
  
  IF v_customer_id IS NULL AND p_web_visitor_id IS NOT NULL THEN
    SELECT id INTO v_customer_id FROM store_customers 
    WHERE store_id = p_store_id AND web_visitor_id = p_web_visitor_id;
  END IF;
  
  -- Fallback: try to find by phone number
  IF v_customer_id IS NULL AND p_phone IS NOT NULL THEN
    SELECT id INTO v_customer_id FROM store_customers 
    WHERE store_id = p_store_id AND phone = p_phone;
  END IF;
  
  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO store_customers (
      store_id, full_name, phone, email, 
      facebook_psid, instagram_id, whatsapp_phone, web_visitor_id, 
      profile_pic_url
    )
    VALUES (
      p_store_id, p_full_name, p_phone, p_email,
      p_facebook_psid, p_instagram_id, p_whatsapp_phone, p_web_visitor_id,
      p_profile_pic_url
    )
    RETURNING id INTO v_customer_id;
  ELSE
    -- Update existing customer with any new info (merge data)
    UPDATE store_customers SET
      full_name = COALESCE(NULLIF(p_full_name, ''), full_name),
      phone = COALESCE(NULLIF(p_phone, ''), phone),
      email = COALESCE(NULLIF(p_email, ''), email),
      facebook_psid = COALESCE(p_facebook_psid, facebook_psid),
      instagram_id = COALESCE(p_instagram_id, instagram_id),
      whatsapp_phone = COALESCE(p_whatsapp_phone, whatsapp_phone),
      web_visitor_id = COALESCE(p_web_visitor_id, web_visitor_id),
      profile_pic_url = COALESCE(NULLIF(p_profile_pic_url, ''), profile_pic_url),
      updated_at = NOW()
    WHERE id = v_customer_id;
  END IF;
  
  RETURN v_customer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;