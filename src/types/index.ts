export type TicketStatus = 'valid' | 'checked_in' | 'cancelled';

export type TicketDesignTheme = 'modern_dark' | 'royal_gold' | 'neon_cyber' | 'minimal_light' | 'festive_hologram' | 'arabic_heritage';

export interface OrganizerPaymentMethods {
  stripe: {
    enabled: boolean;
    publishable_key: string;
    account_id?: string;
    currency: 'USD' | 'SAR' | 'EUR' | 'AED' | 'EGP';
  };
  bankak: {
    enabled: boolean;
    account_number: string;
    account_name: string;
    phone_number?: string;
    instructions?: string;
  };
  vodafone_cash: {
    enabled: boolean;
    wallet_number: string;
    wallet_name: string;
    instructions?: string;
  };
}

export interface Organizer {
  id: string;
  email: string;
  name: string;
  phone: string;
  organization_name: string;
  logo_url?: string;
  created_at: string;
  payment_methods: OrganizerPaymentMethods;
}

export interface TicketTier {
  id: string;
  event_id: string;
  name: string;
  price: number;
  capacity: number;
  sold_count: number;
  perks: string[];
  color_hex?: string;
  is_active: boolean;
  gate?: string;
}

export interface EventItem {
  id: string;
  organizer_id: string;
  organizer_name: string;
  title: string;
  tagline: string;
  description: string;
  category: 'technology' | 'business' | 'music' | 'sports' | 'arts' | 'entertainment' | 'workshops';
  venue_name: string;
  city: string;
  country?: string;
  currency?: string;
  currency_code?: string;
  address?: string;
  start_date: string;
  end_date: string;
  logo_url?: string;
  banner_url: string;
  // Event Card Image Adjustments
  card_image_zoom?: number;
  card_image_position_y?: number;
  // Ticket Image & Layout Adjustments
  ticket_bg_url?: string;
  ticket_image_height?: number;
  ticket_image_fit?: 'cover' | 'contain';
  ticket_image_position_y?: number;
  ticket_image_zoom?: number;
  ticket_theme?: TicketDesignTheme;
  total_capacity: number;
  status: 'published' | 'draft' | 'ended' | 'paused';
  ticket_tiers: TicketTier[];
  created_at: string;
  featured?: boolean;
  sales_start_date?: string;
  sales_end_date?: string;
  payment_methods?: {
    stripe?: boolean;
    bankak?: boolean;
    vodafone_cash?: boolean;
  };
}

export interface Ticket {
  id: string;
  ticket_code: string;
  order_id: string;
  event_id: string;
  tier_id: string;
  tier_name: string;
  event_title: string;
  event_date: string;
  event_venue: string;
  event_logo?: string;
  event_banner?: string;
  // Ticket Image & Layout Adjustments
  ticket_bg_url?: string;
  ticket_image_height?: number;
  ticket_image_fit?: 'cover' | 'contain';
  ticket_image_position_y?: number;
  ticket_image_zoom?: number;
  ticket_theme?: TicketDesignTheme;
  buyer_name: string;
  buyer_email: string;
  buyer_phone: string;
  price: number;
  currency?: string;
  currency_code?: string;
  platform_commission: number;
  organizer_net_amount: number;
  status: TicketStatus;
  checked_in_at?: string;
  checked_in_by?: string;
  gate_number?: string;
  gate?: string;
  created_at: string;
  qr_data: string;
}

export interface Order {
  id: string;
  event_id: string;
  organizer_id: string;
  buyer_name: string;
  buyer_email: string;
  buyer_phone: string;
  total_price: number;
  platform_commission: number;
  commission_percentage?: number;
  organizer_net_payout: number;
  ticket_count: number;
  tickets: Ticket[];
  payment_method: 'stripe' | 'bankak' | 'vodafone_cash' | 'free';
  payment_reference?: string;
  payment_status: 'completed' | 'pending';
  created_at: string;
}

export interface ScanResult {
  status: 'valid' | 'already_used' | 'invalid' | 'wrong_gate' | 'wrong_event';
  message: string;
  ticket?: Ticket;
  scannedAt: string;
  expectedGate?: string;
  currentGate?: string;
}
