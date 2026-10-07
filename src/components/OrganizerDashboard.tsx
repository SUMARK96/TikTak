import React, { useState, useEffect } from 'react';
import {
  Plus,
  TrendingUp,
  Ticket as TicketIcon,
  Users,
  CheckCircle2,
  ScanLine,
  Download,
  Search,
  Calendar,
  DollarSign,
  Layers,
  CreditCard,
  Building,
  Smartphone,
  Save,
  LogOut,
  ShieldCheck,
  Eye,
  Check,
  Pause,
  Play,
  Trash2,
  CalendarDays,
  X,
  AlertTriangle,
  Clock
} from 'lucide-react';
import { EventItem, Organizer, OrganizerPaymentMethods, Ticket } from '../types';
import { dbService, PLATFORM_FEE_PERCENTAGE } from '../lib/database';
import { ScannerView } from './ScannerView';

interface OrganizerDashboardProps {
  organizer: Organizer;
  events: EventItem[];
  onCreateEvent: () => void;
  onLogout: () => void;
  onViewTicket: (ticket: Ticket) => void;
  onBrowseAsCustomer: () => void;
}

// Safe normalization for organizer payment methods to prevent runtime crashes from legacy stored data
const getSafePaymentMethods = (org?: Organizer | null): OrganizerPaymentMethods => {
  const raw = (org?.payment_methods as any) || {};
  return {
    stripe: {
      enabled: raw.stripe?.enabled ?? true,
      publishable_key: raw.stripe?.publishable_key || 'pk_live_organizer_key',
      account_id: raw.stripe?.account_id || '',
      currency: raw.stripe?.currency || 'SAR',
    },
    bankak: {
      enabled: raw.bankak?.enabled ?? true,
      account_number: raw.bankak?.account_number || '2849102',
      account_name: raw.bankak?.account_name || org?.organization_name || org?.name || 'حساب المنظم',
      phone_number: raw.bankak?.phone_number || org?.phone || '+249912345678',
      instructions: raw.bankak?.instructions || 'يرجى إرفاق إشعار التحويل من تطبيق بنكك بعد إتمام العملية.',
    },
    vodafone_cash: {
      enabled: raw.vodafone_cash?.enabled ?? true,
      wallet_number: raw.vodafone_cash?.wallet_number || org?.phone || '01012345678',
      wallet_name: raw.vodafone_cash?.wallet_name || org?.organization_name || org?.name || 'محفظة المنظم',
      instructions: raw.vodafone_cash?.instructions || 'قم بالتحويل عبر كود فودافون كاش *9*7*رقم المحفظة*المبلغ# وأرسل التأكيد.',
    },
  };
};

