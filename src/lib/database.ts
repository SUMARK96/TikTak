import { EventItem, GateStaff, Order, Organizer, OrganizerPaymentMethods, ScanLogEntry, ScanResult, Ticket, TicketTier } from '../types';
import { INITIAL_EVENTS, INITIAL_ORGANIZERS, INITIAL_TICKETS } from './mockData';
import { supabase } from './supabase';

const EVENTS_STORAGE_KEY = 'tiktak_events_data_v3';
const TICKETS_STORAGE_KEY = 'tiktak_tickets_data_v3';
const ORDERS_STORAGE_KEY = 'tiktak_orders_data_v3';
const ORGANIZERS_STORAGE_KEY = 'tiktak_organizers_data_v3';
const CURRENT_ORGANIZER_KEY = 'tiktak_current_organizer_v3';
const GATE_STAFF_STORAGE_KEY = 'tiktak_gate_staff_v3';
const SCAN_LOGS_STORAGE_KEY = 'tiktak_scan_logs_v3';

export const PLATFORM_FEE_PERCENTAGE = 5.0; // 5% platform commission

// Cross-tab / Cross-component Realtime Event Emitter
export const notifyDataChange = (type: 'tickets' | 'events' | 'orders' | 'organizers' | 'gate_staff' | 'scan_logs') => {
  window.dispatchEvent(new CustomEvent('tiktak:datachange', { detail: { type, timestamp: Date.now() } }));
};

// Safe Local Storage Writer that prevents QuotaExceededError
export const safeSetLocalStorage = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch (err) {
    console.warn(`[LocalStorage] Quota error on key ${key}. Running safe compression/trimming...`, err);
    try {
      if (key === TICKETS_STORAGE_KEY) {
        const parsed: Ticket[] = JSON.parse(value);
        if (Array.isArray(parsed)) {
          // Keep the latest 40 tickets, and strip massive base64 fields if older
          const trimmed = parsed.slice(0, 40).map((t, idx) => ({
            ...t,
            event_banner: idx < 5 ? t.event_banner : undefined,
            ticket_bg_url: idx < 5 ? t.ticket_bg_url : undefined,
          }));
          localStorage.setItem(key, JSON.stringify(trimmed));
          return;
        }
      }
      if (key === ORDERS_STORAGE_KEY) {
        const parsed: Order[] = JSON.parse(value);
        if (Array.isArray(parsed)) {
          // Keep only the latest 40 orders and trim inner ticket duplicates
          const trimmed = parsed.slice(0, 40).map((o) => ({
            ...o,
            tickets: (o.tickets || []).map((t) => ({
              id: t.id,
              ticket_code: t.ticket_code,
              tier_name: t.tier_name,
              price: t.price,
              currency: t.currency,
              status: t.status,
              gate: t.gate,
              created_at: t.created_at,
            })),
          }));
          localStorage.setItem(key, JSON.stringify(trimmed));
          return;
        }
      }
      if (key === EVENTS_STORAGE_KEY) {
        const parsed: EventItem[] = JSON.parse(value);
        if (Array.isArray(parsed)) {
          localStorage.setItem(key, JSON.stringify(parsed.slice(0, 30)));
          return;
        }
      }
      localStorage.setItem(key, value);
    } catch (fallbackErr) {
      console.error('[LocalStorage] Critical storage error:', fallbackErr);
    }
  }
};

// Local data helpers
export const getLocalOrganizers = (): Organizer[] => {
  const saved = localStorage.getItem(ORGANIZERS_STORAGE_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      // Fallback
    }
  }
  safeSetLocalStorage(ORGANIZERS_STORAGE_KEY, JSON.stringify(INITIAL_ORGANIZERS));
  return INITIAL_ORGANIZERS;
};

export const setLocalOrganizers = (orgs: Organizer[]) => {
  safeSetLocalStorage(ORGANIZERS_STORAGE_KEY, JSON.stringify(orgs));
  notifyDataChange('organizers');
};

export const getCurrentOrganizerSession = (): Organizer | null => {
  const saved = localStorage.getItem(CURRENT_ORGANIZER_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      return null;
    }
  }
  return null;
};

export const setCurrentOrganizerSession = (organizer: Organizer | null) => {
  if (organizer) {
    safeSetLocalStorage(CURRENT_ORGANIZER_KEY, JSON.stringify(organizer));
  } else {
    localStorage.removeItem(CURRENT_ORGANIZER_KEY);
  }
  notifyDataChange('organizers');
};

