import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  X,
  Check,
  ShieldCheck,
  CreditCard,
  Building,
  Smartphone,
  Copy,
  User,
  Mail,
  Phone,
  ArrowLeft,
  DollarSign
} from 'lucide-react';
import { EventItem, Organizer, OrganizerPaymentMethods, TicketTier, Ticket } from '../types';
import { dbService } from '../lib/database';

interface EventBookingModalProps {
  event: EventItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (tickets: Ticket[]) => void;
}

export const EventBookingModal: React.FC<EventBookingModalProps> = ({
  event,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [selectedTier, setSelectedTier] = useState<TicketTier | null>(
    event && event.ticket_tiers.length > 0 ? event.ticket_tiers[0] : null
  );
  const [quantity, setQuantity] = useState(1);
  const [step, setStep] = useState<'tier' | 'buyer' | 'payment' | 'processing'>('tier');

  // Buyer form details
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'bankak' | 'vodafone_cash' | 'free'>('stripe');
  const [paymentReference, setPaymentReference] = useState('');
  const [copiedBankak, setCopiedBankak] = useState(false);
  const [copiedVodafone, setCopiedVodafone] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Organizer payment profile
  const [organizer, setOrganizer] = useState<Organizer | null>(null);

  useEffect(() => {
    if (event) {
      if (event.ticket_tiers && event.ticket_tiers.length > 0) {
        setSelectedTier(event.ticket_tiers[0]);
      }
      dbService.getOrganizerById(event.organizer_id).then((org) => {
        setOrganizer(org);
        const raw = org?.payment_methods as any;
        const stripeOn = (event?.payment_methods ? event.payment_methods.stripe : raw?.stripe?.enabled) ?? true;
        const bankakOn = (event?.payment_methods ? event.payment_methods.bankak : raw?.bankak?.enabled) ?? true;
        const vodafoneOn = (event?.payment_methods ? event.payment_methods.vodafone_cash : raw?.vodafone_cash?.enabled) ?? true;

        if (stripeOn) {
          setPaymentMethod('stripe');
        } else if (bankakOn) {
          setPaymentMethod('bankak');
        } else if (vodafoneOn) {
          setPaymentMethod('vodafone_cash');
        }
      });
    }
  }, [event]);

  if (!isOpen || !event) return null;

  const currentTier = selectedTier || (event.ticket_tiers && event.ticket_tiers[0]);
  const totalPrice = currentTier ? currentTier.price * quantity : 0;

  const handleProceedToBuyer = () => {
    setStep('buyer');
  };

  const handleProceedToPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !phone.trim()) {
      alert('يرجى ملء كافة بيانات المشتري');
      return;
    }
    setErrorMessage(null);
    if (totalPrice === 0) {
      handleFinalCheckout('free');
    } else {
      setStep('payment');
    }
  };

  const handleFinalCheckout = async (overrideMethod?: typeof paymentMethod) => {
    if (!name.trim() || !email.trim() || !phone.trim()) {
      setStep('buyer');
      return;
    }
    if (!currentTier) {
      alert('يرجى اختيار فئة التذكرة أولاً');
      setStep('tier');
      return;
    }

    setIsSubmitting(true);
    setStep('processing');
    setErrorMessage(null);

    try {
      const selectedMethod = overrideMethod || (totalPrice === 0 ? 'free' : paymentMethod);

      const res = await dbService.purchaseTickets(
        event,
        currentTier,
        quantity,
        {
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          paymentMethod: selectedMethod,
          paymentReference,
        }
      );

      const generatedTickets = res.tickets;

      // Trigger celebratory confetti safely
      try {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#6366f1', '#a855f7', '#ec4899', '#10b981', '#fbbf24'],
        });
      } catch (confettiErr) {
        console.warn('Confetti effect ignored:', confettiErr);
      }

      // Safely invoke success and close handlers
      try {
        onSuccess(generatedTickets);
      } catch (cbErr) {
        console.warn('onSuccess callback handled:', cbErr);
      }

      try {
        onClose();
      } catch (closeErr) {
        console.warn('onClose callback handled:', closeErr);
      }
    } catch (err: unknown) {
      console.error('Booking failed:', err);
      setIsSubmitting(false);
      setStep('payment');
      setErrorMessage(
        err instanceof Error
          ? `تعذر إتمام الدفع المباشر (${err.message})، يرجى إعادة المحاولة.`
          : 'تعذر إتمام الدفع المباشر، يرجى إعادة المحاولة أو التحقق من البيانات.'
      );
    }
  };

  const copyText = (text: string, type: 'bankak' | 'vodafone') => {
    navigator.clipboard.writeText(text);
    if (type === 'bankak') {
      setCopiedBankak(true);
      setTimeout(() => setCopiedBankak(false), 2000);
    } else {
      setCopiedVodafone(true);
      setTimeout(() => setCopiedVodafone(false), 2000);
    }
  };

  const orgRaw = (organizer?.payment_methods as any) || {};
  
  // Specific event payment method choice takes priority over organizer default
  const isStripeEnabled = (event?.payment_methods ? event.payment_methods.stripe : orgRaw.stripe?.enabled) ?? true;
  const isBankakEnabled = (event?.payment_methods ? event.payment_methods.bankak : orgRaw.bankak?.enabled) ?? true;
  const isVodafoneEnabled = (event?.payment_methods ? event.payment_methods.vodafone_cash : orgRaw.vodafone_cash?.enabled) ?? true;

  const orgPayments: OrganizerPaymentMethods = {
    stripe: {
      enabled: isStripeEnabled,
      publishable_key: orgRaw.stripe?.publishable_key || 'pk_live_organizer_key',
      account_id: orgRaw.stripe?.account_id || '',
      currency: orgRaw.stripe?.currency || 'SAR',
    },
    bankak: {
      enabled: isBankakEnabled,
      account_number: orgRaw.bankak?.account_number || '2840195',
      account_name: orgRaw.bankak?.account_name || organizer?.organization_name || organizer?.name || 'حساب المنظم',
      phone_number: orgRaw.bankak?.phone_number || organizer?.phone || '+249912345678',
      instructions: orgRaw.bankak?.instructions || 'يرجى إرفاق إشعار التحويل من تطبيق بنكك بعد إتمام العملية.',
    },
    vodafone_cash: {
      enabled: isVodafoneEnabled,
      wallet_number: orgRaw.vodafone_cash?.wallet_number || organizer?.phone || '01012345678',
      wallet_name: orgRaw.vodafone_cash?.wallet_name || organizer?.organization_name || organizer?.name || 'محفظة المنظم',
      instructions: orgRaw.vodafone_cash?.instructions || 'قم بالتحويل عبر كود فودافون كاش *9*7*رقم المحفظة*المبلغ# وأرسل التأكيد.',
    },
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl p-5 sm:p-6 my-auto text-slate-100 max-h-[95vh] overflow-y-auto">
        {/* Header with Logo */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="TikTak" className="w-9 h-9 object-contain" />
            <div>
              <span className="text-xs font-bold text-indigo-400">حجز تذكرة إلكترونية</span>
              <h2 className="text-base font-black text-white leading-tight">{event.title}</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-full bg-slate-800 hover:bg-slate-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* STEP 1: Select Tier and Quantity */}
        {step === 'tier' && (
          <div className="py-4 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-2">
                اختر فئة التذكرة المناسبة:
              </label>
              <div className="space-y-2.5">
                {event.ticket_tiers.map((tier) => {
                  const isSelected = currentTier?.id === tier.id;
                  const isSoldOut = tier.sold_count >= tier.capacity;
                  return (
                    <div
                      key={tier.id}
                      onClick={() => !isSoldOut && setSelectedTier(tier)}
                      className={`p-3.5 rounded-2xl border transition cursor-pointer relative ${
                        isSelected
                          ? 'bg-indigo-600/15 border-indigo-500 shadow-lg shadow-indigo-500/10'
                          : 'bg-slate-800/60 border-slate-700/80 hover:border-slate-600'
                      } ${isSoldOut ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                              isSelected
                                ? 'border-indigo-500 bg-indigo-600 text-white'
                                : 'border-slate-500'
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                          <div>
                            <div className="font-bold text-white text-sm">{tier.name}</div>
                            <div className="text-[11px] text-slate-400">
                              متبقي {tier.capacity - tier.sold_count} مقعد فقط
                            </div>
                          </div>
                        </div>

                        <div className="text-left">
                          <div className="text-base font-black text-indigo-300">
                            {tier.price > 0 ? `${tier.price} ${event.currency || 'ر.س'}` : 'مجاناً'}
                          </div>
                        </div>
                      </div>

                      {tier.gate && (
                        <div className="mt-2 pt-1.5 border-t border-slate-700/30 flex items-center gap-1.5 text-[11px] text-emerald-400 font-bold">
                          <span>🚪 بوابة الدخول:</span>
                          <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">{tier.gate}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quantity Selector */}
            <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/60 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-white">عدد التذاكر:</div>
                <div className="text-[11px] text-slate-400">حد أقصى 5 تذاكر للطلب</div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-8 h-8 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-bold flex items-center justify-center transition"
                >
                  -
                </button>
                <span className="text-base font-black text-white w-6 text-center">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity(Math.min(5, quantity + 1))}
                  className="w-8 h-8 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center justify-center transition"
                >
                  +
                </button>
              </div>
            </div>

            {/* Order Summary & Next Button */}
            <div className="pt-2">
              <div className="flex items-center justify-between text-sm py-2">
                <span className="text-slate-400">المبلغ الإجمالي ({quantity} تذاكر):</span>
                <span className="text-xl font-black text-white">
                  {totalPrice > 0 ? `${totalPrice} ${event.currency || 'ر.س'}` : 'مجاناً'}
                </span>
              </div>
              <button
                type="button"
                onClick={handleProceedToBuyer}
                className="w-full mt-2 py-3.5 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 font-bold text-sm text-white shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-2 transition active:scale-[0.98]"
              >
                <span>متابعة بيانات المشتري</span>
                <ArrowLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Buyer Info */}
        {step === 'buyer' && (
          <form onSubmit={handleProceedToPayment} className="py-4 space-y-4">
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-indigo-400" />
                  الاسم الكامل (لحامل التذكرة):
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: عبد العزيز فهد الراجحي"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-indigo-400" />
                  البريد الإلكتروني (لاستلام التذكرة):
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@domain.com"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-indigo-400" />
                  رقم الجوال:
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+966 5X XXX XXXX"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>
            </div>

            <div className="pt-2 space-y-2">
              <button
                type="submit"
                className="w-full py-3.5 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 font-bold text-sm text-white shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-2 transition active:scale-[0.98]"
              >
                <span>{totalPrice > 0 ? 'الانتقال لاختيار وسيلة الدفع' : 'تأكيد الحجز المجاني فوراً'}</span>
                <ArrowLeft className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setStep('tier')}
                className="w-full py-2 text-xs text-slate-400 hover:text-slate-200 transition"
              >
                ← العودة لاختيار الفئة
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: Direct Organizer Payment Channels - ONLY ENABLED CHANNELS DISPLAYED */}
        {step === 'payment' && (
          <div className="py-4 space-y-4">
            <div>
              <div className="text-xs font-bold text-slate-200 mb-1">
                الدفع المباشر لحساب المنظم ({event.organizer_name}):
              </div>
              <p className="text-[11px] text-slate-400">
                طرق الدفع المعتمدة والمفعلة من قبل منظم هذه الفعالية:
              </p>
            </div>

            {/* ONLY RENDER ENABLED PAYMENT METHODS */}
            <div className="flex flex-wrap gap-2">
              {orgPayments.stripe?.enabled && (
                <button
                  type="button"
                  onClick={() => setPaymentMethod('stripe')}
                  className={`flex-1 min-w-[110px] p-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1.5 transition ${
                    (paymentMethod === 'stripe' || (!orgPayments.bankak?.enabled && !orgPayments.vodafone_cash?.enabled))
                      ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 shadow-lg'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-400 font-black flex items-center justify-center text-xs">
                    S
                  </div>
                  <span>Stripe / بطاقة</span>
                </button>
              )}

              {orgPayments.bankak?.enabled && (
                <button
                  type="button"
                  onClick={() => setPaymentMethod('bankak')}
                  className={`flex-1 min-w-[110px] p-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1.5 transition ${
                    paymentMethod === 'bankak'
                      ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300 shadow-lg'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Building className="w-5 h-5 text-emerald-400" />
                  <span>بنكك (السودان 🇸🇩)</span>
                </button>
              )}

              {orgPayments.vodafone_cash?.enabled && (
                <button
                  type="button"
                  onClick={() => setPaymentMethod('vodafone_cash')}
                  className={`flex-1 min-w-[110px] p-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1.5 transition ${
                    paymentMethod === 'vodafone_cash'
                      ? 'bg-red-600/20 border-red-500 text-red-300 shadow-lg'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Smartphone className="w-5 h-5 text-red-400" />
                  <span>فودافون كاش (مصر 🇪🇬)</span>
                </button>
              )}
            </div>

            {!orgPayments.stripe?.enabled && !orgPayments.bankak?.enabled && !orgPayments.vodafone_cash?.enabled && (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs text-center space-y-1">
                <p className="font-bold">يرجى التواصل مع المنظم لإتمام الحجز</p>
                <p className="text-[11px] text-amber-400/80">لم يقم المنظم بتفعيل أي وسيلة دفع لهذه الفعالية حالياً.</p>
              </div>
            )}

            {/* 1. Stripe Card Checkout Box */}
            {paymentMethod === 'stripe' && orgPayments.stripe?.enabled && (
              <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-3 text-xs">
                <div className="font-bold text-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-indigo-400" />
                    <span>الدفع الفوري عبر بوابة Stripe للمنظم</span>
                  </div>
                  <span className="text-[10px] text-indigo-300 font-mono">
                    {orgPayments?.stripe?.currency || 'SAR'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  سيتم تحصيل المبلغ مباشرة إلى حساب Stripe الخاص بالمنظم ({event.organizer_name}).
                </p>
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="4000 1234 5678 9010"
                    defaultValue="4242 4242 4242 4242"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono text-left"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="MM/YY"
                      defaultValue="08/29"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono text-center"
                    />
                    <input
                      type="text"
                      placeholder="CVC"
                      defaultValue="321"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono text-center"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 2. Bankak Sudan (Bank of Khartoum) Details Box */}
            {paymentMethod === 'bankak' && orgPayments.bankak?.enabled && (
              <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-3 text-xs">
                <div className="font-bold text-slate-200 flex items-center justify-between">
                  <span>تفاصيل حساب تطبيق بنكك (بنك الخرطوم):</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold">
                    السودان 🇸🇩
                  </span>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2 font-mono">
                  <div className="flex justify-between items-center text-slate-300">
                    <span className="text-slate-500 text-[10px]">اسم المستفيد:</span>
                    <span className="font-bold text-white text-xs">
                      {orgPayments?.bankak?.account_name || event.organizer_name}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-slate-300 border-t border-slate-800/80 pt-2">
                    <span className="text-slate-500 text-[10px]">رقم الحساب:</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-emerald-400 font-bold text-sm tracking-wider">
                        {orgPayments?.bankak?.account_number || '2840195'}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          copyText(orgPayments?.bankak?.account_number || '2840195', 'bankak')
                        }
                        className="p-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                        title="نسخ رقم الحساب"
                      >
                        {copiedBankak ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                  {orgPayments?.bankak?.phone_number && (
                    <div className="flex justify-between items-center text-slate-300 border-t border-slate-800/80 pt-2">
                      <span className="text-slate-500 text-[10px]">هاتف المنظم:</span>
                      <span className="text-slate-300 text-xs">{orgPayments.bankak.phone_number}</span>
                    </div>
                  )}
                </div>

                {orgPayments?.bankak?.instructions && (
                  <div className="text-[11px] text-amber-300/90 bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20">
                    💡 {orgPayments.bankak.instructions}
                  </div>
                )}

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    رقم إشعار أو مرجع التحويل من بنكك (اختياري):
                  </label>
                  <input
                    type="text"
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    placeholder="مثال: FT2409871234"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>
            )}

            {/* 3. Vodafone Cash (Egypt) Details Box */}
            {paymentMethod === 'vodafone_cash' && orgPayments.vodafone_cash?.enabled && (
              <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-3 text-xs">
                <div className="font-bold text-slate-200 flex items-center justify-between">
                  <span>تفاصيل التحويل عبر فودافون كاش:</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 font-bold">
                    مصر 🇪🇬
                  </span>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2 font-mono">
                  <div className="flex justify-between items-center text-slate-300">
                    <span className="text-slate-500 text-[10px]">اسم صاحب المحفظة:</span>
                    <span className="font-bold text-white text-xs">
                      {orgPayments?.vodafone_cash?.wallet_name || event.organizer_name}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-slate-300 border-t border-slate-800/80 pt-2">
                    <span className="text-slate-500 text-[10px]">رقم المحفظة:</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-red-400 font-bold text-sm tracking-wider">
                        {orgPayments?.vodafone_cash?.wallet_number || '01012345678'}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          copyText(orgPayments?.vodafone_cash?.wallet_number || '01012345678', 'vodafone')
                        }
                        className="p-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                        title="نسخ رقم المحفظة"
                      >
                        {copiedVodafone ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                {orgPayments?.vodafone_cash?.instructions && (
                  <div className="text-[11px] text-red-300/90 bg-red-500/10 p-2.5 rounded-xl border border-red-500/20">
                    💡 {orgPayments.vodafone_cash.instructions}
                  </div>
                )}

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    رقم هاتف المحفظة المحول منها أو رقم العملية:
                  </label>
                  <input
                    type="text"
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    placeholder="مثال: 01099887766 أو كود العملية"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>
            )}

            {/* Error banner if any */}
            {errorMessage && (
              <div className="p-3 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs font-semibold animate-shake">
                ⚠️ {errorMessage}
              </div>
            )}

            {/* Submit */}
            <div className="pt-2 space-y-2">
              <button
                type="button"
                onClick={() => handleFinalCheckout()}
                disabled={isSubmitting}
                className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 font-bold text-sm text-white shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-2 transition active:scale-[0.98] disabled:opacity-50"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>إتمام الدفع المباشر وإصدار التذاكر ({totalPrice} {event.currency || 'ر.س'})</span>
              </button>

              <button
                type="button"
                onClick={() => setStep('buyer')}
                className="w-full py-2 text-xs text-slate-400 hover:text-slate-200 transition"
              >
                ← العودة لبيانات المشتري
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Processing */}
        {step === 'processing' && (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
            <div className="w-12 h-12 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
            <div className="font-bold text-white text-base">
              جاري تأكيد الدفع وإصدار التذكرة الإلكترونية...
            </div>
            <p className="text-xs text-slate-400">لحظات ويتم توليد رمز QR الخاص بك</p>
          </div>
        )}
      </div>
    </div>
  );
};
