import { createClient } from '@supabase/supabase-js';

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://bhxhrigfwoanhmwacljm.supabase.co';
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJoeGhyaWdmd29hbmhtd2FjbGptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEzNzAzNjMsImV4cCI6MjEwNjk0NjM2M30.V5asmXVOI3xFLCtWxOoVqm2Bc6x5dgH4Ic8281lwNxQ';

  const { events, organizers, gate_staff, tickets } = req.body || {};

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    let syncedEvents = 0;
    let syncedTiers = 0;

    if (Array.isArray(events) && events.length > 0) {
      for (const ev of events) {
        const { error: evError } = await supabase.from('events').upsert([
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
            created_at: ev.created_at || new Date().toISOString(),
          },
        ]);

        if (!evError) syncedEvents++;

        if (Array.isArray(ev.ticket_tiers) && ev.ticket_tiers.length > 0) {
          const { error: tierError } = await supabase.from('ticket_tiers').upsert(
            ev.ticket_tiers.map((t: any) => ({ ...t, event_id: ev.id }))
          );
          if (!tierError) syncedTiers += ev.ticket_tiers.length;
        }
      }
    }

    if (Array.isArray(organizers) && organizers.length > 0) {
      await supabase.from('organizers').upsert(organizers);
    }

    if (Array.isArray(gate_staff) && gate_staff.length > 0) {
      await supabase.from('gate_staff').upsert(gate_staff);
    }

    if (Array.isArray(tickets) && tickets.length > 0) {
      await supabase.from('tickets').upsert(tickets);
    }

    return res.status(200).json({
      success: true,
      synced_events: syncedEvents,
      synced_tiers: syncedTiers,
      message: 'All local data successfully migrated to Supabase cloud!',
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err?.message || 'Failed to sync data to Supabase',
    });
  }
}
