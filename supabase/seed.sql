-- TikTak Seed Data Script
-- Run this once to populate initial demo organizers, events, tiers, and gate staff

INSERT INTO organizers (id, email, name, phone, organization_name, logo_url, created_at, payment_methods)
VALUES 
(
  'org-tech-sa',
  'contact@sdaia.gov.sa',
  'المهندس عبد الله الشمري',
  '+966 50 111 2233',
  'الهيئة للفعاليات والمؤتمرات التقنية',
  '/logo.png',
  '2026-08-01T08:00:00Z',
  '{"stripe": {"enabled": true, "account_id": "acct_sdaia_tech_2026", "currency": "SAR", "publishable_key": "pk_live_51Mza...sdaia_live"}, "bankak": {"enabled": true, "account_name": "شركة تنظيم الفعاليات والمؤتمرات", "phone_number": "0912345678", "instructions": "يرجى إرسال إشعار التحويل عبر التطبيق لتوثيق التذكرة فورياً", "account_number": "2840195"}, "vodafone_cash": {"enabled": true, "wallet_name": "مؤسسة الفعاليات", "instructions": "تحويل كاش على المحفظة مع إرفاق رقم العملية", "wallet_number": "01012345678"}}'::jsonb
),
(
  'org-rotana-live',
  'info@rotanalive.com',
  'سالم الهندي',
  '+966 55 222 3344',
  'مجموعة روتانا للترفيه والموسيقى',
  '/logo.png',
  '2026-08-15T10:00:00Z',
  '{"stripe": {"enabled": true, "account_id": "acct_rotana_live", "currency": "USD", "publishable_key": "pk_live_8849...rotana"}, "bankak": {"enabled": true, "account_name": "مجموعة روتانا للصوتيات", "phone_number": "0998765432", "account_number": "3190842"}, "vodafone_cash": {"enabled": true, "wallet_name": "روتانا كاش", "wallet_number": "01099887766"}}'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  organization_name = EXCLUDED.organization_name,
  payment_methods = EXCLUDED.payment_methods;

INSERT INTO events (
  id, organizer_id, organizer_name, title, tagline, description, category, venue_name, city, country, 
  currency, currency_code, address, start_date, end_date, sales_start_date, sales_end_date,
  logo_url, banner_url, ticket_bg_url, ticket_theme, total_capacity, status, featured, created_at,
  card_image_zoom, card_image_position_y, ticket_image_height, ticket_image_fit, ticket_image_position_y, ticket_image_zoom
)
VALUES
(
  'evt-riyadh-tech-2026',
  'org-tech-sa',
  'الهيئة للفعاليات والمؤتمرات التقنية',
  'مؤتمر الذكاء الاصطناعي والتقنية المتقدمة 2026',
  'أكبر تجمع لخبراء التقنية ورواد الذكاء الاصطناعي في الشرق الأوسط',
  'انضم إلينا في ثلاث أيام من الإلهام والابتكار، حيث يلتقي أكثر من 50 متحدثاً عالمياً لمناقشة مستقبل الذكاء الاصطناعي التوليدي، الحوسبة السحابية، وإنترنت الأشياء مع ورش عمل تطبيقية وجلسات تواصل حصرية.',
  'technology',
  'مركز الملك عبد العزيز الدولي للمؤتمرات',
  'الرياض',
  'المملكة العربية السعودية',
  'ر.س',
  'SAR',
  'طريق الملك عبد العزيز، الرياض، المملكة العربية السعودية',
  '2026-11-15T09:00:00Z',
  '2026-11-17T18:00:00Z',
  '2026-09-01T00:00:00Z',
  '2026-11-15T09:00:00Z',
  '/logo.png',
  'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&auto=format&fit=crop&q=80',
  'royal_gold',
  1500,
  'published',
  true,
  '2026-09-01T10:00:00Z',
  100, 50, 180, 'cover', 50, 100
),
(
  'evt-dubai-music-nights',
  'org-rotana-live',
  'مجموعة روتانا للترفيه والموسيقى',
  'ليالي الموسيقى العربية في دبي أوبرا',
  'أمسية طربية استثنائية تجمع نخبة من ألمع نجوم الفن العربي الأصيل',
  'عش تجربة فنية ساحرة في قلب دبي مع أوركسترا موسيقية متكاملة وأجواء راقية لا تُنسى بصحبة عمالقة الغناء والموسيقى الشرقية.',
  'music',
  'دبي أوبرا',
  'دبي',
  'الإمارات العربية المتحدة',
  'د.إ',
  'AED',
  'وسط مدينة دبي، بالقرب من برج خليفة، الإمارات',
  '2026-12-05T20:00:00Z',
  '2026-12-05T23:30:00Z',
  '2026-10-01T00:00:00Z',
  '2026-12-05T20:00:00Z',
  '/logo.png',
  'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1200&auto=format&fit=crop&q=80',
  'neon_purple',
  2000,
  'published',
  true,
  '2026-09-05T12:00:00Z',
  100, 50, 180, 'cover', 50, 100
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  start_date = EXCLUDED.start_date,
  status = EXCLUDED.status;

INSERT INTO ticket_tiers (id, event_id, name, price, capacity, sold_count, perks, color_hex, is_active, gate)
VALUES
(
  'tier-riyadh-general',
  'evt-riyadh-tech-2026',
  'تذكرة عامة - General Pass',
  150,
  1000,
  12,
  '["حضور جميع الجلسات الرئيسية", "دخول منطقة المعرض والشركات", "شهادة حضور إلكترونية"]'::jsonb,
  '#3b82f6',
  true,
  'البوابة الرئيسية (A)'
),
(
  'tier-riyadh-vip',
  'evt-riyadh-tech-2026',
  'تذكرة VIP - رجال الأعمال',
  450,
  300,
  4,
  '["مقاعد الصفوف الأولى", "دخول صالة كبار الشخصيات VIP", "غداء عمل وتواصل حصري مع المتحدثين", "خدمة صف السيارات مجاناً"]'::jsonb,
  '#eab308',
  true,
  'بوابة كبار الشخصيات (VIP)'
),
(
  'tier-dubai-silver',
  'evt-dubai-music-nights',
  'الفئة الفضية - Silver Pass',
  250,
  800,
  20,
  '["مقعد مخصص في الطابق الأرضي", "مشروب ترحيبي مجاني"]'::jsonb,
  '#94a3b8',
  true,
  'البوابة الجنوبية (B)'
),
(
  'tier-dubai-gold',
  'evt-dubai-music-nights',
  'الفئة الذهبية - Gold Pass',
  550,
  500,
  8,
  '["مقاعد أمامية ممتازة", "ضيافة فاخرة قبل العرض", "بروشور تذكاري موقع"]'::jsonb,
  '#f59e0b',
  true,
  'البوابة الرئيسية (A)'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO gate_staff (id, organizer_id, name, role, phone, pin_code, assigned_gate, assigned_event_id, is_active, total_scans_count, created_at)
VALUES
(
  'staff-1',
  'org-tech-sa',
  'أحمد بن خالد الرويلي',
  'مشرف البوابة الرئيسية (A)',
  '+966 50 111 2222',
  '1001',
  'البوابة الرئيسية (A)',
  'all',
  true,
  84,
  '2026-09-01T10:00:00Z'
),
(
  'staff-2',
  'org-tech-sa',
  'سارة عبد الرحمن الناصر',
  'مسؤولة بوابة VIP',
  '+966 55 333 4444',
  '2002',
  'بوابة كبار الشخصيات (VIP)',
  'all',
  true,
  32,
  '2026-09-01T10:00:00Z'
)
ON CONFLICT (id) DO NOTHING;
