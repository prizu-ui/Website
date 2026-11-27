-- ============================================================
-- SheBuilds Tamil Nadu Merch Store - Complete Supabase Schema & Seed
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- CATEGORIES
-- ============================================================
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PRODUCTS
-- ============================================================
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  is_combo BOOLEAN NOT NULL DEFAULT FALSE,
  base_price NUMERIC(10, 2) NOT NULL DEFAULT 0,
  hsn_code TEXT NOT NULL DEFAULT '6109',
  gst_rate NUMERIC(5, 2) NOT NULL DEFAULT 18.00,
  price_includes_gst BOOLEAN NOT NULL DEFAULT TRUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  tags TEXT[],
  meta_title TEXT,
  meta_description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PRODUCT VARIANTS
-- ============================================================
CREATE TABLE IF NOT EXISTS product_variants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  attributes JSONB NOT NULL DEFAULT '{}',
  price NUMERIC(10, 2) NOT NULL,
  compare_at_price NUMERIC(10, 2),
  stock INT NOT NULL DEFAULT 0,
  allow_backorder BOOLEAN NOT NULL DEFAULT TRUE,
  sku TEXT,
  weight_grams INT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- VARIANT IMAGES
-- ============================================================
CREATE TABLE IF NOT EXISTS variant_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  storage_path TEXT,
  alt TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- COMBO ITEMS
-- ============================================================
CREATE TABLE IF NOT EXISTS combo_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  combo_product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
  quantity INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- DELIVERY METHODS
-- ============================================================
CREATE TABLE IF NOT EXISTS delivery_methods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('NEXT_EVENT', 'SAME_DAY', 'STANDARD')),
  description TEXT,
  price NUMERIC(10, 2) NOT NULL DEFAULT 0,
  estimated_days TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS same_day_delivery_pincodes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pincode TEXT NOT NULL UNIQUE,
  area_name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- COUPONS
-- ============================================================
CREATE TABLE IF NOT EXISTS coupons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('PERCENTAGE', 'FLAT', 'FREE_SHIPPING', 'BUY_X_GET_Y')),
  value NUMERIC(10, 2) NOT NULL DEFAULT 0,
  min_order_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  max_discount NUMERIC(10, 2),
  buy_quantity INT,
  get_quantity INT,
  get_product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  is_first_order_only BOOLEAN NOT NULL DEFAULT FALSE,
  usage_limit INT,
  usage_count INT NOT NULL DEFAULT 0,
  valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ORDERS