export const getLocalEvents = (): EventItem[] => {
  const saved = localStorage.getItem(EVENTS_STORAGE_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      // Fallback
    }
  }
  safeSetLocalStorage(EVENTS_STORAGE_KEY, JSON.stringify(INITIAL_EVENTS));
  return INITIAL_EVENTS;
};

export const setLocalEvents = (events: EventItem[]) => {
  safeSetLocalStorage(EVENTS_STORAGE_KEY, JSON.stringify(events));
  notifyDataChange('events');
};

export const getLocalTickets = (): Ticket[] => {
  const saved = localStorage.getItem(TICKETS_STORAGE_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      // Fallback
    }
  }
  safeSetLocalStorage(TICKETS_STORAGE_KEY, JSON.stringify(INITIAL_TICKETS));
  return INITIAL_TICKETS;
};

export const setLocalTickets = (tickets: Ticket[]) => {
  // Keep up to 60 most recent tickets
  const trimmed = tickets.slice(0, 60);
  safeSetLocalStorage(TICKETS_STORAGE_KEY, JSON.stringify(trimmed));
  notifyDataChange('tickets');
};

export const getLocalOrders = (): Order[] => {
  const saved = localStorage.getItem(ORDERS_STORAGE_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      return [];
    }
  }
  return [];
};

export const setLocalOrders = (orders: Order[]) => {
  // Keep up to 60 most recent orders
  const trimmed = orders.slice(0, 60);
  safeSetLocalStorage(ORDERS_STORAGE_KEY, JSON.stringify(trimmed));
  notifyDataChange('orders');
};

const INITIAL_GATE_STAFF: GateStaff[] = [
  {
    id: 'staff-1',
    organizer_id: 'org-1',
    name: 'أحمد بن خالد الرويلي',
    role: 'مشرف البوابة الرئيسية (A)',
    phone: '+966 50 111 2222',
    pin_code: '1001',
    assigned_gate: 'البوابة الرئيسية (A)',
    assigned_event_id: 'all',
    is_active: true,
    total_scans_count: 84,
    last_scan_at: new Date(Date.now() - 15 * 60000).toISOString(),
    created_at: new Date().toISOString(),
  },
  {
    id: 'staff-2',
    organizer_id: 'org-1',
    name: 'سارة عبد الرحمن الناصر',
    role: 'مسؤولة بوابة VIP',
    phone: '+966 55 333 4444',
    pin_code: '2002',
    assigned_gate: 'بوابة كبار الشخصيات (VIP)',
    assigned_event_id: 'all',
    is_active: true,
    total_scans_count: 32,
    last_scan_at: new Date(Date.now() - 5 * 60000).toISOString(),
    created_at: new Date().toISOString(),
  },
  {
    id: 'staff-3',
    organizer_id: 'org-1',
    name: 'فيصل محمد العتيبي',
    role: 'فاحص تذاكر البوابة الشرقية (B)',
    phone: '+966 54 888 9999',
    pin_code: '3003',
    assigned_gate: 'البوابة الشرقية (B)',
    assigned_event_id: 'all',
    is_active: true,
    total_scans_count: 51,
    last_scan_at: new Date(Date.now() - 30 * 60000).toISOString(),
    created_at: new Date().toISOString(),
  },
];

export const getLocalGateStaff = (): GateStaff[] => {
  const saved = localStorage.getItem(GATE_STAFF_STORAGE_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      // Fallback
    }
  }
  safeSetLocalStorage(GATE_STAFF_STORAGE_KEY, JSON.stringify(INITIAL_GATE_STAFF));
  return INITIAL_GATE_STAFF;
};

export const setLocalGateStaff = (staffList: GateStaff[]) => {
  safeSetLocalStorage(GATE_STAFF_STORAGE_KEY, JSON.stringify(staffList));
  notifyDataChange('gate_staff');
};

export const getLocalScanLogs = (): ScanLogEntry[] => {
  const saved = localStorage.getItem(SCAN_LOGS_STORAGE_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      return [];
    }
  }
  return [];
};

export const setLocalScanLogs = (logs: ScanLogEntry[]) => {
  // Keep up to 100 recent scan logs
  const trimmed = logs.slice(0, 100);
  safeSetLocalStorage(SCAN_LOGS_STORAGE_KEY, JSON.stringify(trimmed));
  notifyDataChange('scan_logs');
};

