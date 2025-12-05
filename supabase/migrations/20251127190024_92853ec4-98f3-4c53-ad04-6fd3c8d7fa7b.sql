-- Add top-up credits tracking to subscriptions
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS topup_credits_remaining integer DEFAULT 0;

-- Create quota top-up packages table
CREATE TABLE IF NOT EXISTS quota_topup_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  credits integer NOT NULL,
  price numeric NOT NULL,
  currency text DEFAULT 'USD',
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create quota top-up purchases tracking
CREATE TABLE IF NOT EXISTS quota_topup_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  package_id uuid NOT NULL REFERENCES quota_topup_packages(id),
  credits_purchased integer NOT NULL,
  credits_remaining integer NOT NULL,
  amount_paid numeric NOT NULL,
  currency text NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  payment_transaction_id uuid REFERENCES payment_transactions(id),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT quota_topup_purchases_user_id_check CHECK (user_id IS NOT NULL)
);

-- Enable RLS
ALTER TABLE quota_topup_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE quota_topup_purchases ENABLE ROW LEVEL SECURITY;

-- RLS Policies for quota_topup_packages
CREATE POLICY "Anyone can view active topup packages"
  ON quota_topup_packages FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage topup packages"
  ON quota_topup_packages FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for quota_topup_purchases
CREATE POLICY "Users can view their own topup purchases"
  ON quota_topup_purchases FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own topup purchases"
  ON quota_topup_purchases FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Insert default top-up packages
INSERT INTO quota_topup_packages (name, credits, price, display_order) VALUES
  ('Small Boost', 500, 5, 1),
  ('Medium Boost', 1000, 9, 2),
  ('Large Boost', 2500, 20, 3),
  ('Mega Boost', 5000, 35, 4)
ON CONFLICT DO NOTHING;