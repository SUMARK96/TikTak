-- TikTak Centralized Supabase PostgreSQL Schema
-- Run this schema to set up all tables, foreign keys, and indexes for TikTak

CREATE TABLE IF NOT EXISTS organizers (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  organization_name TEXT NOT NULL,
  logo_url TEXT,
  payment_methods JSONB DEFAULT '{}'::jsonb,
  created_at TEXT NOT NULL DEFAULT now()::text
);

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  organizer_id TEXT NOT NULL,
  organizer_name TEXT NOT NULL,
  title TEXT NOT NULL,
  tagline TEXT,
  description TEXT,
  category TEXT NOT NULL,
  country TEXT,
  currency TEXT NOT NULL DEFAULT 'ر.س',
  currency_code TEXT NOT NULL DEFAULT 'SAR',
  venue_name TEXT NOT NULL,
  city TEXT NOT NULL,
  address TEXT,
  start_date TEXT NOT NULL,
  end_date TEXT,
  sales_start_date TEXT,
  sales_end_date TEXT,
  logo_url TEXT,
  banner_url TEXT,
  card_image_zoom NUMERIC DEFAULT 100,
  card_image_position_y NUMERIC DEFAULT 50,
  ticket_bg_url TEXT,
  ticket_image_height NUMERIC DEFAULT 180,
  ticket_image_fit TEXT DEFAULT 'cover',
  ticket_image_position_y NUMERIC DEFAULT 50,
  ticket_image_zoom NUMERIC DEFAULT 100,
  ticket_theme TEXT DEFAULT 'royal_gold',
  total_capacity INTEGER NOT NULL DEFAULT 1000,
  status TEXT NOT NULL DEFAULT 'published',
  payment_methods JSONB,
  featured BOOLEAN DEFAULT false,
  created_at TEXT NOT NULL DEFAULT now()::text
);

CREATE TABLE IF NOT EXISTS ticket_tiers (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  capacity INTEGER NOT NULL DEFAULT 100,
  sold_count INTEGER NOT NULL DEFAULT 0,
  perks JSONB DEFAULT '[]'::jsonb,
  color_hex TEXT DEFAULT '#3b82f6',
  is_active BOOLEAN DEFAULT true,
  gate TEXT
);

CREATE TABLE IF NOT EXISTS tickets (
  id TEXT PRIMARY KEY,
  ticket_code TEXT UNIQUE NOT NULL,
  order_id TEXT NOT NULL,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  tier_id TEXT NOT NULL,
  tier_name TEXT NOT NULL,
  event_title TEXT NOT NULL,
  event_date TEXT NOT NULL,
  event_venue TEXT,
  event_logo TEXT,
  event_banner TEXT,
  ticket_bg_url TEXT,
  ticket_image_height NUMERIC DEFAULT 180,
  ticket_image_fit TEXT DEFAULT 'cover',
  ticket_image_position_y NUMERIC DEFAULT 50,
  ticket_image_zoom NUMERIC DEFAULT 100,
  ticket_theme TEXT DEFAULT 'royal_gold',
  buyer_name TEXT NOT NULL,
  buyer_email TEXT NOT NULL,
  buyer_phone TEXT NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'ر.س',
  currency_code TEXT NOT NULL DEFAULT 'SAR',
  platform_commission NUMERIC NOT NULL DEFAULT 0,
  organizer_net_amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'valid',
  checked_in_at TEXT,
  checked_in_by TEXT,
  gate_number TEXT,
  gate TEXT,
  created_at TEXT NOT NULL DEFAULT now()::text,
  qr_data TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  organizer_id TEXT NOT NULL,
  buyer_name TEXT NOT NULL,
  buyer_email TEXT NOT NULL,
  buyer_phone TEXT NOT NULL,
  total_price NUMERIC NOT NULL DEFAULT 0,
  platform_commission NUMERIC NOT NULL DEFAULT 0,
  organizer_net_payout NUMERIC NOT NULL DEFAULT 0,
  commission_percentage NUMERIC NOT NULL DEFAULT 5.0,
  ticket_count INTEGER NOT NULL DEFAULT 1,
  payment_method TEXT NOT NULL DEFAULT 'free',
  payment_reference TEXT,
  payment_status TEXT NOT NULL DEFAULT 'completed',
  created_at TEXT NOT NULL DEFAULT now()::text
);

CREATE TABLE IF NOT EXISTS gate_staff (
  id TEXT PRIMARY KEY,
  organizer_id TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  phone TEXT,
  pin_code TEXT NOT NULL,
  assigned_gate TEXT NOT NULL DEFAULT 'all',
  assigned_event_id TEXT NOT NULL DEFAULT 'all',
  is_active BOOLEAN DEFAULT true,
  total_scans_count INTEGER DEFAULT 0,
  last_scan_at TEXT,
  created_at TEXT NOT NULL DEFAULT now()::text
);

CREATE TABLE IF NOT EXISTS scan_logs (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  ticket_id TEXT,
  ticket_code TEXT NOT NULL,
  buyer_name TEXT,
  tier_name TEXT,
  gate TEXT,
  staff_name TEXT,
  status TEXT NOT NULL,
  timestamp TEXT NOT NULL DEFAULT now()::text,
  notes TEXT
);

-- Realtime Publication
ALTER PUBLICATION supabase_realtime ADD TABLE organizers, events, ticket_tiers, tickets, orders, gate_staff, scan_logs;
ALTER TABLE organizers REPLICA IDENTITY FULL;
ALTER TABLE events REPLICA IDENTITY FULL;
ALTER TABLE ticket_tiers REPLICA IDENTITY FULL;
ALTER TABLE tickets REPLICA IDENTITY FULL;
ALTER TABLE orders REPLICA IDENTITY FULL;
ALTER TABLE gate_staff REPLICA IDENTITY FULL;
ALTER TABLE scan_logs REPLICA IDENTITY FULL;

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_events_organizer ON events(organizer_id);
CREATE INDEX IF NOT EXISTS idx_ticket_tiers_event ON ticket_tiers(event_id);
CREATE INDEX IF NOT EXISTS idx_tickets_event ON tickets(event_id);
CREATE INDEX IF NOT EXISTS idx_tickets_code ON tickets(ticket_code);
CREATE INDEX IF NOT EXISTS idx_tickets_buyer ON tickets(buyer_email, buyer_phone);
CREATE INDEX IF NOT EXISTS idx_orders_organizer ON orders(organizer_id);
CREATE INDEX IF NOT EXISTS idx_gate_staff_organizer ON gate_staff(organizer_id);
CREATE INDEX IF NOT EXISTS idx_scan_logs_event ON scan_logs(event_id);
