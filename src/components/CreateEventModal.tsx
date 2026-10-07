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
  Clock
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
  const [logoUrl, setLogoUrl] = useState(currentOrganizer?.logo_url || '/logo.png');

  // AI Ticket Design State (Optional)
  const [enableAiDesign, setEnableAiDesign] = useState(false);
  const [ticketBgUrl, setTicketBgUrl] = useState('');
  const [ticketTheme, setTicketTheme] = useState<TicketDesignTheme>('modern_dark');
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [aiSuggestionsGenerated, setAiSuggestionsGenerated] = useState(false);

  const [activeTab, setActiveTab] = useState<'info' | 'design' | 'tickets'>('info');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !venueName) return;

    setIsSubmitting(true);
    try {
      const totalCap = tiers.reduce((acc, t) => acc + Number(t.capacity), 0);

      const cleanedTiers: TicketTier[] = tiers.map((t, idx) => ({
        id: `tier-${idx}`,
        event_id: '',
        name: t.name,
        price: Number(t.price),
        capacity: Number(t.capacity),
        sold_count: 0,
        perks: t.perks,
        color_hex: t.color_hex,
        is_active: t.is_active,
        gate: t.hasCustomGate ? t.gate : undefined,
      }));

      const created = await dbService.createEvent({
        organizer_id: currentOrganizer?.id || ('org-' + Date.now().toString(36)),
        organizer_name: organizerName,
        title,
        tagline,
        description,
        category,
        country: countryConfig.name,
        currency: countryConfig.currency,
        currency_code: countryConfig.currencyCode,
        venue_name: venueName,
        city,
        address,
        start_date: new Date(startDate).toISOString(),
        end_date: new Date(endDate).toISOString(),
        sales_start_date: salesStartDate ? new Date(salesStartDate).toISOString() : undefined,
        sales_end_date: salesEndDate ? new Date(salesEndDate).toISOString() : undefined,
        logo_url: logoUrl || '/logo.png',
        banner_url: bannerUrl,
        ticket_bg_url: enableAiDesign ? (ticketBgUrl || bannerUrl) : undefined,
        ticket_theme: enableAiDesign ? ticketTheme : 'modern_dark',
        total_capacity: totalCap,
        status: 'published',
        ticket_tiers: cleanedTiers,
      });

      onEventCreated(created);
      onClose();
    } catch (err) {
      console.error('Failed to create event:', err);
      setIsSubmitting(false);
    }
  };

  // Sample Ticket Preview for AI theme visualizer
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
    event_logo: logoUrl || '/logo.png',
    event_banner: bannerUrl,
    ticket_bg_url: enableAiDesign ? (ticketBgUrl || bannerUrl) : undefined,
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
        <div className="flex bg-slate-950 p-1 rounded-2xl my-4 border border-slate-800 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('info')}
            className={`flex-1 py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 ${
              activeTab === 'info'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>1. تفاصيل ومكان الفعالية</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('design')}
            className={`flex-1 py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 ${
              activeTab === 'design'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Palette className="w-3.5 h-3.5 text-amber-400" />
            <span>2. مظهر وتصميم التذكرة {enableAiDesign && '(AI)'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('tickets')}
            className={`flex-1 py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 ${
              activeTab === 'tickets'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>3. فئات التذاكر وبوابات الدخول</span>
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

              {/* Cover Image Upload (غلاف الفعالية) */}
              <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700/80 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-white flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-indigo-400" />
                    <span>صورة غلاف الفعالية (تظهر في بطاقة الفعالية بالصفحة الرئيسية):</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                  <div className="sm:col-span-5 relative h-32 rounded-xl overflow-hidden bg-slate-900 border border-slate-700">
                    <img src={bannerUrl} alt="Cover Preview" className="w-full h-full object-cover" />
                    <span className="absolute bottom-1 right-1 px-2 py-0.5 rounded bg-slate-950/80 text-[10px] text-slate-300">
                      معاينة الغلاف
                    </span>
                  </div>

                  <div className="sm:col-span-7 space-y-2">
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

          {/* ======================= TAB 2: OPTIONAL AI TICKET DESIGN ======================= */}
          {activeTab === 'design' && (
            <div className="space-y-5">
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

              {/* If AI Design is disabled */}
              {!enableAiDesign && (
                <div className="p-6 rounded-3xl bg-slate-950 border border-slate-800 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-800 mx-auto flex items-center justify-center text-slate-400">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div className="font-bold text-white text-sm">القالب الرسمي المعتمد للتذاكر مفعّل</div>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    سيتم إصدار التذاكر بالقالب القياسي الأنيق لمنصة تيك تاك مع شعار الفعالية ورمز QR وتفاصيل المقعد والعملة ({countryConfig.currency}).
                  </p>
                </div>
              )}

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

                  {/* AI Generated Styles */}
                  <div className="space-y-3">
                    <label className="block text-xs font-bold text-slate-200">
                      اختر نمط التذكرة المقترح:
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
                </div>
              )}

              {/* Live Ticket Preview */}
              <div className="bg-slate-950 p-4 rounded-3xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <Eye className="w-4 h-4 text-indigo-400" />
                    معاينة حية لشكل التذكرة الإلكترونية ({countryConfig.currency}):
                  </span>
                  <span className="text-[11px] text-indigo-400">
                    العملة: {countryConfig.currency}
                  </span>
                </div>

                <div className="flex justify-center scale-[0.85] -my-6 sm:scale-100 sm:my-0">
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

              {/* Submit Action */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setActiveTab('design')}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  ← السابق: مظهر التذكرة
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="py-3.5 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-500 font-bold text-sm text-white shadow-xl shadow-indigo-600/30 transition active:scale-[0.98] disabled:opacity-50 flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{isSubmitting ? 'جاري نشر وتدشين الفعالية...' : `نشر وتدشين الفعالية الآن (${countryConfig.currency}) 🚀`}</span>
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};