-- ============================================================
CREATE SEQUENCE IF NOT EXISTS order_number_seq START 1;

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number TEXT NOT NULL UNIQUE DEFAULT ('SB-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(NEXTVAL('order_number_seq')::TEXT, 4, '0')),
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  shipping_address JSONB NOT NULL,
  billing_address JSONB,
  customer_gstin TEXT,
  delivery_method_id UUID REFERENCES delivery_methods(id),
  delivery_method_name TEXT NOT NULL,
  subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  shipping_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  taxable_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  cgst_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  sgst_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  total NUMERIC(10, 2) NOT NULL DEFAULT 0,
  coupon_id UUID REFERENCES coupons(id) ON DELETE SET NULL,
  coupon_code TEXT,
  payment_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (payment_status IN ('PENDING', 'PAID', 'FAILED', 'REFUNDED')),
  phonepe_merchant_transaction_id TEXT UNIQUE,
  phonepe_transaction_id TEXT,
  payment_method TEXT,
  payment_at TIMESTAMPTZ,
  order_status TEXT NOT NULL DEFAULT 'PLACED' CHECK (order_status IN ('PLACED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED')),
  awb_number TEXT,
  courier_name TEXT,
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  notes TEXT,
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ORDER ITEMS
-- ============================================================
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  variant_name TEXT NOT NULL,
  variant_attributes JSONB NOT NULL DEFAULT '{}',
  hsn_code TEXT NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  unit_price NUMERIC(10, 2) NOT NULL,
  gst_rate NUMERIC(5, 2) NOT NULL,
  cgst_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  sgst_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  total NUMERIC(10, 2) NOT NULL,
  image_url TEXT,
  combo_selections JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- GST INVOICES
-- ============================================================
CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START 1 INCREMENT 1 MINVALUE 1 NO MAXVALUE CACHE 1;
CREATE SEQUENCE IF NOT EXISTS invoice_number_gstin_seq START 1 INCREMENT 1 MINVALUE 1 NO MAXVALUE CACHE 1;

CREATE TABLE IF NOT EXISTS gst_invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL UNIQUE DEFAULT ('SO-SB-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(NEXTVAL('invoice_number_seq')::TEXT, 5, '0')),
  invoice_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  pdf_url TEXT,
  pdf_storage_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ADMIN USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_variants_product ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_variant_images_variant ON variant_images(variant_id);
CREATE INDEX IF NOT EXISTS idx_combo_items_combo ON combo_items(combo_product_id);
CREATE INDEX IF NOT EXISTS idx_orders_email ON orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_orders_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(order_status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);
CREATE INDEX IF NOT EXISTS idx_gst_invoices_order ON gst_invoices(order_id);

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_categories_updated ON categories;
CREATE TRIGGER trg_categories_updated BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS trg_products_updated ON products;
CREATE TRIGGER trg_products_updated BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS trg_variants_updated ON product_variants;
CREATE TRIGGER trg_variants_updated BEFORE UPDATE ON product_variants FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS trg_delivery_methods_updated ON delivery_methods;
CREATE TRIGGER trg_delivery_methods_updated BEFORE UPDATE ON delivery_methods FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS trg_coupons_updated ON coupons;
CREATE TRIGGER trg_coupons_updated BEFORE UPDATE ON coupons FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS trg_orders_updated ON orders;
CREATE TRIGGER trg_orders_updated BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE FUNCTION decrement_stock(p_variant_id UUID, p_quantity INT)
RETURNS VOID AS $$
BEGIN
  UPDATE product_variants
  SET stock = GREATEST(0, stock - p_quantity)
  WHERE id = p_variant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION generate_invoice_number(has_gstin boolean DEFAULT false)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  seq_val  bigint;
  fy_tag   text;
  prefix   text;
  cur_month int;
  cur_year  int;
BEGIN
  cur_month := EXTRACT(MONTH FROM NOW() AT TIME ZONE 'Asia/Kolkata');
  cur_year  := EXTRACT(YEAR  FROM NOW() AT TIME ZONE 'Asia/Kolkata');

  IF cur_month >= 4 THEN
    fy_tag := LPAD((cur_year % 100)::text, 2, '0') || LPAD(((cur_year + 1) % 100)::text, 2, '0');
  ELSE
    fy_tag := LPAD(((cur_year - 1) % 100)::text, 2, '0') || LPAD((cur_year % 100)::text, 2, '0');
  END IF;

  IF has_gstin THEN
    seq_val := NEXTVAL('invoice_number_gstin_seq');
    prefix  := 'SO-SBG-';
  ELSE
    seq_val := NEXTVAL('invoice_number_seq');
    prefix  := 'SO-SB-';
  END IF;

  RETURN prefix || fy_tag || '-' || LPAD(seq_val::text, 5, '0');
END;
$$;

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE variant_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE combo_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE same_day_delivery_pincodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE gst_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Public can read active categories" ON categories FOR SELECT USING (is_active = TRUE);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Public can read active products" ON products FOR SELECT USING (is_active = TRUE);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Public can read active variants" ON product_variants FOR SELECT USING (is_active = TRUE);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Public can read variant images" ON variant_images FOR SELECT USING (TRUE);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Public can read combo items" ON combo_items FOR SELECT USING (TRUE);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Public can read active delivery methods" ON delivery_methods FOR SELECT USING (is_active = TRUE);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Public can read same day pincodes" ON same_day_delivery_pincodes FOR SELECT USING (is_active = TRUE);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Admin can read own record" ON admin_users FOR SELECT USING (auth.uid() = id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Explicit schema/table grants and service_role policies (works for both sb_secret_ keys and legacy service_role JWTs)
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT ON categories, products, product_variants, variant_images, combo_items, delivery_methods, same_day_delivery_pincodes TO anon, authenticated;
GRANT SELECT ON admin_users TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

DO $$
DECLARE tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'categories', 'products', 'product_variants', 'variant_images',
    'combo_items', 'delivery_methods', 'same_day_delivery_pincodes',
    'coupons', 'orders', 'order_items', 'gst_invoices', 'admin_users'
  ]
  LOOP
    BEGIN
      EXECUTE format('CREATE POLICY "Service role full access" ON %I FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE)', tbl);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END LOOP;
END $$;
