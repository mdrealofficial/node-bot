-- Enable RLS on new tables
ALTER TABLE store_sms_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_sms_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for store_sms_campaigns
CREATE POLICY "Store owners can view their campaigns"
  ON store_sms_campaigns FOR SELECT
  USING (
    store_id IN (
      SELECT id FROM stores WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Store owners can create campaigns"
  ON store_sms_campaigns FOR INSERT
  WITH CHECK (
    store_id IN (
      SELECT id FROM stores WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Store owners can update their campaigns"
  ON store_sms_campaigns FOR UPDATE
  USING (
    store_id IN (
      SELECT id FROM stores WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Store owners can delete their campaigns"
  ON store_sms_campaigns FOR DELETE
  USING (
    store_id IN (
      SELECT id FROM stores WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for store_sms_logs
CREATE POLICY "Store owners can view their SMS logs"
  ON store_sms_logs FOR SELECT
  USING (
    store_id IN (
      SELECT id FROM stores WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Store owners can create SMS logs"
  ON store_sms_logs FOR INSERT
  WITH CHECK (
    store_id IN (
      SELECT id FROM stores WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage all SMS logs"
  ON store_sms_logs FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');