export const OrganizerDashboard: React.FC<OrganizerDashboardProps> = ({
  organizer,
  events,
  onCreateEvent,
  onLogout,
  onViewTicket,
  onBrowseAsCustomer,
}) => {
  const [activeTab, setActiveTab] = useState<'events' | 'payments' | 'attendees' | 'scanner'>('events');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'checked_in' | 'valid'>('all');
  const [organizerTickets, setOrganizerTickets] = useState<Ticket[]>([]);
  const [selectedScannerEventId, setSelectedScannerEventId] = useState<string>('');

  // Payment methods state with safe fallback
  const [paymentMethods, setPaymentMethods] = useState<OrganizerPaymentMethods>(() =>
    getSafePaymentMethods(organizer)
  );
  const [savingPayment, setSavingPayment] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Event actions state (Postpone, Pause, Delete)
  const [postponingEvent, setPostponingEvent] = useState<EventItem | null>(null);
  const [postponeStartDate, setPostponeStartDate] = useState('');
  const [postponeEndDate, setPostponeEndDate] = useState('');
  const [isPostponing, setIsPostponing] = useState(false);

  // Memoize filtered events belonging to this organizer
  const myEvents = React.useMemo(
    () => events.filter((e) => e.organizer_id === organizer.id),
    [events, organizer.id]
  );

  const handleToggleEventStatus = async (evt: EventItem) => {
    const nextStatus = evt.status === 'paused' ? 'published' : 'paused';
    await dbService.toggleEventStatus(evt.id, nextStatus);
  };

  const handleDeleteEvent = async (evt: EventItem) => {
    if (window.confirm(`هل أنت متأكد تماماً من رغبتك في حذف فعالية "${evt.title}" بشكل نهائي؟`)) {
      await dbService.deleteEvent(evt.id);
    }
  };

  const handleOpenPostponeModal = (evt: EventItem) => {
    setPostponingEvent(evt);
    setPostponeStartDate(evt.start_date.slice(0, 16));
    setPostponeEndDate(evt.end_date ? evt.end_date.slice(0, 16) : evt.start_date.slice(0, 16));
  };

  const handleSavePostpone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postponingEvent || !postponeStartDate) return;
    setIsPostponing(true);
    await dbService.postponeEvent(
      postponingEvent.id,
      new Date(postponeStartDate).toISOString(),
      new Date(postponeEndDate || postponeStartDate).toISOString()
    );
    setIsPostponing(false);
    setPostponingEvent(null);
  };

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      const tickets = await dbService.getTicketsByOrganizer(organizer.id);
      if (isMounted) {
        setOrganizerTickets(tickets);
      }
    };
    loadData();
    return () => {
      isMounted = false;
    };
  }, [organizer.id, events]);

  useEffect(() => {
    if (myEvents.length > 0 && !selectedScannerEventId) {
      setSelectedScannerEventId(myEvents[0].id);
    }
  }, [myEvents, selectedScannerEventId]);

  useEffect(() => {
    if (organizer) {
      setPaymentMethods(getSafePaymentMethods(organizer));
    }
  }, [organizer]);

  // Financial calculations
  const totalGrossRevenue = organizerTickets.reduce((acc, t) => acc + t.price, 0);
  const totalPlatformCommission = totalGrossRevenue * (PLATFORM_FEE_PERCENTAGE / 100);
  const totalNetRevenue = totalGrossRevenue - totalPlatformCommission;

  const totalTicketsIssued = organizerTickets.length;
  const totalCheckedIn = organizerTickets.filter((t) => t.status === 'checked_in').length;
  const attendanceRate = totalTicketsIssued > 0 ? Math.round((totalCheckedIn / totalTicketsIssued) * 100) : 0;

  // Filtered attendees
  const filteredTickets = organizerTickets.filter((t) => {
    const matchesSearch =
      t.buyer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.ticket_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.buyer_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.tier_name.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'checked_in' && t.status === 'checked_in') ||
      (statusFilter === 'valid' && t.status === 'valid');

    return matchesSearch && matchesStatus;
  });

  const handleSavePaymentMethods = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPayment(true);
    await dbService.updateOrganizerPaymentMethods(organizer.id, paymentMethods);
    setSavingPayment(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const exportCSV = () => {
    if (filteredTickets.length === 0) return;
    const headers = [
      'رقم التذكرة',
      'الاسم',
      'البريد',
      'الجوال',
      'الفئة',
      'الفعالية',
      'السعر الإجمالي (ر.س)',
      'عمولة المنصة 5%',
      'صافي المنظم',
      'الحالة',
      'توقيت الدخول'
    ];
    const rows = filteredTickets.map((t) => [
      t.ticket_code,
      t.buyer_name,
      t.buyer_email,
      t.buyer_phone,
      t.tier_name,
      t.event_title,
      t.price,
      t.platform_commission,
      t.organizer_net_amount,
      t.status === 'checked_in' ? 'تم الدخول' : 'صالحة وبانتظار الدخول',
      t.checked_in_at ? new Date(t.checked_in_at).toLocaleString('ar-SA') : '-'
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers, ...rows].map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `TikTak-Attendees-${organizer.organization_name}-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/70 to-slate-900 border border-indigo-500/20 rounded-3xl p-5 sm:p-7 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/5 border border-indigo-500/30 p-1 flex items-center justify-center shrink-0 shadow-lg">
              <img src="/logo.png" alt="TikTak" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-white">
                  {organizer.organization_name}
                </h1>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  منظم معتمد
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                مسؤول الحساب: {organizer.name} ({organizer.email})
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onCreateEvent}
              className="flex items-center gap-1.5 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-bold text-xs text-white shadow-lg shadow-indigo-600/30 transition active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>إنشاء فعالية جديدة</span>
            </button>

            <button
              onClick={onBrowseAsCustomer}
              className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition"
            >
              تصفح الموقع كعميل
            </button>

            <button
              onClick={onLogout}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-rose-950/40 text-rose-400 border border-slate-700 hover:border-rose-500/40 transition"
              title="تسجيل الخروج"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Financial & Operational Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Gross Sales */}
        <div className="bg-slate-900 border border-slate-800 p-4 sm:p-5 rounded-3xl shadow-lg">
          <div className="text-slate-400 text-xs font-semibold flex items-center justify-between">
            <span>إجمالي المبيعات</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white mt-2">
            {totalGrossRevenue.toLocaleString('ar-SA')} <span className="text-xs font-normal text-slate-400">ر.س</span>
          </div>
          <div className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            <span>مبيعات تذاكر الفعاليات</span>
          </div>
        </div>

        {/* Net Organizer Payout (95%) */}
        <div className="bg-slate-900 border border-emerald-900/30 bg-emerald-950/10 p-4 sm:p-5 rounded-3xl shadow-lg">
          <div className="text-emerald-300 text-xs font-semibold flex items-center justify-between">
            <span>صافي أرباح المنظم (95%)</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-400 mt-2">
            {totalNetRevenue.toLocaleString('ar-SA')} <span className="text-xs font-normal text-emerald-300/80">ر.س</span>
          </div>
          <div className="text-[11px] text-emerald-500/80 mt-1">
            يتم تحصيلها مباشرة عبر حساباتك
          </div>
        </div>

        {/* Platform 5% Commission */}
        <div className="bg-slate-900 border border-indigo-900/30 bg-indigo-950/10 p-4 sm:p-5 rounded-3xl shadow-lg">
          <div className="text-indigo-300 text-xs font-semibold flex items-center justify-between">
            <span>عمولة المنصة (5%)</span>
            <CreditCard className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-indigo-400 mt-2">
            {totalPlatformCommission.toLocaleString('ar-SA')} <span className="text-xs font-normal text-indigo-300/80">ر.س</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            محسوبة ومسجلة بالنظام
          </div>
        </div>

        {/* Attendance Rate */}
        <div className="bg-slate-900 border border-slate-800 p-4 sm:p-5 rounded-3xl shadow-lg">
          <div className="text-slate-400 text-xs font-semibold flex items-center justify-between">
            <span>نسبة الحضور بالبوابة</span>
            <CheckCircle2 className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-400 mt-2">
            {attendanceRate}%
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {totalCheckedIn} من {totalTicketsIssued} تذكرة صالحة
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 text-xs font-bold space-x-reverse space-x-2 sm:space-x-4 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('events')}
          className={`pb-3 px-3 border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'events'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>فعالياتي ({myEvents.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('payments')}
          className={`pb-3 px-3 border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'payments'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <CreditCard className="w-4 h-4 text-emerald-400" />
          <span>طرق الدفع والتحصيل المباشر</span>
        </button>

        <button
          onClick={() => setActiveTab('attendees')}
          className={`pb-3 px-3 border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'attendees'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>سجل الحضور والمبيعات ({organizerTickets.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('scanner')}
          className={`pb-3 px-3 border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'scanner'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ScanLine className="w-4 h-4 text-emerald-400" />
          <span>ماسح التذاكر للبوابة</span>
        </button>
      </div>

      {/* ======================= TAB 1: MY EVENTS ======================= */}
      {activeTab === 'events' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {myEvents.map((evt) => {
              const sold = evt.ticket_tiers.reduce((a, t) => a + t.sold_count, 0);
              const cap = evt.ticket_tiers.reduce((a, t) => a + t.capacity, 0);
              const rate = cap > 0 ? Math.round((sold / cap) * 100) : 0;

              return (
                <div
                  key={evt.id}
                  className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          {evt.city}
                        </span>
                        {evt.status === 'paused' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                            <Pause className="w-2.5 h-2.5" />
                            متوقفة مؤقتاً
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                            <Play className="w-2.5 h-2.5" />
                            نشطة
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {new Date(evt.start_date).toLocaleDateString('ar-SA')}
                      </span>
                    </div>

                    <h3 className="font-bold text-white text-base leading-snug line-clamp-2">
                      {evt.title}
                    </h3>

                    {evt.sales_start_date && (
                      <div className="text-[11px] text-slate-400 flex items-center gap-1.5 bg-slate-950/60 px-2.5 py-1.5 rounded-xl border border-slate-800">
                        <Clock className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        <span className="truncate">
                          بدء البيع: {new Date(evt.sales_start_date).toLocaleString('ar-SA', { dateStyle: 'short', timeStyle: 'short' })}
                        </span>
                      </div>
                    )}

                    <div className="space-y-1.5 pt-2 border-t border-slate-800 text-xs">
                      <div className="flex justify-between text-slate-400">
                        <span>المبيعات:</span>
                        <span className="font-bold text-white">{sold} / {cap} تذكرة</span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-indigo-500 to-emerald-400 h-full rounded-full"
                          style={{ width: `${rate}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Actions Grid: Scanner, Pause/Play, Postpone, Delete */}
                  <div className="pt-3 border-t border-slate-800 space-y-2">
                    <button
                      onClick={() => {
                        setSelectedScannerEventId(evt.id);
                        setActiveTab('scanner');
                      }}
                      className="w-full py-2.5 px-3 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95"
                    >
                      <ScanLine className="w-3.5 h-3.5" />
                      <span>فتح ماسح البوابة</span>
                    </button>

                    <div className="grid grid-cols-3 gap-1.5 text-[11px]">
                      {/* Pause / Resume Button */}
                      <button
                        onClick={() => handleToggleEventStatus(evt)}
                        className={`py-2 px-2 rounded-xl border font-bold flex items-center justify-center gap-1 transition ${
                          evt.status === 'paused'
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'
                            : 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20'
                        }`}
                        title={evt.status === 'paused' ? 'استئناف وتفعيل الفعالية' : 'تعطيل الفعالية وإيقاف حجز التذاكر مؤقتاً'}
                      >
                        {evt.status === 'paused' ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                        <span>{evt.status === 'paused' ? 'تفعيل' : 'تعطيل'}</span>
                      </button>

                      {/* Postpone Button */}
                      <button
                        onClick={() => handleOpenPostponeModal(evt)}
                        className="py-2 px-2 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/20 font-bold flex items-center justify-center gap-1 transition"
                        title="تأجيل الفعالية إلى تاريخ وتوقيت جديد"
                      >
                        <CalendarDays className="w-3 h-3" />
                        <span>تأجيل</span>
                      </button>

                      {/* Delete Button */}
                      <button
                        onClick={() => handleDeleteEvent(evt)}
                        className="py-2 px-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 hover:bg-rose-500/20 font-bold flex items-center justify-center gap-1 transition"
                        title="حذف الفعالية نهائياً"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>حذف</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {myEvents.length === 0 && (
            <div className="py-16 text-center bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-4">
              <div className="w-14 h-14 rounded-full bg-slate-800 mx-auto flex items-center justify-center text-slate-500">
                <Calendar className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-white">لم تقم بإنشاء أي فعاليات بعد</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                ابدأ بنشر فعاليتك الأولى وتحديد فئات وأسعار التذاكر لبدء المبيعات فوراً
              </p>
              <button
                onClick={onCreateEvent}
                className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-xl shadow-indigo-600/30 transition active:scale-95"
              >
                إنشاء فعالية جديدة الآن
              </button>
            </div>
          )}
        </div>
      )}

      {/* ======================= TAB 2: PAYMENT METHODS SETTINGS ======================= */}
      {activeTab === 'payments' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-xl space-y-6">
          <div>
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-emerald-400" />
              إعدادات طرق الدفع والتحصيل المباشر للمنظم
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              قم بضبط بوابات وحسابات الدفع الخاصة بك (Stripe، بنكك سودان، فودافون كاش) ليقوم المشتري بالتحويل المباشر إلى حسابك الخاص.
            </p>
          </div>

          <form onSubmit={handleSavePaymentMethods} className="space-y-6">
            {/* 1. Stripe Payment Gateway */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-800/60 border border-slate-700/80 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-black text-sm">
                    S
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm">بوابة الدفع العالمية Stripe</h3>
                    <p className="text-[11px] text-slate-400">استلام مدفوعات البطاقات البنكية الدولية ومحفظة Apple Pay لحساب Stripe الخاص بك</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={paymentMethods.stripe.enabled}
                    onChange={(e) =>
                      setPaymentMethods({
                        ...paymentMethods,
                        stripe: { ...paymentMethods.stripe, enabled: e.target.checked },
                      })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              {paymentMethods.stripe.enabled && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-700/50">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-300 mb-1">المفتاح العام للمنظم (Publishable Key):</label>
                    <input
                      type="text"
                      value={paymentMethods.stripe.publishable_key}
                      onChange={(e) =>
                        setPaymentMethods({
                          ...paymentMethods,
                          stripe: { ...paymentMethods.stripe, publishable_key: e.target.value },
                        })
                      }
                      placeholder="pk_live_..."
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono text-left"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">العملة الافتراضية:</label>
                    <select
                      value={paymentMethods.stripe.currency}
                      onChange={(e) =>
                        setPaymentMethods({
                          ...paymentMethods,
                          stripe: {
                            ...paymentMethods.stripe,
                            currency: e.target.value as 'USD' | 'SAR' | 'EUR' | 'AED' | 'EGP',
                          },
                        })
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                    >
                      <option value="SAR">ريال سعودي (SAR)</option>
                      <option value="USD">دولار أمريكي (USD)</option>
                      <option value="EGP">جنيه مصري (EGP)</option>
                      <option value="AED">درهم إماراتي (AED)</option>
                      <option value="EUR">يورو (EUR)</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* 2. Bankak Sudan (Bank of Khartoum) */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-800/60 border border-slate-700/80 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center">
                    <Building className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm">تطبيق بنكك (بنك الخرطوم - السودان)</h3>
                    <p className="text-[11px] text-slate-400">استلام التحويلات المباشرة عبر حساب بنكك السودان الخاص بالمنظم</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={paymentMethods.bankak.enabled}
                    onChange={(e) =>
                      setPaymentMethods({
                        ...paymentMethods,
                        bankak: { ...paymentMethods.bankak, enabled: e.target.checked },
                      })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              {paymentMethods.bankak.enabled && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-700/50">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">رقم حساب بنكك (Account Number):</label>
                    <input
                      type="text"
                      value={paymentMethods.bankak.account_number}
                      onChange={(e) =>
                        setPaymentMethods({
                          ...paymentMethods,
                          bankak: { ...paymentMethods.bankak, account_number: e.target.value },
                        })
                      }
                      placeholder="مثال: 2849102"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono text-left"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">اسم صاحب الحساب بالكامل:</label>
                    <input
                      type="text"
                      value={paymentMethods.bankak.account_name}
                      onChange={(e) =>
                        setPaymentMethods({
                          ...paymentMethods,
                          bankak: { ...paymentMethods.bankak, account_name: e.target.value },
                        })
                      }
                      placeholder="الاسم المسجل في بنك الخرطوم"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-300 mb-1">تعليمات التحويل للعميل:</label>
                    <input
                      type="text"
                      value={paymentMethods.bankak.instructions || ''}
                      onChange={(e) =>
                        setPaymentMethods({
                          ...paymentMethods,
                          bankak: { ...paymentMethods.bankak, instructions: e.target.value },
                        })
                      }
                      placeholder="يرجى إرفاق إشعار التحويل من تطبيق بنكك بعد إتمام العملية."
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 3. Vodafone Cash (Egypt) */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-800/60 border border-slate-700/80 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-red-600/20 text-red-400 flex items-center justify-center">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm">محفظة فودافون كاش (Vodafone Cash - مصر)</h3>
                    <p className="text-[11px] text-slate-400">استلام التحويلات السريعة عبر رقم محفظة فودافون كاش للمنظم</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={paymentMethods.vodafone_cash.enabled}
                    onChange={(e) =>
                      setPaymentMethods({
                        ...paymentMethods,
                        vodafone_cash: { ...paymentMethods.vodafone_cash, enabled: e.target.checked },
                      })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              {paymentMethods.vodafone_cash.enabled && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-700/50">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">رقم محفظة فودافون كاش:</label>
                    <input
                      type="text"
                      value={paymentMethods.vodafone_cash.wallet_number}
                      onChange={(e) =>
                        setPaymentMethods({
                          ...paymentMethods,
                          vodafone_cash: { ...paymentMethods.vodafone_cash, wallet_number: e.target.value },
                        })
                      }
                      placeholder="010XXXXXXXX"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono text-left"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">اسم صاحب المحفظة:</label>
                    <input
                      type="text"
                      value={paymentMethods.vodafone_cash.wallet_name}
                      onChange={(e) =>
                        setPaymentMethods({
                          ...paymentMethods,
                          vodafone_cash: { ...paymentMethods.vodafone_cash, wallet_name: e.target.value },
                        })
                      }
                      placeholder="الاسم المسجل في المحفظة"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-300 mb-1">تعليمات التحويل للعميل:</label>
                    <input
                      type="text"
                      value={paymentMethods.vodafone_cash.instructions || ''}
                      onChange={(e) =>
                        setPaymentMethods({
                          ...paymentMethods,
                          vodafone_cash: { ...paymentMethods.vodafone_cash, instructions: e.target.value },
                        })
                      }
                      placeholder="قم بالتحويل عبر كود فودافون كاش *9*7*رقم المحفظة*المبلغ# وأرسل التأكيد."
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Save Action */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={savingPayment}
                className="flex items-center gap-2 py-3 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-500 font-bold text-xs sm:text-sm text-white shadow-xl shadow-indigo-600/30 transition active:scale-95 disabled:opacity-50"
              >
                {saveSuccess ? <Check className="w-4 h-4 text-emerald-300" /> : <Save className="w-4 h-4" />}
                <span>{saveSuccess ? 'تم حفظ وتحديث طرق الدفع بنجاح!' : 'حفظ إعدادات طرق الدفع'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ======================= TAB 3: ATTENDEES & SALES ======================= */}
      {activeTab === 'attendees' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
          <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="flex flex-1 w-full gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="بحث باسم الزائر، البريد، أو رمز التذكرة..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl pr-9 pl-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | 'checked_in' | 'valid')}
                className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
              >
                <option value="all">جميع الحالات</option>
                <option value="checked_in">تم الدخول (Checked-in)</option>
                <option value="valid">صالحة وبانتظار الدخول</option>
              </select>
            </div>

            <button
              onClick={exportCSV}
              className="w-full md:w-auto flex items-center justify-center gap-1.5 py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 text-xs font-bold transition"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>تصدير ملف Excel / CSV</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-800/60 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-3">رمز التذكرة</th>
                  <th className="py-3 px-3">اسم المشتري</th>
                  <th className="py-3 px-3">الفئة</th>
                  <th className="py-3 px-3">الفعالية</th>
                  <th className="py-3 px-3">السعر</th>
                  <th className="py-3 px-3">صافي المنظم</th>
                  <th className="py-3 px-3">حالة الدخول</th>
                  <th className="py-3 px-3 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredTickets.map((ticket) => (
                  <tr key={ticket.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3 px-3 font-mono font-bold text-indigo-400">
                      {ticket.ticket_code}
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-bold text-white">{ticket.buyer_name}</div>
                      <div className="text-[11px] text-slate-400">{ticket.buyer_phone}</div>
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-300">
                      {ticket.tier_name}
                    </td>
                    <td className="py-3 px-3 text-slate-300 max-w-xs truncate">
                      {ticket.event_title}
                    </td>
                    <td className="py-3 px-3 font-bold text-white">
                      {ticket.price} ر.س
                    </td>
                    <td className="py-3 px-3 font-bold text-emerald-400">
                      {ticket.organizer_net_amount} ر.س
                    </td>
                    <td className="py-3 px-3">
                      {ticket.status === 'checked_in' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                          <CheckCircle2 className="w-3 h-3" />
                          تم الدخول ({ticket.checked_in_at ? new Date(ticket.checked_in_at).toLocaleTimeString('ar-SA') : ''})
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                          صالحة
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => onViewTicket(ticket)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-300 transition"
                        title="عرض التذكرة"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredTickets.length === 0 && (
              <div className="py-8 text-center text-slate-400 text-xs">
                لا توجد تذاكر تطابق معايير البحث
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================= TAB 4: SCANNER ======================= */}
      {activeTab === 'scanner' && (
        <ScannerView
          events={myEvents}
          selectedEventId={selectedScannerEventId}
          onEventChange={setSelectedScannerEventId}
        />
      )}

      {/* ======================= POSTPONE EVENT MODAL ======================= */}
      {postponingEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl p-6 text-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-white text-base">تأجيل موعد الفعالية</h3>
              </div>
              <button
                onClick={() => setPostponingEvent(null)}
                className="p-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <div className="text-xs text-slate-400">الفعالية المراد تأجيلها:</div>
              <div className="text-sm font-bold text-white mt-0.5">{postponingEvent.title}</div>
            </div>

            <form onSubmit={handleSavePostpone} className="space-y-3 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  الموعد والتوقيت الجديد للبدء:
                </label>
                <input
                  type="datetime-local"
                  required
                  value={postponeStartDate}
                  onChange={(e) => setPostponeStartDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  الموعد والتوقيت الجديد للانتهاء:
                </label>
                <input
                  type="datetime-local"
                  required
                  value={postponeEndDate}
                  onChange={(e) => setPostponeEndDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  سيتم تحديث توقيت الفعالية فورياً وستظهر المواعيد الجديدة لكافة الزوار والمشترين.
                </span>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setPostponingEvent(null)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isPostponing}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition disabled:opacity-50"
                >
                  {isPostponing ? 'جاري الحفظ...' : 'حفظ الموعد الجديد'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
