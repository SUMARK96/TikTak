-- ==============================================================================
-- TikTak Event Ticketing & QR Scanner Platform - Supabase Schema
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ORGANIZERS TABLE (Accounts & Direct Payment Configuration)
CREATE TABLE IF NOT EXISTS public.organizers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT,
    name TEXT NOT NULL,
    phone TEXT,
    organization_name TEXT NOT NULL,
    logo_url TEXT,
    payment_methods JSONB NOT NULL DEFAULT '{
        "bank_transfer": { "enabled": true, "bank_name": "مصرف الراجحي", "iban": "SA0380000000608010167519", "account_holder": "مؤسسة الفعاليات" },
        "stc_pay": { "enabled": true, "phone_number": "0550000000" },
        "online_card": { "enabled": true, "gateway_type": "tap", "account_identifier": "acc_org_1001" },
        "cash_on_door": { "enabled": true, "instructions": "الدفع نقداً أو عبر جهاز نقاط البيع عند شباك التذاكر بالبوابة" }
    }'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. EVENTS TABLE
CREATE TABLE IF NOT EXISTS public.events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organizer_id TEXT NOT NULL DEFAULT 'org-default',
    organizer_name TEXT NOT NULL,
    title TEXT NOT NULL,
    tagline TEXT,
    description TEXT,
    category TEXT NOT NULL DEFAULT 'entertainment',
    venue_name TEXT NOT NULL,
    city TEXT NOT NULL,
    address TEXT,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    logo_url TEXT,
    banner_url TEXT,
    total_capacity INTEGER NOT NULL DEFAULT 100,
    status TEXT NOT NULL DEFAULT 'published',
    featured BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. TICKET TIERS TABLE
CREATE TABLE IF NOT EXISTS public.ticket_tiers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    capacity INTEGER NOT NULL DEFAULT 50,
    sold_count INTEGER NOT NULL DEFAULT 0,
    perks JSONB DEFAULT '[]'::jsonb,
    color_hex TEXT DEFAULT '#6366f1',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. ORDERS TABLE (Includes 5% Platform Commission & Organizer Net Payout)
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    organizer_id TEXT NOT NULL DEFAULT 'org-default',
    buyer_name TEXT NOT NULL,
    buyer_email TEXT NOT NULL,
    buyer_phone TEXT NOT NULL,
    total_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    platform_commission NUMERIC(10, 2) NOT NULL DEFAULT 0.00, -- 5% Platform Fee (e.g. 5 SAR on 100 SAR)
    organizer_net_payout NUMERIC(10, 2) NOT NULL DEFAULT 0.00, -- 95% Organizer Net (e.g. 95 SAR on 100 SAR)
    commission_percentage NUMERIC(5, 2) NOT NULL DEFAULT 5.00,
    ticket_count INTEGER NOT NULL DEFAULT 1,
    payment_method TEXT NOT NULL DEFAULT 'online_card', -- 'bank_transfer', 'stc_pay', 'online_card', 'cash_on_door', 'free'
    payment_reference TEXT,
    payment_status TEXT NOT NULL DEFAULT 'completed',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. TICKETS TABLE
CREATE TABLE IF NOT EXISTS public.tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_code TEXT NOT NULL UNIQUE,
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    tier_id UUID NOT NULL REFERENCES public.ticket_tiers(id) ON DELETE CASCADE,
    tier_name TEXT NOT NULL,
    event_title TEXT NOT NULL,
    event_date TIMESTAMPTZ NOT NULL,
    event_venue TEXT NOT NULL,
    event_logo TEXT,
    buyer_name TEXT NOT NULL,
    buyer_email TEXT NOT NULL,
    buyer_phone TEXT NOT NULL,
    price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    platform_commission NUMERIC(10, 2) NOT NULL DEFAULT 0.00, -- 5% backend tracking
    organizer_net_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00, -- 95% backend tracking
    status TEXT NOT NULL DEFAULT 'valid', -- 'valid', 'checked_in', 'cancelled'
    checked_in_at TIMESTAMPTZ,
    checked_in_by TEXT,
    gate_number TEXT,
    qr_data TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for lightning fast QR validation and lookup
CREATE INDEX IF NOT EXISTS idx_tickets_code ON public.tickets(ticket_code);
CREATE INDEX IF NOT EXISTS idx_tickets_event ON public.tickets(event_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON public.tickets(status);
CREATE INDEX IF NOT EXISTS idx_events_organizer ON public.events(organizer_id);
CREATE INDEX IF NOT EXISTS idx_orders_organizer ON public.orders(organizer_id);

-- Row Level Security (RLS) policies
ALTER TABLE public.organizers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- Allow public read access to published events & ticket tiers
CREATE POLICY "Public can view published events" 
    ON public.events FOR SELECT 
    USING (status = 'published');

CREATE POLICY "Public can view ticket tiers" 
    ON public.ticket_tiers FOR SELECT 
    USING (is_active = true);

CREATE POLICY "Public can create orders" 
    ON public.orders FOR INSERT 
    WITH CHECK (true);

CREATE POLICY "Public can view orders" 
    ON public.orders FOR SELECT 
    USING (true);

CREATE POLICY "Public can create tickets" 
    ON public.tickets FOR INSERT 
    WITH CHECK (true);

CREATE POLICY "Public can view tickets" 
    ON public.tickets FOR SELECT 
    USING (true);

CREATE POLICY "Allow check-in ticket updates" 
    ON public.tickets FOR UPDATE 
    USING (true) 
    WITH CHECK (true);

CREATE POLICY "Organizers full access to events" 
    ON public.events FOR ALL 
    USING (true);

CREATE POLICY "Organizers full access to tiers" 
    ON public.ticket_tiers FOR ALL 
    USING (true);

CREATE POLICY "Organizers profile management" 
    ON public.organizers FOR ALL 
    USING (true);
