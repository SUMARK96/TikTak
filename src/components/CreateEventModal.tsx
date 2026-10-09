import React, { useState } from 'react';
import {
  X,
  Plus,
  Trash2,
  Calendar,
  MapPin,
  Sparkles,
  Upload,
  Image as ImageIcon,
  Wand2,
  Check,
  Eye,
  Layers,
  Palette,
  DoorClosed,
  Globe,
  Clock,
  CreditCard,
  Building,
  Smartphone,
  CheckCircle2,
  ShieldCheck,
  Sliders,
  ZoomIn,
  Move,
  Maximize2
} from 'lucide-react';
import { EventItem, TicketTier, TicketDesignTheme } from '../types';
import { dbService, getCurrentOrganizerSession } from '../lib/database';
import { TicketCard } from './TicketCard';
import { COUNTRIES, getCountryConfig, formatPriceWithCurrency } from '../lib/countryUtils';
import { compressImageFile } from '../lib/imageUtils';

interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEventCreated: (event: EventItem) => void;
}

export const CreateEventModal: React.FC<CreateEventModalProps> = ({
  isOpen,
  onClose,
  onEventCreated,
}) => {
  const currentOrganizer = getCurrentOrganizerSession();

  const [title, setTitle] = useState('');
  const [organizerName, setOrganizerName] = useState(currentOrganizer?.organization_name || 'مؤسسة الفعاليات الاحترافية');
  const [tagline, setTagline] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<EventItem['category']>('technology');
  
  // Country & Dynamic Currency
  const [country, setCountry] = useState('المملكة العربية السعودية');
  const countryConfig = getCountryConfig(country);

  const [city, setCity] = useState('الرياض');
  const [venueName, setVenueName] = useState('');
  const [address, setAddress] = useState('');
  const [startDate, setStartDate] = useState('2026-11-20T18:00');
  const [endDate, setEndDate] = useState('2026-11-20T22:00');
  
  // Ticket Sales Timing (تاريخ وتوقيت بدء وانتهاء بيع التذاكر)
  const [salesStartDate, setSalesStartDate] = useState(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  });
  const [salesEndDate, setSalesEndDate] = useState('2026-11-20T18:00');
  
  // Event Cover & Logo Images
  const [bannerUrl, setBannerUrl] = useState('https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&auto=format&fit=crop&q=80');
  const [logoUrl, setLogoUrl] = useState(
    currentOrganizer?.logo_url && !currentOrganizer.logo_url.includes('logo.png')
      ? currentOrganizer.logo_url
      : ''
  );

  // Event Card Image Adjustments (موضع وتقريب صورة بطاقة الفعالية)
  const [cardImageZoom, setCardImageZoom] = useState(100);
  const [cardImagePosY, setCardImagePosY] = useState(50);

  // Ticket Image & Visual Layout Adjustments (موضع وحجم صورة التذكرة)
  const [ticketImageHeight, setTicketImageHeight] = useState(180);
  const [ticketImageFit, setTicketImageFit] = useState<'cover' | 'contain'>('cover');
  const [ticketImagePosY, setTicketImagePosY] = useState(50);
  const [ticketImageZoom, setTicketImageZoom] = useState(100);

  // AI Ticket Design State (Optional)
  const [enableAiDesign, setEnableAiDesign] = useState(false);
  const [ticketBgUrl, setTicketBgUrl] = useState('');
  const [ticketTheme, setTicketTheme] = useState<TicketDesignTheme>('modern_dark');
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [aiSuggestionsGenerated, setAiSuggestionsGenerated] = useState(false);

  // Active Wizard Tab
  const [activeTab, setActiveTab] = useState<'info' | 'design' | 'tickets' | 'payments'>('info');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Payment Methods per Event State
  const [eventPaymentMethods, setEventPaymentMethods] = useState<{
    stripe: { enabled: boolean; publishable_key: string };
    bankak: { enabled: boolean; account_number: string; account_name: string; instructions: string };
    vodafone_cash: { enabled: boolean; wallet_number: string; instructions: string };
  }>(() => {
    const orgPayments = currentOrganizer?.payment_methods;
    return {
      stripe: {
        enabled: orgPayments?.stripe?.enabled ?? true,
        publishable_key: orgPayments?.stripe?.publishable_key || 'pk_live_stripe_sample_key',
      },
      bankak: {
        enabled: orgPayments?.bankak?.enabled ?? true,
        account_number: orgPayments?.bankak?.account_number || '2840195',
        account_name: orgPayments?.bankak?.account_name || currentOrganizer?.organization_name || 'حساب المنظم',
        instructions: orgPayments?.bankak?.instructions || 'يرجى إرفاق إشعار التحويل من تطبيق بنكك بعد إتمام العملية.',
      },
      vodafone_cash: {
        enabled: orgPayments?.vodafone_cash?.enabled ?? true,
        wallet_number: orgPayments?.vodafone_cash?.wallet_number || currentOrganizer?.phone || '01012345678',
        instructions: orgPayments?.vodafone_cash?.instructions || 'تحويل مباشر إلى رقم محفظة فودافون كاش',
      },
    };
  });

  // Ticket tiers state with gate assignment
  const [tiers, setTiers] = useState<Array<Omit<TicketTier, 'id' | 'event_id' | 'sold_count'> & { hasCustomGate?: boolean }>>([
    {
      name: 'تذكرة عامة',
      price: 100,
      capacity: 200,
      perks: [],
      color_hex: '#6366f1',
      is_active: true,
      gate: 'البوابة الرئيسية (A)',
      hasCustomGate: false,
    },
    {
      name: 'تذكرة كبار الشخصيات VIP',
      price: 350,
      capacity: 50,
      perks: [],
      color_hex: '#f59e0b',
      is_active: true,
      gate: 'بوابة كبار الشخصيات (VIP)',
      hasCustomGate: true,
    }
  ]);

  if (!isOpen) return null;

  // Handle Cover Banner Image File Upload with automatic compression
  const handleBannerFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImageFile(file, 1000, 1000, 0.75);
        setBannerUrl(compressed);
        if (!ticketBgUrl) {
          setTicketBgUrl(compressed);
        }
      } catch (err) {
        console.error('Error compressing banner:', err);
      }
    }
  };

  // Handle Ticket Design Artwork File Upload with automatic compression
  const handleTicketArtworkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImageFile(file, 1000, 1000, 0.75);
        setTicketBgUrl(compressed);
      } catch (err) {
        console.error('Error compressing ticket artwork:', err);
      }
    }
  };

  // AI Gemini Design Generator
  const handleGenerateAiDesign = () => {
    if (!ticketBgUrl && !bannerUrl) {
      alert('يرجى إدراج صورة أولاً (غلاف الفعالية أو صورة تصميم) ليقوم الذكاء الاصطناعي ببناء التصاميم المقترحة على أساسها.');
      return;
    }

    setIsAiGenerating(true);
    setTimeout(() => {
      setIsAiGenerating(false);
      setAiSuggestionsGenerated(true);
      setTicketTheme('royal_gold');
    }, 1200);
  };

  const handleAddTier = () => {
    setTiers([
      ...tiers,
      {
        name: `فئة إضافية ${tiers.length + 1}`,
        price: 150,
        capacity: 100,
        perks: [],
        color_hex: '#10b981',
        is_active: true,
        gate: 'البوابة الرئيسية (A)',
        hasCustomGate: false,
      }
    ]);
  };

  const handleRemoveTier = (index: number) => {
    if (tiers.length <= 1) return;
    setTiers(tiers.filter((_, i) => i !== index));
  };

  const handleTierChange = (index: number, field: string, value: unknown) => {
    const updated = [...tiers];
    updated[index] = { ...updated[index], [field]: value };
    setTiers(updated);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    // 1. Validate Event Title
    if (!title.trim()) {
      alert('يرجى إدخال اسم / عنوان الفعالية أولاً في تبويب «تفاصيل الفعالية».');
      setActiveTab('info');
      return;
    }

    // 2. Validate Venue
    if (!venueName.trim()) {
      alert('يرجى إدخال اسم المكان / القاعة في تبويب «تفاصيل الفعالية».');
      setActiveTab('info');
      return;
    }

    // 3. Validate Tiers
    if (!tiers || tiers.length === 0) {
      alert('يرجى إضافة فئة تذاكر واحدة على الأقل في تبويب «فئات التذاكر».');
      setActiveTab('tickets');
      return;
    }

    // 4. Check if at least one payment method is enabled
    const hasAnyPayment =
      eventPaymentMethods.stripe.enabled ||
      eventPaymentMethods.bankak.enabled ||
      eventPaymentMethods.vodafone_cash.enabled;

    if (!hasAnyPayment) {
      alert('يرجى تفعيل وسيلة دفع واحدة على الأقل في تبويب «طرق الدفع والتحصيل» لتتمكن من بيع التذاكر للجمهور.');
      setActiveTab('payments');
      return;
    }

    setIsSubmitting(true);
    try {
      const totalCap = tiers.reduce((acc, t) => acc + (Number(t.capacity) || 0), 0);

      const cleanedTiers: TicketTier[] = tiers.map((t, idx) => ({
        id: `tier-${idx}`,
        event_id: '',
        name: t.name || `فئة ${idx + 1}`,
        price: Number(t.price) || 0,
        capacity: Number(t.capacity) || 100,
        sold_count: 0,
        perks: t.perks || [],
        color_hex: t.color_hex,
        is_active: t.is_active ?? true,
        gate: t.hasCustomGate ? t.gate : undefined,
      }));

      const parseSafeDate = (val: string, fallbackHours = 0) => {
        try {
          const d = val ? new Date(val) : new Date(Date.now() + fallbackHours * 3600000);
          return isNaN(d.getTime()) ? new Date(Date.now() + fallbackHours * 3600000).toISOString() : d.toISOString();
        } catch {
          return new Date(Date.now() + fallbackHours * 3600000).toISOString();
        }
      };

      const created = await dbService.createEvent({
        organizer_id: currentOrganizer?.id || ('org-' + Date.now().toString(36)),
        organizer_name: organizerName || currentOrganizer?.organization_name || 'المنظم',
        title: title.trim(),
        tagline: tagline.trim(),
        description: description.trim(),
        category,
        country: countryConfig.name,
        currency: countryConfig.currency,
        currency_code: countryConfig.currencyCode,
        venue_name: venueName.trim(),
        city: city.trim() || 'الرياض',
        address: address.trim(),
        start_date: parseSafeDate(startDate, 24),
        end_date: parseSafeDate(endDate, 28),
        sales_start_date: salesStartDate ? parseSafeDate(salesStartDate, 0) : undefined,
        sales_end_date: salesEndDate ? parseSafeDate(salesEndDate, 720) : undefined,
        logo_url: logoUrl || undefined,
        banner_url: bannerUrl,
        card_image_zoom: cardImageZoom,
        card_image_position_y: cardImagePosY,
        ticket_bg_url: enableAiDesign ? (ticketBgUrl || bannerUrl) : bannerUrl,
        ticket_image_height: ticketImageHeight,
        ticket_image_fit: ticketImageFit,
        ticket_image_position_y: ticketImagePosY,
        ticket_image_zoom: ticketImageZoom,
        ticket_theme: enableAiDesign ? ticketTheme : 'modern_dark',
        total_capacity: totalCap,
        status: 'published',
        ticket_tiers: cleanedTiers,
        payment_methods: {
          stripe: eventPaymentMethods.stripe.enabled,
          bankak: eventPaymentMethods.bankak.enabled,
          vodafone_cash: eventPaymentMethods.vodafone_cash.enabled,
        },
      });

      // Synchronize organizer profile payment methods
      if (currentOrganizer?.id) {
        dbService
          .updateOrganizerPaymentMethods(currentOrganizer.id, {
            stripe: {
              enabled: eventPaymentMethods.stripe.enabled,
              publishable_key: eventPaymentMethods.stripe.publishable_key,
              currency: 'SAR',
            },
            bankak: {
              enabled: eventPaymentMethods.bankak.enabled,
              account_number: eventPaymentMethods.bankak.account_number,
              account_name: eventPaymentMethods.bankak.account_name,
              instructions: eventPaymentMethods.bankak.instructions,
            },
            vodafone_cash: {
              enabled: eventPaymentMethods.vodafone_cash.enabled,
              wallet_number: eventPaymentMethods.vodafone_cash.wallet_number,
              wallet_name: currentOrganizer.organization_name || organizerName,
              instructions: eventPaymentMethods.vodafone_cash.instructions,
            },
          })
          .catch((e) => console.warn('Sync organizer payment details warning:', e));
      }

      onEventCreated(created);
      onClose();
    } catch (err) {
      console.error('Failed to create event:', err);
      alert('حدث خطأ أثناء تدشين الفعالية. يرجى مراجعة البيانات والمحاولة مجدداً.');
      setIsSubmitting(false);
    }
  };

  // Sample Ticket Preview for AI theme visualizer and design adjuster
  const sampleTicketPreview = {
    id: 'sample-preview-ticket',
    ticket_code: 'TIK-892147-VIP',
    order_id: 'ord-preview',
    event_id: 'evt-preview',
    tier_id: 'tier-preview',
    tier_name: tiers[0]?.name || 'تذكرة عامة',
    event_title: title || 'اسم الفعالية هنا',
    event_date: startDate ? new Date(startDate).toISOString() : new Date().toISOString(),
    event_venue: `${venueName || 'اسم القاعة أو المركز'}, ${city}`,
    event_logo: logoUrl && !logoUrl.includes('logo.png') ? logoUrl : undefined,
    event_banner: bannerUrl,
    ticket_bg_url: enableAiDesign ? (ticketBgUrl || bannerUrl) : bannerUrl,
    ticket_image_height: ticketImageHeight,
    ticket_image_fit: ticketImageFit,
    ticket_image_position_y: ticketImagePosY,
    ticket_image_zoom: ticketImageZoom,
    ticket_theme: enableAiDesign ? ticketTheme : 'modern_dark',
    buyer_name: 'سلطان فهد الراجحي',
    buyer_email: 'buyer@example.com',
    buyer_phone: '+966 50 000 0000',
    price: tiers[0]?.price || 150,
    currency: countryConfig.currency,
    currency_code: countryConfig.currencyCode,
    platform_commission: (tiers[0]?.price || 150) * 0.05,
    organizer_net_amount: (tiers[0]?.price || 150) * 0.95,
    status: 'valid' as const,
    gate: tiers[0]?.hasCustomGate ? tiers[0]?.gate : undefined,
    created_at: new Date().toISOString(),
    qr_data: 'TIK-892147-VIP'
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl p-5 sm:p-7 my-auto text-slate-100 max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-indigo-400">لوحة تحكم المنظم</span>
              <h2 className="text-lg sm:text-xl font-black text-white">
                إنشاء وتدشين فعالية جديدة
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-full bg-slate-800 hover:bg-slate-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Wizard Steps Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 bg-slate-950 p-1.5 rounded-2xl my-4 border border-slate-800 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('info')}
            className={`py-2 px-2 rounded-xl transition flex items-center justify-center gap-1.5 ${
              activeTab === 'info'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>1. تفاصيل الفعالية</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('design')}
            className={`py-2 px-2 rounded-xl transition flex items-center justify-center gap-1.5 ${
              activeTab === 'design'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Palette className="w-3.5 h-3.5 text-amber-400" />
            <span>2. مظهر التذكرة</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('tickets')}
            className={`py-2 px-2 rounded-xl transition flex items-center justify-center gap-1.5 ${
              activeTab === 'tickets'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>3. فئات التذاكر</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('payments')}
            className={`py-2 px-2 rounded-xl transition flex items-center justify-center gap-1.5 ${
              activeTab === 'payments'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
            <span>4. طرق الدفع المتاحة</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* ======================= TAB 1: BASIC INFO, LOCATION & COUNTRY ======================= */}
          {activeTab === 'info' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">اسم / عنوان الفعالية:</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="مثال: مؤتمر ومعرض الابتكار والتحول الرقمي 2026"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Country Selection with Automatic Currency Link */}
              <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700/80 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-white flex items-center gap-2">
                    <Globe className="w-4 h-4 text-emerald-400" />
                    <span>بلد إقامة الفعالية (تتحدد عملة التذاكر والتحصيل بناءً عليها تلقائياً):</span>
                  </label>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-300 font-mono font-bold border border-indigo-500/30">
                    العملة: {countryConfig.currency} ({countryConfig.currencyCode})
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">اختر الدولة:</label>
                    <select
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-bold"
                    >
                      {COUNTRIES.map((c) => (
                        <option key={c.code} value={c.name}>
                          {c.flag} {c.name} ({c.currency})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">المدينة:</label>
                    <input
                      type="text"
                      required
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="الرياض، الخرطوم، القاهرة، دبي..."
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Cover Image Upload & Fine-Tuning (غلاف الفعالية والتحكم بالصورة) */}
              <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700/80 space-y-4">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-white flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-indigo-400" />
                    <span>صورة غلاف الفعالية (تظهر في بطاقة الفعالية بالصفحة الرئيسية):</span>
                  </label>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30">
                    قابلة للتعديل والتحريك ✨
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                  <div className="sm:col-span-5 relative h-36 rounded-2xl overflow-hidden bg-slate-900 border border-slate-700 shadow-inner">
                    <img
                      src={bannerUrl}
                      alt="Cover Preview"
                      style={{
                        objectPosition: `center ${cardImagePosY}%`,
                        transform: cardImageZoom !== 100 ? `scale(${cardImageZoom / 100})` : undefined,
                      }}
                      className="w-full h-full object-cover transition-all duration-200"
                    />
                    <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-slate-950/80 text-[10px] text-slate-300 backdrop-blur-sm border border-slate-800">
                      معاينة البطاقة ({cardImagePosY}%)
                    </span>
                  </div>

                  <div className="sm:col-span-7 space-y-2.5">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">رفع صورة من جهازك:</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleBannerFileUpload}
                        className="block w-full text-xs text-slate-400 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500 cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">أو رابط الصورة المباشر (URL):</label>
                      <input
                        type="url"
                        value={bannerUrl}
                        onChange={(e) => setBannerUrl(e.target.value)}
                        placeholder="https://images.unsplash.com/..."
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Cover Image Adjustment Sliders */}
                <div className="bg-slate-900/90 p-3.5 rounded-2xl border border-slate-700/60 space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                    <span className="flex items-center gap-1.5">
                      <Move className="w-3.5 h-3.5 text-indigo-400" />
                      ضبط موضع وتكبير الصورة في بطاقة الفعالية:
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setCardImagePosY(50);
                        setCardImageZoom(100);
                      }}
                      className="text-[10px] text-indigo-400 hover:underline"
                    >
                      إعادة ضبط
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    {/* Position Y */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[11px] text-slate-400">
                        <span>موضع الصورة عمودياً:</span>
                        <span className="font-mono text-indigo-300 font-bold">{cardImagePosY}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={cardImagePosY}
                        onChange={(e) => setCardImagePosY(Number(e.target.value))}
                        className="w-full accent-indigo-500 cursor-pointer"
                      />
                      <div className="flex justify-between text-[10px] text-slate-500">
                        <button type="button" onClick={() => setCardImagePosY(15)} className="hover:text-slate-300">أعلى (15%)</button>
                        <button type="button" onClick={() => setCardImagePosY(50)} className="hover:text-slate-300">وسط (50%)</button>
                        <button type="button" onClick={() => setCardImagePosY(85)} className="hover:text-slate-300">أسفل (85%)</button>
                      </div>
                    </div>

                    {/* Zoom */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[11px] text-slate-400">
                        <span>حجم وتقريب الصورة (Zoom):</span>
                        <span className="font-mono text-indigo-300 font-bold">{cardImageZoom}%</span>
                      </div>
                      <input
                        type="range"
                        min="100"
                        max="160"
                        step="5"
                        value={cardImageZoom}
                        onChange={(e) => setCardImageZoom(Number(e.target.value))}
                        className="w-full accent-indigo-500 cursor-pointer"
                      />
                      <div className="flex justify-between text-[10px] text-slate-500">
                        <button type="button" onClick={() => setCardImageZoom(100)} className="hover:text-slate-300">طبيعي (100%)</button>
                        <button type="button" onClick={() => setCardImageZoom(120)} className="hover:text-slate-300">تكبير (120%)</button>
                        <button type="button" onClick={() => setCardImageZoom(150)} className="hover:text-slate-300">أقصى (150%)</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">اسم المنظم / الجهة:</label>
                  <input
                    type="text"
                    required
                    value={organizerName}
                    onChange={(e) => setOrganizerName(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">تصنيف الفعالية:</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as EventItem['category'])}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white"
                  >
                    <option value="technology">تقنية وذكاء اصطناعي</option>
                    <option value="business">أعمال وريادة</option>
                    <option value="music">موسيقى وحفلات</option>
                    <option value="sports">رياضة ولياقة</option>
                    <option value="arts">فنون وثقافة</option>
                    <option value="entertainment">ترفيه عام</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">اسم المكان / القاعة / المسرح:</label>
                <input
                  type="text"
                  required
                  value={venueName}
                  onChange={(e) => setVenueName(e.target.value)}
                  placeholder="مثال: قاعة الصداقة - المسرح الكبير"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">تاريخ ووقت البداية:</label>
                  <input
                    type="datetime-local"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">تاريخ ووقت النهاية:</label>
                  <input
                    type="datetime-local"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white"
                  />
                </div>
              </div>

              {/* Ticket Sales Window Timing Control (تاريخ وتوقيت بدء وانتهاء بيع التذاكر) */}
              <div className="bg-slate-800/60 p-4 rounded-2xl border border-indigo-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-indigo-300 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-indigo-400" />
                    <span>تحديد فترة بيع التذاكر (Sales Window):</span>
                  </label>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300">
                    تحكم ذكي في زر الحجز
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  💡 <strong>ملاحظة هامة:</strong> إنشاء الفعالية لا يعني بدء بيع التذاكر مباشرة. سيظهر زر «حجز التذكرة» للمستخدمين فور حلول تاريخ وتوقيت البدء، وسيختفي تلقائياً عند انتهاء وقت البيع المحدد أدناه.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-bold text-emerald-400 mb-1">
                      🟢 تاريخ وتوقيت بدء بيع التذاكر:
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={salesStartDate}
                      onChange={(e) => setSalesStartDate(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-rose-400 mb-1">
                      🔴 تاريخ وتوقيت إغلاق بيع التذاكر:
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={salesEndDate}
                      onChange={(e) => setSalesEndDate(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('design')}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-2"
                >
                  <span>التالي: مظهر التذكرة</span>
                  <span>←</span>
                </button>
              </div>
            </div>
          )}

          {/* ======================= TAB 2: TICKET DESIGN & CUSTOMIZATION ======================= */}
          {activeTab === 'design' && (
            <div className="space-y-6">
              {/* Ticket Image & Layout Customization */}
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-700/80 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                      <Sliders className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-sm">
                        تخصيص أبعاد وموضع صورة التذكرة
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        تحمل التذكرة صورة الفعالية في الأعلى ورمز الـ QR مباشرة أسفل الصورة
                      </p>
                    </div>
                  </div>
                </div>

                {/* Sliders and Fit Toggles */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Height control */}
                  <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-300 font-semibold">ارتفاع مساحة الصورة:</span>
                      <span className="text-amber-400 font-mono font-bold">{ticketImageHeight}px</span>
                    </div>
                    <input
                      type="range"
                      min="120"
                      max="320"
                      step="10"
                      value={ticketImageHeight}
                      onChange={(e) => setTicketImageHeight(Number(e.target.value))}
                      className="w-full accent-amber-500 bg-slate-800 h-2 rounded-lg cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>مدمج (120px)</span>
                      <span>متوسط (200px)</span>
                      <span>عريض/كامل (320px)</span>
                    </div>
                  </div>

                  {/* Fit mode */}
                  <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 space-y-2">
                    <span className="text-slate-300 font-semibold text-xs block">طريقة عرض الصورة بالتذكرة:</span>
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setTicketImageFit('cover')}
                        className={`py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                          ticketImageFit === 'cover'
                            ? 'bg-amber-500 text-slate-950 shadow-md'
                            : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        <span>ملء الإطار (Cover)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setTicketImageFit('contain')}
                        className={`py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                          ticketImageFit === 'contain'
                            ? 'bg-amber-500 text-slate-950 shadow-md'
                            : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        <span>إظهار الصورة كاملة (Contain)</span>
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-400">
                      {ticketImageFit === 'contain' ? '✓ تظهر الصورة بالكامل دون أي اقتصاص لحوافها' : '✓ تملأ الصورة كامل العرض بارتفاع متناسق'}
                    </p>
                  </div>

                  {/* Vertical Position */}
                  <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-300 font-semibold">المحاذاة الرأسية للصورة:</span>
                      <span className="text-amber-400 font-mono font-bold">{ticketImagePosY}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={ticketImagePosY}
                      onChange={(e) => setTicketImagePosY(Number(e.target.value))}
                      className="w-full accent-amber-500 bg-slate-800 h-2 rounded-lg cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>الأعلى (0%)</span>
                      <span>الوسط (50%)</span>
                      <span>الأسفل (100%)</span>
                    </div>
                  </div>

                  {/* Zoom */}
                  <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-300 font-semibold">مستوى التكبير (Zoom):</span>
                      <span className="text-amber-400 font-mono font-bold">{ticketImageZoom}%</span>
                    </div>
                    <input
                      type="range"
                      min="100"
                      max="160"
                      step="5"
                      value={ticketImageZoom}
                      onChange={(e) => setTicketImageZoom(Number(e.target.value))}
                      className="w-full accent-amber-500 bg-slate-800 h-2 rounded-lg cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>طبيعي 100%</span>
                      <span>130%</span>
                      <span>160%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Theme Styling */}
              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-200">
                  اختر نمط ولون التذكرة المعتمد:
                </label>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {[
                    { id: 'royal_gold', name: '🏆 الملكي الذهبي', desc: 'أناقة ذهبية للمؤتمرات', color: 'border-amber-500/50 bg-amber-950/20' },
                    { id: 'neon_cyber', name: '⚡ النيوني التقني', desc: 'مظهر سايبر لفعاليات التقنية', color: 'border-cyan-500/50 bg-cyan-950/20' },
                    { id: 'festive_hologram', name: '🌌 الاحتفالي الهولوجرامي', desc: 'تدرجات بنفسجية وردية للحفلات', color: 'border-pink-500/50 bg-pink-950/20' },
                    { id: 'arabic_heritage', name: '🌿 التراثي الأصيل', desc: 'طابع زمردي راقي للفعاليات الثقافية', color: 'border-emerald-500/50 bg-emerald-950/20' },
                    { id: 'modern_dark', name: '💎 العصري الأنيق', desc: 'النمط الكلاسيكي لمنصة تيك تاك', color: 'border-indigo-500/50 bg-indigo-950/20' },
                  ].map((themeOpt) => {
                    const isSelected = ticketTheme === themeOpt.id;
                    return (
                      <div
                        key={themeOpt.id}
                        onClick={() => setTicketTheme(themeOpt.id as TicketDesignTheme)}
                        className={`p-3 rounded-2xl border transition cursor-pointer relative flex flex-col justify-between ${themeOpt.color} ${
                          isSelected
                            ? 'ring-2 ring-indigo-500 border-indigo-400 shadow-lg'
                            : 'opacity-80 hover:opacity-100'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-white">{themeOpt.name}</span>
                            {isSelected && <Check className="w-4 h-4 text-emerald-400" />}
                          </div>
                          <p className="text-[10px] text-slate-400 mt-1">{themeOpt.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Optional AI Design Toggle */}
              <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
                    <Wand2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm">
                      تخصيص تصميم التذكرة بالذكاء الاصطناعي (Gemini AI)
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      خيار إضافي لتوليد أنماط هولوجرامية وخلفيات مخصصة للتذكرة بناءً على صورتك
                    </p>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enableAiDesign}
                    onChange={(e) => setEnableAiDesign(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              {/* If AI Design is enabled */}
              {enableAiDesign && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="bg-gradient-to-r from-indigo-950/60 via-purple-950/40 to-slate-900 p-4 sm:p-5 rounded-2xl border border-indigo-500/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-white text-xs">إدراج صورة لتوليد تصميم التذكرة:</h4>
                        <p className="text-[11px] text-slate-400">
                          يجب إدراج صورة (أو استخدام الغلاف) ليقوم الذكاء الاصطناعي ببناء التذكرة على أساسها
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={handleGenerateAiDesign}
                        disabled={isAiGenerating}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 text-slate-950 font-black text-xs shadow-lg transition active:scale-95 disabled:opacity-50"
                      >
                        <Sparkles className="w-3.5 h-3.5 fill-slate-950" />
                        <span>{isAiGenerating ? 'جاري التوليد بـ Gemini...' : 'توليد أنماط بالذكاء الاصطناعي ✨'}</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="block text-[11px] text-slate-300 mb-1">رفع صورة تصميم مخصصة:</label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleTicketArtworkUpload}
                          className="block w-full text-xs text-slate-400 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-700 file:text-white hover:file:bg-slate-600 cursor-pointer"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] text-slate-300 mb-1">أو رابط صورة جاهزة:</label>
                        <input
                          type="url"
                          value={ticketBgUrl}
                          onChange={(e) => setTicketBgUrl(e.target.value)}
                          placeholder="https://..."
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Live Ticket Preview */}
              <div className="bg-slate-950 p-4 rounded-3xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <Eye className="w-4 h-4 text-indigo-400" />
                    معاينة حية لشكل التذكرة الإلكترونية النهائية:
                  </span>
                  <span className="text-[11px] text-indigo-400">
                    العملة: {countryConfig.currency}
                  </span>
                </div>

                <div className="flex justify-center scale-[0.88] -my-4 sm:scale-100 sm:my-0">
                  <TicketCard ticket={sampleTicketPreview} isCompact={true} />
                </div>
              </div>

              <div className="flex justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('info')}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  ← السابق
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('tickets')}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-2"
                >
                  <span>التالي: فئات التذاكر والبوابات</span>
                  <span>←</span>
                </button>
              </div>
            </div>
          )}

          {/* ======================= TAB 3: TICKET TIERS & GATE ASSIGNMENT ======================= */}
          {activeTab === 'tickets' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-white">
                    فئات التذاكر، الأسعار ({countryConfig.currency})، وبوابات الدخول المخصصة
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    يمكنك تحديد بوابة دخول مخصصة لكل فئة (إذا كانت الفعالية تتضمن بوابات متعددة)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddTier}
                  className="flex items-center gap-1 text-xs font-bold text-indigo-400 hover:text-indigo-300 bg-indigo-600/10 px-3 py-1.5 rounded-xl border border-indigo-500/20"
                >
                  <Plus className="w-3.5 h-3.5" />
                  إضافة فئة
                </button>
              </div>

              <div className="space-y-3">
                {tiers.map((tier, idx) => (
                  <div
                    key={idx}
                    className="p-4 bg-slate-800/80 rounded-2xl border border-slate-700/80 space-y-3"
                  >
                    <div className="flex items-center justify-between border-b border-slate-700/50 pb-2">
                      <span className="text-xs font-bold text-indigo-300">الفئة رقم {idx + 1}</span>
                      {tiers.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveTier(idx)}
                          className="text-slate-400 hover:text-rose-400 p-1"
                          title="حذف الفئة"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">اسم الفئة:</label>
                        <input
                          type="text"
                          value={tier.name}
                          onChange={(e) => handleTierChange(idx, 'name', e.target.value)}
                          placeholder="تذكرة عامة، VIP..."
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">
                          السعر ({countryConfig.currency}):
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={tier.price}
                          onChange={(e) => handleTierChange(idx, 'price', Number(e.target.value))}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">عدد المقاعد الكلي:</label>
                        <input
                          type="number"
                          min={1}
                          value={tier.capacity}
                          onChange={(e) => handleTierChange(idx, 'capacity', Number(e.target.value))}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                        />
                      </div>
                    </div>

                    {/* Gate Assignment Feature per Tier */}
                    <div className="pt-2 border-t border-slate-700/40 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                          <input
                            type="checkbox"
                            checked={tier.hasCustomGate || false}
                            onChange={(e) => handleTierChange(idx, 'hasCustomGate', e.target.checked)}
                            className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="flex items-center gap-1">
                            <DoorClosed className="w-3.5 h-3.5 text-emerald-400" />
                            تخصيص بوابة دخول محددة لهذه الفئة (إلزامية المسح عند تلك البوابة)
                          </span>
                        </label>
                      </div>

                      {tier.hasCustomGate && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 animate-fadeIn">
                          <div>
                            <label className="block text-[10px] text-slate-400 mb-1">
                              اختر أو اكتب اسم البوابة:
                            </label>
                            <input
                              type="text"
                              value={tier.gate || ''}
                              onChange={(e) => handleTierChange(idx, 'gate', e.target.value)}
                              placeholder="مثال: البوابة الشرقية (VIP) أو بوابة 1"
                              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-emerald-300 font-bold placeholder:text-slate-600"
                            />
                          </div>

                          <div className="flex flex-wrap items-center gap-1 self-end pb-0.5">
                            {['البوابة الرئيسية (A)', 'بوابة كبار الشخصيات (VIP)', 'بوابة العائلات (B)', 'البوابة 2'].map((gatePreset) => (
                              <button
                                key={gatePreset}
                                type="button"
                                onClick={() => handleTierChange(idx, 'gate', gatePreset)}
                                className="text-[10px] px-2 py-1 rounded bg-slate-900 hover:bg-slate-700 text-slate-300 border border-slate-700"
                              >
                                {gatePreset}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Navigation to Payments Tab */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setActiveTab('design')}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                >
                  ← السابق: مظهر التذكرة
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('payments')}
                  className="py-3 px-5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 font-bold text-xs text-white shadow-lg shadow-indigo-600/30 transition active:scale-[0.98] flex items-center gap-1.5"
                >
                  <span>التالي: تحديد طرق الدفع والتحصيل</span>
                  <CreditCard className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ======================= TAB 4: PAYMENT METHODS FOR THIS EVENT ======================= */}
          {activeTab === 'payments' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700/80 space-y-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-sm font-bold text-white">
                    تحديد طرق الدفع المباشر الخاصة بهذه الفعالية
                  </h3>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  اختر من حساباتك وبواباتك المربوطة أي الطرق تريد إتاحتها للمشترين لحجز تذاكر هذه الفعالية. الطرق المفعلة فقط هي التي ستظهر للجمهور عند الحجز.
                </p>
              </div>

              {/* Payment Methods Selection Cards */}
              <div className="space-y-3">
                {/* 1. Stripe Card */}
                <div
                  className={`p-4 rounded-2xl border transition ${
                    eventPaymentMethods.stripe.enabled
                      ? 'bg-indigo-600/10 border-indigo-500/60 shadow-lg shadow-indigo-500/5'
                      : 'bg-slate-800/40 border-slate-700/60 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-black text-sm border border-indigo-500/30">
                        S
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm">بوابة Stripe (بطاقات فيزا / ماستركارد / Apple Pay)</span>
                          {eventPaymentMethods.stripe.enabled ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                              مفعلة وتظهر للجمهور ✅
                            </span>
                          ) : (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-700 text-slate-400 font-bold">
                              معطلة لهذه الفعالية ✕
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          دفع فوري بالبطاقات الدولية والمحلية لحساب المنظم
                        </p>
                      </div>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={eventPaymentMethods.stripe.enabled}
                        onChange={(e) =>
                          setEventPaymentMethods({
                            ...eventPaymentMethods,
                            stripe: { ...eventPaymentMethods.stripe, enabled: e.target.checked },
                          })
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>

                  {eventPaymentMethods.stripe.enabled && (
                    <div className="mt-3 pt-3 border-t border-slate-700/50">
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">
                        المفتاح العام للمنظم (Publishable Key):
                      </label>
                      <input
                        type="text"
                        value={eventPaymentMethods.stripe.publishable_key}
                        onChange={(e) =>
                          setEventPaymentMethods({
                            ...eventPaymentMethods,
                            stripe: { ...eventPaymentMethods.stripe, publishable_key: e.target.value },
                          })
                        }
                        placeholder="pk_live_..."
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono text-left"
                      />
                    </div>
                  )}
                </div>

                {/* 2. Bankak Sudan Card */}
                <div
                  className={`p-4 rounded-2xl border transition ${
                    eventPaymentMethods.bankak.enabled
                      ? 'bg-emerald-600/10 border-emerald-500/60 shadow-lg shadow-emerald-500/5'
                      : 'bg-slate-800/40 border-slate-700/60 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                        <Building className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm">تطبيق بنكك (بنك الخرطوم - السودان 🇸🇩)</span>
                          {eventPaymentMethods.bankak.enabled ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                              مفعلة وتظهر للجمهور ✅
                            </span>
                          ) : (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-700 text-slate-400 font-bold">
                              معطلة لهذه الفعالية ✕
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          تحويل مباشر لحساب بنكك الخاص بالمنظم مع إرفاق رقم أو إشعار التحويل
                        </p>
                      </div>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={eventPaymentMethods.bankak.enabled}
                        onChange={(e) =>
                          setEventPaymentMethods({
                            ...eventPaymentMethods,
                            bankak: { ...eventPaymentMethods.bankak, enabled: e.target.checked },
                          })
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>

                  {eventPaymentMethods.bankak.enabled && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 pt-3 border-t border-slate-700/50">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-300 mb-1">
                          رقم حساب بنكك (Account Number):
                        </label>
                        <input
                          type="text"
                          value={eventPaymentMethods.bankak.account_number}
                          onChange={(e) =>
                            setEventPaymentMethods({
                              ...eventPaymentMethods,
                              bankak: { ...eventPaymentMethods.bankak, account_number: e.target.value },
                            })
                          }
                          placeholder="مثال: 2840195"
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono text-left"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-300 mb-1">
                          اسم صاحب الحساب بالكامل:
                        </label>
                        <input
                          type="text"
                          value={eventPaymentMethods.bankak.account_name}
                          onChange={(e) =>
                            setEventPaymentMethods({
                              ...eventPaymentMethods,
                              bankak: { ...eventPaymentMethods.bankak, account_name: e.target.value },
                            })
                          }
                          placeholder="الاسم المسجل في بنك الخرطوم"
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-bold text-slate-300 mb-1">
                          تعليمات التحويل للمشتري:
                        </label>
                        <input
                          type="text"
                          value={eventPaymentMethods.bankak.instructions}
                          onChange={(e) =>
                            setEventPaymentMethods({
                              ...eventPaymentMethods,
                              bankak: { ...eventPaymentMethods.bankak, instructions: e.target.value },
                            })
                          }
                          placeholder="يرجى إرفاق إشعار التحويل من تطبيق بنكك بعد إتمام العملية."
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. Vodafone Cash Card */}
                <div
                  className={`p-4 rounded-2xl border transition ${
                    eventPaymentMethods.vodafone_cash.enabled
                      ? 'bg-red-600/10 border-red-500/60 shadow-lg shadow-red-500/5'
                      : 'bg-slate-800/40 border-slate-700/60 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-red-600/20 text-red-400 flex items-center justify-center border border-red-500/30">
                        <Smartphone className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm">محفظة فودافون كاش (Vodafone Cash - مصر 🇪🇬)</span>
                          {eventPaymentMethods.vodafone_cash.enabled ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                              مفعلة وتظهر للجمهور ✅
                            </span>
                          ) : (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-700 text-slate-400 font-bold">
                              معطلة لهذه الفعالية ✕
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          تحويل مباشر إلى رقم محفظة فودافون كاش الخاصة بالمنظم
                        </p>
                      </div>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={eventPaymentMethods.vodafone_cash.enabled}
                        onChange={(e) =>
                          setEventPaymentMethods({
                            ...eventPaymentMethods,
                            vodafone_cash: { ...eventPaymentMethods.vodafone_cash, enabled: e.target.checked },
                          })
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>

                  {eventPaymentMethods.vodafone_cash.enabled && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 pt-3 border-t border-slate-700/50">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-300 mb-1">
                          رقم محفظة فودافون كاش:
                        </label>
                        <input
                          type="text"
                          value={eventPaymentMethods.vodafone_cash.wallet_number}
                          onChange={(e) =>
                            setEventPaymentMethods({
                              ...eventPaymentMethods,
                              vodafone_cash: { ...eventPaymentMethods.vodafone_cash, wallet_number: e.target.value },
                            })
                          }
                          placeholder="مثال: 01012345678"
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono text-left"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-300 mb-1">
                          تعليمات التحويل للعميل:
                        </label>
                        <input
                          type="text"
                          value={eventPaymentMethods.vodafone_cash.instructions}
                          onChange={(e) =>
                            setEventPaymentMethods({
                              ...eventPaymentMethods,
                              vodafone_cash: { ...eventPaymentMethods.vodafone_cash, instructions: e.target.value },
                            })
                          }
                          placeholder="تحويل مباشر عبر كود *9*7*الرقم*المبلغ#"
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Summary of Active Methods */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-400">الوسائل التي ستظهر للمشتري:</span>
                <div className="flex items-center gap-1.5 font-bold">
                  {eventPaymentMethods.stripe.enabled && (
                    <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      Stripe
                    </span>
                  )}
                  {eventPaymentMethods.bankak.enabled && (
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      بنكك 🇸🇩
                    </span>
                  )}
                  {eventPaymentMethods.vodafone_cash.enabled && (
                    <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/30">
                      فودافون كاش 🇪🇬
                    </span>
                  )}
                  {!eventPaymentMethods.stripe.enabled &&
                    !eventPaymentMethods.bankak.enabled &&
                    !eventPaymentMethods.vodafone_cash.enabled && (
                      <span className="text-rose-400">لم يتم اختيار أي وسيلة دفع!</span>
                    )}
                </div>
              </div>

              {/* Final Submit Actions */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setActiveTab('tickets')}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                >
                  ← السابق: فئات التذاكر
                </button>

                <button
                  type="button"
                  onClick={() => handleSubmit()}
                  disabled={isSubmitting}
                  className="py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 font-bold text-sm text-white shadow-xl shadow-indigo-600/30 transition active:scale-[0.98] disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>
                    {isSubmitting
                      ? 'جاري نشر وتدشين الفعالية...'
                      : `نشر وتدشين الفعالية الآن (${countryConfig.currency}) 🚀`}
                  </span>
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};