export const dbService = {
  // Realtime Subscription Helper
  subscribeToChanges(callback: () => void): () => void {
    const handler = () => callback();
    window.addEventListener('tiktak:datachange', handler);
    window.addEventListener('storage', handler);

    const sb = supabase;
    if (sb) {
      const channel = sb
        .channel('tiktak-realtime-feed')
        .on('postgres_changes', { event: '*', schema: 'public' }, () => callback())
        .subscribe();

      return () => {
        window.removeEventListener('tiktak:datachange', handler);
        window.removeEventListener('storage', handler);
        sb.removeChannel(channel);
      };
    }

    return () => {
      window.removeEventListener('tiktak:datachange', handler);
      window.removeEventListener('storage', handler);
    };
  },

  // ==================== ORGANIZER AUTH & PROFILE ====================
  async loginOrganizer(email: string, _password?: string): Promise<Organizer | null> {
    const orgs = getLocalOrganizers();
    const found = orgs.find((o) => o.email.toLowerCase() === email.toLowerCase());
    if (found) {
      setCurrentOrganizerSession(found);
      return found;
    }
    return null;
  },

  async registerOrganizer(data: {
    name: string;
    email: string;
    phone: string;
    organization_name: string;
    logo_url?: string;
  }): Promise<Organizer> {
    const orgs = getLocalOrganizers();
    const newOrganizer: Organizer = {
      id: 'org-' + Date.now().toString(36),
      email: data.email,
      name: data.name,
      phone: data.phone,
      organization_name: data.organization_name,
      logo_url: data.logo_url || '/logo.png',
      created_at: new Date().toISOString(),
      payment_methods: {
        stripe: {
          enabled: true,
          publishable_key: 'pk_live_stripe_sample_key',
          account_id: `acct_${data.organization_name.replace(/\s+/g, '_')}`,
          currency: 'SAR',
        },
        bankak: {
          enabled: true,
          account_number: '2840195',
          account_name: data.organization_name,
          phone_number: data.phone || '0912345678',
          instructions: 'يرجى التحويل عبر تطبيق بنكك وإرفاق إشعار أو رقم العملية',
        },
        vodafone_cash: {
          enabled: true,
          wallet_number: data.phone || '01012345678',
          wallet_name: data.organization_name,
          instructions: 'تحويل مباشر إلى رقم محفظة فودافون كاش',
        },
      },
    };

    const updated = [
      newOrganizer,
      ...orgs.filter((o) => o.email.toLowerCase() !== data.email.toLowerCase()),
    ];
    setLocalOrganizers(updated);
    setCurrentOrganizerSession(newOrganizer);

    if (supabase) {
      Promise.resolve(supabase.from('organizers').insert([newOrganizer])).catch((err: unknown) => {
        console.warn('Supabase organizer insert warning:', err);
      });
    }

    return newOrganizer;
  },

  async updateOrganizerPaymentMethods(
    organizerId: string,
    methods: OrganizerPaymentMethods
  ): Promise<Organizer | null> {
    const orgs = getLocalOrganizers();
    const idx = orgs.findIndex((o) => o.id === organizerId);
    if (idx === -1) return null;

    orgs[idx].payment_methods = methods;
    setLocalOrganizers(orgs);

    const currentSession = getCurrentOrganizerSession();
    if (currentSession && currentSession.id === organizerId) {
      setCurrentOrganizerSession(orgs[idx]);
    }

    if (supabase) {
      try {
        await supabase.from('organizers').update({ payment_methods: methods }).eq('id', organizerId);
      } catch (e) {
        console.warn('Supabase update payment methods warning:', e);
      }
    }

    return orgs[idx];
  },

  async getOrganizerById(organizerId: string): Promise<Organizer | null> {
    const orgs = getLocalOrganizers();
    return orgs.find((o) => o.id === organizerId) || null;
  },

  // ==================== EVENTS ====================
  async getEvents(): Promise<EventItem[]> {
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('events')
          .select('*, ticket_tiers(*)')
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          const eventsWithTiers: EventItem[] = data.map((d: any) => ({
            ...d,
            ticket_tiers: d.ticket_tiers || [],
          }));
          safeSetLocalStorage(EVENTS_STORAGE_KEY, JSON.stringify(eventsWithTiers));
          return eventsWithTiers;
        }

        // If cloud database has 0 events, but local device has events (e.g. created on laptop), seed them to cloud!
        const local = getLocalEvents();
        if (local.length > 0 && (!data || data.length === 0)) {
          for (const ev of local) {
            await supabase.from('events').upsert([
              {
                id: ev.id,
                organizer_id: ev.organizer_id,
                organizer_name: ev.organizer_name,
                title: ev.title,
                tagline: ev.tagline,
                description: ev.description,
                category: ev.category,
                country: ev.country,
                currency: ev.currency,
                currency_code: ev.currency_code,
                venue_name: ev.venue_name,
                city: ev.city,
                address: ev.address,
                start_date: ev.start_date,
                end_date: ev.end_date,
                sales_start_date: ev.sales_start_date,
                sales_end_date: ev.sales_end_date,
                logo_url: ev.logo_url,
                banner_url: ev.banner_url,
                card_image_zoom: ev.card_image_zoom,
                card_image_position_y: ev.card_image_position_y,
                ticket_bg_url: ev.ticket_bg_url,
                ticket_image_height: ev.ticket_image_height,
                ticket_image_fit: ev.ticket_image_fit,
                ticket_image_position_y: ev.ticket_image_position_y,
                ticket_image_zoom: ev.ticket_image_zoom,
                ticket_theme: ev.ticket_theme,
                total_capacity: ev.total_capacity,
                status: ev.status,
                payment_methods: ev.payment_methods,
                featured: ev.featured || false,
              },
            ]);
            if (ev.ticket_tiers && ev.ticket_tiers.length > 0) {
              await supabase.from('ticket_tiers').upsert(
                ev.ticket_tiers.map((t) => ({ ...t, event_id: ev.id }))
              );
            }
          }
          return local;
        }
      } catch (err) {
        console.warn('Supabase fetch failed, using local store:', err);
      }
    }
    return getLocalEvents();
  },

  async getEventsByOrganizer(organizerId: string): Promise<EventItem[]> {
    const events = await this.getEvents();
    return events.filter((e) => e.organizer_id === organizerId);
  },

  async createEvent(eventData: Omit<EventItem, 'id' | 'created_at'>): Promise<EventItem> {
    const newId = 'evt-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6);
    const newEvent: EventItem = {
      ...eventData,
      id: newId,
      logo_url: eventData.logo_url || '/logo.png',
      created_at: new Date().toISOString(),
      ticket_tiers: eventData.ticket_tiers.map((t, idx) => ({
        ...t,
        id: t.id || `tier-${newId}-${idx}`,
        event_id: newId,
        sold_count: 0,
      })),
    };

    if (supabase) {
      try {
        const { error: evtError } = await supabase.from('events').insert([
          {
            id: newEvent.id,
            organizer_id: newEvent.organizer_id,
            organizer_name: newEvent.organizer_name,
            title: newEvent.title,
            tagline: newEvent.tagline,
            description: newEvent.description,
            category: newEvent.category,
            country: newEvent.country,
            currency: newEvent.currency,
            currency_code: newEvent.currency_code,
            venue_name: newEvent.venue_name,
            city: newEvent.city,
            address: newEvent.address,
            start_date: newEvent.start_date,
            end_date: newEvent.end_date,
            sales_start_date: newEvent.sales_start_date,
            sales_end_date: newEvent.sales_end_date,
            logo_url: newEvent.logo_url,
            banner_url: newEvent.banner_url,
            card_image_zoom: newEvent.card_image_zoom,
            card_image_position_y: newEvent.card_image_position_y,
            ticket_bg_url: newEvent.ticket_bg_url,
            ticket_image_height: newEvent.ticket_image_height,
            ticket_image_fit: newEvent.ticket_image_fit,
            ticket_image_position_y: newEvent.ticket_image_position_y,
            ticket_image_zoom: newEvent.ticket_image_zoom,
            ticket_theme: newEvent.ticket_theme,
            total_capacity: newEvent.total_capacity,
            status: newEvent.status,
            payment_methods: newEvent.payment_methods,
            featured: newEvent.featured || false,
          },
        ]);

        if (!evtError && newEvent.ticket_tiers.length > 0) {
          await supabase.from('ticket_tiers').insert(newEvent.ticket_tiers);
        }
      } catch (err) {
        console.warn('Could not insert to remote Supabase, saved locally:', err);
      }
    }

    const current = getLocalEvents();
    setLocalEvents([newEvent, ...current]);
    return newEvent;
  },

  async updateEvent(eventId: string, updates: Partial<EventItem>): Promise<EventItem | null> {
    const events = getLocalEvents();
    const index = events.findIndex((e) => e.id === eventId);
    if (index === -1) return null;

    const updatedEvent: EventItem = {
      ...events[index],
      ...updates,
    };
    events[index] = updatedEvent;
    setLocalEvents([...events]);

    if (supabase) {
      (async () => {
        try {
          await supabase.from('events').update(updates).eq('id', eventId);
        } catch (e) {
          console.warn('Supabase event update warning:', e);
        }
      })();
    }

    return updatedEvent;
  },

  async deleteEvent(eventId: string): Promise<boolean> {
    const events = getLocalEvents();
    const filtered = events.filter((e) => e.id !== eventId);
    setLocalEvents(filtered);

    if (supabase) {
      (async () => {
        try {
          await supabase.from('events').delete().eq('id', eventId);
        } catch (e) {
          console.warn('Supabase event delete warning:', e);
        }
      })();
    }
    return true;
  },

  async toggleEventStatus(eventId: string, newStatus: 'published' | 'paused' | 'draft'): Promise<EventItem | null> {
    return this.updateEvent(eventId, { status: newStatus });
  },

  async postponeEvent(eventId: string, newStartDate: string, newEndDate: string): Promise<EventItem | null> {
    return this.updateEvent(eventId, {
      start_date: newStartDate,
      end_date: newEndDate,
    });
  },

  // ==================== PURCHASING & 5% COMMISSION ====================
  async purchaseTickets(
    event: EventItem,
    tier: TicketTier,
    quantity: number,
    buyer: {
      name: string;
      email: string;
      phone: string;
      paymentMethod: 'stripe' | 'bankak' | 'vodafone_cash' | 'free';
      paymentReference?: string;
    }
  ): Promise<{ order: Order; tickets: Ticket[] }> {
    const orderId = 'ord-' + Date.now().toString(36);
    const generatedTickets: Ticket[] = [];

    const totalPrice = tier.price * quantity;
    const platformCommission = totalPrice * (PLATFORM_FEE_PERCENTAGE / 100);
    const organizerNetPayout = totalPrice - platformCommission;

    const perTicketCommission = tier.price * (PLATFORM_FEE_PERCENTAGE / 100);
    const perTicketNetAmount = tier.price - perTicketCommission;

    for (let i = 0; i < quantity; i++) {
      const tierPrefix = tier.name.toUpperCase().includes('VIP') ? 'VIP' : 'GEN';
      const randomHex = Math.random().toString(36).substring(2, 6).toUpperCase();
      const timeSlice = Date.now().toString(36).toUpperCase().slice(-4);
      const serial = Math.floor(1000 + Math.random() * 9000);
      const ticketCode = `TIK-${tierPrefix}-${randomHex}${timeSlice}-${serial}`;
      const qrData = `TIKTAK:${ticketCode}:${event.id}:${Date.now().toString(36)}:${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      const newTicket: Ticket = {
        id: 'tkt-' + Date.now().toString(36) + '-' + i + '-' + Math.random().toString(36).substring(2, 6),
        ticket_code: ticketCode,
        order_id: orderId,
        event_id: event.id,
        tier_id: tier.id,
        tier_name: tier.name,
        event_title: event.title,
        event_date: event.start_date,
        event_venue: `${event.venue_name}, ${event.city}`,
        event_logo: event.logo_url || '/logo.png',
        event_banner: event.banner_url,
        ticket_bg_url: event.ticket_bg_url || event.banner_url,
        ticket_image_height: event.ticket_image_height,
        ticket_image_fit: event.ticket_image_fit,
        ticket_image_position_y: event.ticket_image_position_y,
        ticket_image_zoom: event.ticket_image_zoom,
        ticket_theme: event.ticket_theme || 'modern_dark',
        buyer_name: buyer.name,
        buyer_email: buyer.email,
        buyer_phone: buyer.phone,
        price: tier.price,
        currency: event.currency || 'ر.س',
        currency_code: event.currency_code || 'SAR',
        platform_commission: perTicketCommission,
        organizer_net_amount: perTicketNetAmount,
        status: 'valid',
        gate: tier.gate,
        gate_number: tier.gate,
        created_at: new Date().toISOString(),
        qr_data: qrData,
      };

      generatedTickets.push(newTicket);
    }

    const newOrder: Order = {
      id: orderId,
      event_id: event.id,
      organizer_id: event.organizer_id,
      buyer_name: buyer.name,
      buyer_email: buyer.email,
      buyer_phone: buyer.phone,
      total_price: totalPrice,
      platform_commission: platformCommission,
      organizer_net_payout: organizerNetPayout,
      commission_percentage: PLATFORM_FEE_PERCENTAGE,
      ticket_count: quantity,
      tickets: generatedTickets,
      payment_method: buyer.paymentMethod,
      payment_reference: buyer.paymentReference,
      payment_status: 'completed',
      created_at: new Date().toISOString(),
    };

    // Update tickets count in event tier
    const currentEvents = getLocalEvents();
    const updatedEvents = currentEvents.map((evt) => {
      if (evt.id === event.id) {
        return {
          ...evt,
          ticket_tiers: (evt.ticket_tiers || []).map((t) =>
            t.id === tier.id ? { ...t, sold_count: (t.sold_count || 0) + quantity } : t
          ),
        };
      }
      return evt;
    });
    setLocalEvents(updatedEvents);

    // Save tickets & orders locally
    const currentTickets = getLocalTickets();
    setLocalTickets([...generatedTickets, ...currentTickets]);

    const currentOrders = getLocalOrders();
    setLocalOrders([newOrder, ...currentOrders]);

    if (supabase) {
      (async () => {
        try {
          await supabase.from('orders').insert([
            {
              id: newOrder.id,
              event_id: newOrder.event_id,
              organizer_id: newOrder.organizer_id,
              buyer_name: newOrder.buyer_name,
              buyer_email: newOrder.buyer_email,
              buyer_phone: newOrder.buyer_phone,
              total_price: newOrder.total_price,
              platform_commission: newOrder.platform_commission,
              organizer_net_payout: newOrder.organizer_net_payout,
              commission_percentage: newOrder.commission_percentage,
              ticket_count: newOrder.ticket_count,
              payment_method: newOrder.payment_method,
              payment_status: newOrder.payment_status,
            },
          ]);

          await supabase.from('tickets').insert(generatedTickets);
        } catch (e) {
          console.warn('Sync order to Supabase warning:', e);
        }
      })();
    }

    return { order: newOrder, tickets: generatedTickets };
  },

  // ==================== SCANNER & REALTIME VERIFICATION ====================
  async verifyAndScanTicket(
    scannedCode: string,
    gate: string = 'جميع البوابات',
    staffName: string = 'موظف الدخول'
  ): Promise<ScanResult> {
    const cleanCode = scannedCode.trim();
    const now = new Date().toISOString();

    const tickets = getLocalTickets();
    const ticketIndex = tickets.findIndex(
      (t) =>
        t.ticket_code.toLowerCase() === cleanCode.toLowerCase() ||
        (t.qr_data && t.qr_data.toLowerCase() === cleanCode.toLowerCase()) ||
        (cleanCode.includes(':') && cleanCode.split(':')[1]?.toLowerCase() === t.ticket_code.toLowerCase())
    );

    if (ticketIndex === -1) {
      this.addScanLog({
        event_id: '',
        ticket_code: cleanCode,
        gate,
        staff_name: staffName,
        status: 'invalid',
        notes: 'الرمز غير موجود في النظام',
      });

      return {
        status: 'invalid',
        message: 'عذراً! التذكرة غير موجودة بالنظام أو الرمز غير صالح.',
        scannedAt: now,
      };
    }

    const ticket = tickets[ticketIndex];

    if (ticket.status === 'checked_in') {
      this.addScanLog({
        event_id: ticket.event_id,
        ticket_id: ticket.id,
        ticket_code: ticket.ticket_code,
        buyer_name: ticket.buyer_name,
        tier_name: ticket.tier_name,
        gate,
        staff_name: staffName,
        status: 'already_used',
        notes: `مسحت مسبقاً في ${ticket.checked_in_at ? new Date(ticket.checked_in_at).toLocaleTimeString('ar-SA') : ''} عبر ${ticket.gate_number || ''}`,
      });

      return {
        status: 'already_used',
        message: `تنبيه: تم مسح هذه التذكرة مسبقاً في ${new Date(ticket.checked_in_at || '').toLocaleTimeString('ar-SA')} عبر (${ticket.gate_number || 'البوابة'}).`,
        ticket,
        scannedAt: now,
      };
    }

    if (ticket.status === 'cancelled') {
      this.addScanLog({
        event_id: ticket.event_id,
        ticket_id: ticket.id,
        ticket_code: ticket.ticket_code,
        buyer_name: ticket.buyer_name,
        tier_name: ticket.tier_name,
        gate,
        staff_name: staffName,
        status: 'invalid',
        notes: 'التذكرة ملغاة من المنظم',
      });

      return {
        status: 'invalid',
        message: 'هذه التذكرة تم إلغاؤها من قبل المنظم.',
        ticket,
        scannedAt: now,
      };
    }

    // Check Gate Match if ticket has an assigned gate and scanner is locked to a specific gate
    const ticketGate = (ticket.gate || ticket.gate_number || '').trim();
    const isGateLocked = gate && gate !== 'all' && gate !== 'جميع البوابات' && gate !== 'الوضع العام' && gate.trim() !== '';

    if (isGateLocked && ticketGate !== '' && ticketGate.toLowerCase() !== gate.trim().toLowerCase()) {
      // Gate Mismatch: Keep ticket VALID and do NOT mark checked in!
      this.addScanLog({
        event_id: ticket.event_id,
        ticket_id: ticket.id,
        ticket_code: ticket.ticket_code,
        buyer_name: ticket.buyer_name,
        tier_name: ticket.tier_name,
        gate,
        staff_name: staffName,
        status: 'wrong_gate',
        notes: `محاولة دخول من ${gate} والتذكرة مخصصة لـ ${ticketGate}`,
      });

      return {
        status: 'wrong_gate',
        message: `⚠️ بوابة خاطئة! هذه التذكرة مخصصة لـ (${ticketGate}) فقط. التذكرة لا تزال صالحة وغير مستهلكة، يرجى توجيه الزائر لبوابته المخصصة.`,
        ticket,
        scannedAt: now,
        expectedGate: ticketGate,
        currentGate: gate,
      };
    }

    // Mark as Checked In (Consumed once only at the right gate!)
    const updatedTicket: Ticket = {
      ...ticket,
      status: 'checked_in',
      checked_in_at: now,
      checked_in_by: staffName,
      gate_number: gate,
    };

    tickets[ticketIndex] = updatedTicket;
    setLocalTickets(tickets);

    // Update staff total scan count and last scan time
    const staffList = getLocalGateStaff();
    const staffIndex = staffList.findIndex(
      (s) => s.name.trim().toLowerCase() === staffName.trim().toLowerCase() || s.pin_code === staffName
    );
    if (staffIndex !== -1) {
      staffList[staffIndex] = {
        ...staffList[staffIndex],
        total_scans_count: (staffList[staffIndex].total_scans_count || 0) + 1,
        last_scan_at: now,
      };
      setLocalGateStaff(staffList);
      if (supabase) {
        supabase
          .from('gate_staff')
          .update({
            total_scans_count: staffList[staffIndex].total_scans_count,
            last_scan_at: now,
          })
          .eq('id', staffList[staffIndex].id)
          .then();
      }
    }

    // Record successful scan log
    this.addScanLog({
      event_id: ticket.event_id,
      ticket_id: ticket.id,
      ticket_code: ticket.ticket_code,
      buyer_name: ticket.buyer_name,
      tier_name: ticket.tier_name,
      gate,
      staff_name: staffName,
      status: 'valid',
      notes: 'تم الدخول بنجاح',
    });

    // Sync with remote Supabase
    if (supabase) {
      try {
        await supabase
          .from('tickets')
          .update({
            status: 'checked_in',
            checked_in_at: now,
            checked_in_by: staffName,
            gate_number: gate,
          })
          .eq('id', ticket.id);
      } catch (err) {
        console.warn('Remote check-in sync warning:', err);
      }
    }

    return {
      status: 'valid',
      message: 'تذكرة صحيحة ومؤكدة! تفضل بالدخول.',
      ticket: updatedTicket,
      scannedAt: now,
    };
  },

  // ==================== GATE STAFF MANAGEMENT ====================
  async getGateStaff(organizerId?: string): Promise<GateStaff[]> {
    if (supabase) {
      try {
        let query = supabase.from('gate_staff').select('*');
        if (organizerId) query = query.eq('organizer_id', organizerId);
        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          safeSetLocalStorage(GATE_STAFF_STORAGE_KEY, JSON.stringify(data));
          return data as GateStaff[];
        }
      } catch (e) {
        console.warn('Fetch gate staff from Supabase warning:', e);
      }
    }
    const all = getLocalGateStaff();
    if (!organizerId) return all;
    return all.filter((s) => s.organizer_id === organizerId);
  },

  async addGateStaff(staffData: Omit<GateStaff, 'id' | 'total_scans_count' | 'created_at'>): Promise<GateStaff> {
    const newStaff: GateStaff = {
      ...staffData,
      id: 'staff-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 5),
      total_scans_count: 0,
      created_at: new Date().toISOString(),
    };

    const current = getLocalGateStaff();
    setLocalGateStaff([newStaff, ...current]);

    if (supabase) {
      supabase.from('gate_staff').insert([newStaff]).then();
    }

    return newStaff;
  },

  async updateGateStaff(staffId: string, updates: Partial<GateStaff>): Promise<GateStaff | null> {
    const current = getLocalGateStaff();
    const idx = current.findIndex((s) => s.id === staffId);
    if (idx === -1) return null;

    current[idx] = { ...current[idx], ...updates };
    setLocalGateStaff(current);

    if (supabase) {
      supabase.from('gate_staff').update(updates).eq('id', staffId).then();
    }

    return current[idx];
  },

  async deleteGateStaff(staffId: string): Promise<boolean> {
    const current = getLocalGateStaff();
    const filtered = current.filter((s) => s.id !== staffId);
    setLocalGateStaff(filtered);

    if (supabase) {
      supabase.from('gate_staff').delete().eq('id', staffId).then();
    }

    return true;
  },

  // ==================== SCAN LOGS & REALTIME FEED ====================
  async getScanLogs(eventId?: string): Promise<ScanLogEntry[]> {
    if (supabase) {
      try {
        let query = supabase.from('scan_logs').select('*').order('timestamp', { ascending: false }).limit(50);
        if (eventId && eventId !== 'all') query = query.eq('event_id', eventId);
        const { data, error } = await query;
        if (!error && data) {
          safeSetLocalStorage(SCAN_LOGS_STORAGE_KEY, JSON.stringify(data));
          return data as ScanLogEntry[];
        }
      } catch (e) {
        console.warn('Fetch scan logs from Supabase warning:', e);
      }
    }
    const all = getLocalScanLogs();
    if (!eventId || eventId === 'all') return all;
    return all.filter((l) => l.event_id === eventId);
  },

  addScanLog(logData: Omit<ScanLogEntry, 'id' | 'timestamp'>): ScanLogEntry {
    const newLog: ScanLogEntry = {
      ...logData,
      id: 'log-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 5),
      timestamp: new Date().toISOString(),
    };

    const current = getLocalScanLogs();
    setLocalScanLogs([newLog, ...current]);

    if (supabase) {
      supabase.from('scan_logs').insert([newLog]).then();
    }

    return newLog;
  },

  // ==================== QUERIES ====================
  async getTicketsByEvent(eventId: string): Promise<Ticket[]> {
    if (supabase) {
      try {
        const { data, error } = await supabase.from('tickets').select('*').eq('event_id', eventId);
        if (!error && data) {
          return data as Ticket[];
        }
      } catch (e) {
        console.warn('Fetch event tickets from Supabase warning:', e);
      }
    }
    const tickets = getLocalTickets();
    return tickets.filter((t) => t.event_id === eventId);
  },

  async getTicketsByOrganizer(organizerId: string): Promise<Ticket[]> {
    if (supabase) {
      try {
        const events = await this.getEventsByOrganizer(organizerId);
        const eventIds = events.map((e) => e.id);
        if (eventIds.length > 0) {
          const { data, error } = await supabase.from('tickets').select('*').in('event_id', eventIds);
          if (!error && data) {
            return data as Ticket[];
          }
        }
      } catch (e) {
        console.warn('Fetch organizer tickets from Supabase warning:', e);
      }
    }
    const events = await this.getEventsByOrganizer(organizerId);
    const eventIds = new Set(events.map((e) => e.id));
    const tickets = getLocalTickets();
    return tickets.filter((t) => eventIds.has(t.event_id));
  },

  async getOrdersByOrganizer(organizerId: string): Promise<Order[]> {
    if (supabase) {
      try {
        const { data, error } = await supabase.from('orders').select('*').eq('organizer_id', organizerId);
        if (!error && data) {
          return data as Order[];
        }
      } catch (e) {
        console.warn('Fetch organizer orders from Supabase warning:', e);
      }
    }
    const orders = getLocalOrders();
    return orders.filter((o) => o.organizer_id === organizerId);
  },

  async getMyTickets(emailOrPhone?: string): Promise<Ticket[]> {
    if (supabase && emailOrPhone) {
      try {
        const { data, error } = await supabase
          .from('tickets')
          .select('*')
          .or(`buyer_email.ilike.%${emailOrPhone}%,buyer_phone.ilike.%${emailOrPhone}%`);
        if (!error && data) {
          return data as Ticket[];
        }
      } catch (e) {
        console.warn('Fetch my tickets from Supabase warning:', e);
      }
    }
    const all = getLocalTickets();
    if (!emailOrPhone) return all;
    return all.filter(
      (t) =>
        t.buyer_email.toLowerCase().includes(emailOrPhone.toLowerCase()) ||
        t.buyer_phone.includes(emailOrPhone)
    );
  },
};
