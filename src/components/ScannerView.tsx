import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import {
  Camera,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ScanLine,
  Search,
  Volume2,
  VolumeX,
  Sparkles,
  RefreshCw,
  Clock,
  ShieldCheck,
  UserCheck,
  History,
  KeyRound,
  DoorClosed,
  Check
} from 'lucide-react';
import { dbService } from '../lib/database';
import { EventItem, GateStaff, ScanLogEntry, ScanResult, Ticket } from '../types';

interface ScannerViewProps {
  events: EventItem[];
  selectedEventId?: string;
  onEventChange?: (eventId: string) => void;
  organizerId?: string;
}

export const ScannerView: React.FC<ScannerViewProps> = ({
  events,
  selectedEventId: propEventId,
  onEventChange,
  organizerId,
}) => {
  const [selectedEventId, setSelectedEventId] = useState<string>(
    propEventId || (events.length > 0 ? events[0].id : '')
  );
  const [manualCode, setManualCode] = useState('');
  const [scanning, setScanning] = useState(false);
  const [lastResult, setLastResult] = useState<ScanResult | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  
  // Gate and Staff selection
  const [gateName, setGateName] = useState('جميع البوابات');
  const [staffName, setStaffName] = useState('المشرف العام');
  const [selectedStaffId, setSelectedStaffId] = useState<string>('supervisor');
  const [staffList, setStaffList] = useState<GateStaff[]>([]);
  
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [eventTickets, setEventTickets] = useState<Ticket[]>([]);
  const [scanLogs, setScanLogs] = useState<ScanLogEntry[]>([]);
  const [loadingStats, setLoadingStats] = useState(false);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isProcessingRef = useRef(false);

  // Sound effects via Web Audio API
  const playSound = (type: 'success' | 'warning' | 'error') => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();

      if (type === 'success') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(587.33, ctx.currentTime);
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      } else if (type === 'warning') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(240, ctx.currentTime);
        osc.frequency.setValueAtTime(180, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      } else {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(150, ctx.currentTime);
        gain.gain.setValueAtTime(0.4, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      }
    } catch {
      // Audio context might be restricted
    }
  };

  const triggerHaptic = (type: 'success' | 'warning' | 'error') => {
    if ('vibrate' in navigator) {
      if (type === 'success') navigator.vibrate([80, 50, 80]);
      else if (type === 'warning') navigator.vibrate([200, 100, 200]);
      else navigator.vibrate([400]);
    }
  };

  const loadData = useCallback(async () => {
    if (!selectedEventId) return;
    setLoadingStats(true);
    const [tickets, logs, staff] = await Promise.all([
      dbService.getTicketsByEvent(selectedEventId),
      dbService.getScanLogs(selectedEventId),
      dbService.getGateStaff(organizerId),
    ]);
    setEventTickets(tickets);
    setScanLogs(logs.slice(0, 30));
    setStaffList(staff.filter((s) => s.is_active));
    setLoadingStats(false);
  }, [selectedEventId, organizerId]);

  // Real-time synchronization across devices and tabs
  useEffect(() => {
    loadData();
    const unsubscribe = dbService.subscribeToChanges(() => {
      loadData();
    });
    return () => unsubscribe();
  }, [loadData]);

  useEffect(() => {
    if (propEventId && propEventId !== selectedEventId) {
      setSelectedEventId(propEventId);
    }
  }, [propEventId, selectedEventId]);

  // Handle staff selection and lock gate accordingly
  const handleStaffChange = (staffId: string) => {
    setSelectedStaffId(staffId);
    if (staffId === 'supervisor') {
      setStaffName('المشرف العام');
      setGateName('جميع البوابات');
      return;
    }
    const found = staffList.find((s) => s.id === staffId);
    if (found) {
      setStaffName(found.name);
      if (found.assigned_gate && found.assigned_gate !== 'all') {
        setGateName(found.assigned_gate);
      }
    }
  };

  const handleProcessCode = async (code: string) => {
    if (isProcessingRef.current || !code.trim()) return;
    isProcessingRef.current = true;

    try {
      const res = await dbService.verifyAndScanTicket(code, gateName, staffName);

      // Check if ticket belongs to selected event
      if (res.ticket && selectedEventId && res.ticket.event_id !== selectedEventId) {
        const wrongResult: ScanResult = {
          status: 'wrong_event',
          message: `تنبيه: هذه التذكرة تتبع فعالية أخرى (${res.ticket.event_title}) وليست الفعالية المحددة!`,
          ticket: res.ticket,
          scannedAt: new Date().toISOString(),
        };
        setLastResult(wrongResult);
        playSound('warning');
        triggerHaptic('warning');
      } else {
        setLastResult(res);

        if (res.status === 'valid') {
          playSound('success');
          triggerHaptic('success');
        } else if (res.status === 'already_used') {
          playSound('warning');
          triggerHaptic('warning');
        } else if (res.status === 'wrong_gate') {
          playSound('warning');
          triggerHaptic('warning');
        } else {
          playSound('error');
          triggerHaptic('error');
        }
      }

      await loadData();
    } finally {
      // Re-enable scanning after 2.5 seconds to avoid accidental multiple scans
      setTimeout(() => {
        isProcessingRef.current = false;
      }, 2500);
    }
  };

  const startCamera = async () => {
    setCameraError(null);
    try {
      const qrScanner = new Html5Qrcode('qr-reader-container');
      scannerRef.current = qrScanner;

      await qrScanner.start(
        { facingMode: 'environment' },
        {
          fps: 15,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          handleProcessCode(decodedText);
        },
        () => {
          // ignore frame read failures
        }
      );

      setScanning(true);
    } catch (err: unknown) {
      console.error('Camera start error:', err);
      setCameraError('تعذر الوصول إلى الكاميرا. يرجى التأكد من منح الإذن للمتصفح أو استخدام الإدخال اليدوي.');
      setScanning(false);
    }
  };

  const stopCamera = async () => {
    if (scannerRef.current && scanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (e) {
        console.error('Stop camera error:', e);
      }
      setScanning(false);
    }
  };

  useEffect(() => {
    return () => {
      if (scannerRef.current && scanning) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, [scanning]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      handleProcessCode(manualCode.trim());
      setManualCode('');
    }
  };

  const currentEvent = events.find((e) => e.id === selectedEventId);
  const totalTickets = eventTickets.length;
  const checkedInTickets = eventTickets.filter((t) => t.status === 'checked_in').length;
  const remainingTickets = totalTickets - checkedInTickets;
  const checkInRate = totalTickets > 0 ? Math.round((checkedInTickets / totalTickets) * 100) : 0;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      {/* Top Header Card */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 border border-indigo-500/20 rounded-3xl p-4 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                <ScanLine className="w-5 h-5 animate-pulse" />
              </span>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-white">
                  ماسح تذاكر البوابات والمزامنة الفورية
                </h1>
                <p className="text-xs text-slate-400">
                  فحص دقيق ومسح لمرة واحدة فقط مع حماية وتوجيه تلقائي للبوابة المخصصة
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition ${
                soundEnabled
                  ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-300'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              {soundEnabled ? 'التنبيه الصوتي مفعّل' : 'صامت'}
            </button>
          </div>
        </div>

        {/* Event, Staff Member & Gate Access Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-800/80">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">الفعالية الحالية:</label>
            <select
              value={selectedEventId}
              onChange={(e) => {
                setSelectedEventId(e.target.value);
                if (onEventChange) onEventChange(e.target.value);
              }}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-indigo-500"
            >
              {events.map((evt) => (
                <option key={evt.id} value={evt.id}>
                  {evt.title} ({evt.city})
                </option>
              ))}
            </select>
          </div>

          {/* Authorized Staff Member Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5 text-indigo-400" />
                الموظف المفوّض للمسح:
              </span>
              <span className="text-[10px] text-indigo-400 font-mono">
                {staffList.length} موظف مسجل
              </span>
            </label>
            <select
              value={selectedStaffId}
              onChange={(e) => handleStaffChange(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-indigo-300 focus:outline-none focus:border-indigo-500"
            >
              <option value="supervisor">👤 المشرف العام (صلاحيات كاملة)</option>
              {staffList.map((st) => (
                <option key={st.id} value={st.id}>
                  🔑 {st.name} ({st.assigned_gate} - PIN: {st.pin_code})
                </option>
              ))}
            </select>
          </div>

          {/* Current Gate Lock */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1">
              <DoorClosed className="w-3.5 h-3.5 text-emerald-400" />
              بوابة الدخول المخصصة لهذا الماسح:
            </label>
            <select
              value={gateName}
              onChange={(e) => setGateName(e.target.value)}
              className="w-full bg-slate-800 border border-emerald-500/50 rounded-xl px-3 py-2 text-xs font-bold text-emerald-300 focus:outline-none focus:border-emerald-500"
            >
              <option value="جميع البوابات">جميع البوابات (الوضع الإشرافي العام)</option>
              {currentEvent?.ticket_tiers
                .map((t) => t.gate)
                .filter((g): g is string => !!g && g.trim() !== '')
                .filter((value, index, self) => self.indexOf(value) === index)
                .map((gateItem) => (
                  <option key={gateItem} value={gateItem}>
                    🚪 {gateItem}
                  </option>
                ))}
              <option value="البوابة الرئيسية (A)">البوابة الرئيسية (A)</option>
              <option value="بوابة كبار الشخصيات (VIP)">بوابة كبار الشخصيات (VIP)</option>
              <option value="البوابة الشرقية (B)">البوابة الشرقية (B)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Live Check-in Statistics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <div className="text-xs text-slate-400 font-medium">إجمالي تذاكر الفعالية</div>
          <div className="text-2xl font-black text-white mt-1">
            {loadingStats ? '...' : totalTickets}
          </div>
          <div className="text-[11px] text-indigo-400 mt-0.5">تذكرة مسجلة بالنظام</div>
        </div>

        <div className="bg-slate-900 border border-emerald-900/30 p-4 rounded-2xl bg-emerald-950/10">
          <div className="text-xs text-emerald-300 font-medium flex items-center justify-between">
            <span>تم الدخول بنجاح</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400 mt-1">{checkedInTickets}</div>
          <div className="text-[11px] text-emerald-500/80 mt-0.5">حاضرون بالفعالية</div>
        </div>

        <div className="bg-slate-900 border border-amber-900/30 p-4 rounded-2xl bg-amber-950/10">
          <div className="text-xs text-amber-300 font-medium">المتبقي للدخول</div>
          <div className="text-2xl font-black text-amber-400 mt-1">{remainingTickets}</div>
          <div className="text-[11px] text-amber-500/80 mt-0.5">تذكرة بانتظار المسح</div>
        </div>

        <div className="bg-slate-900 border border-indigo-900/30 p-4 rounded-2xl bg-indigo-950/10">
          <div className="text-xs text-indigo-300 font-medium">نسبة الحضور</div>
          <div className="text-2xl font-black text-indigo-400 mt-1">{checkInRate}%</div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-indigo-500 to-emerald-400 h-full rounded-full transition-all duration-500"
              style={{ width: `${checkInRate}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Scanner Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Camera & Scanner Viewport */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <Camera className="w-4 h-4 text-indigo-400" />
                كاميرا المسح المباشر (QR Scanner)
              </h2>
              {scanning && (
                <span className="flex items-center gap-1 text-xs text-emerald-400 font-semibold animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  الكاميرا نشطة ({gateName})
                </span>
              )}
            </div>

            {/* Camera Box Container */}
            <div className="relative w-full aspect-square max-w-sm mx-auto rounded-3xl overflow-hidden bg-slate-950 border-2 border-dashed border-indigo-500/40 flex flex-col items-center justify-center p-2">
              <div
                id="qr-reader-container"
                className={`w-full h-full rounded-2xl overflow-hidden ${!scanning ? 'hidden' : ''}`}
              />

              {!scanning && (
                <div className="flex flex-col items-center justify-center p-6 text-center space-y-3">
                  <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
                    <ScanLine className="w-8 h-8 animate-pulse" />
                  </div>
                  <div>
                    <div className="font-bold text-white text-base">كاميرا المسح متوقفة</div>
                    <p className="text-xs text-slate-400 max-w-xs mt-1">
                      اضغط على الزر أدناه لتشغيل الكاميرا وبدء تدقيق تذاكر الزوار فورياً
                    </p>
                  </div>
                  <button
                    onClick={startCamera}
                    className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 font-bold text-sm text-white shadow-xl shadow-indigo-600/30 transition active:scale-95 cursor-pointer"
                  >
                    <Camera className="w-4 h-4" />
                    تشغيل الكاميرا الآن
                  </button>
                </div>
              )}

              {scanning && (
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                  {/* Scanner overlay corners & animated laser */}
                  <div className="w-56 h-56 border-2 border-indigo-400 rounded-3xl relative overflow-hidden shadow-2xl">
                    <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-emerald-400 rounded-tl-xl" />
                    <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-emerald-400 rounded-tr-xl" />
                    <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-emerald-400 rounded-bl-xl" />
                    <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-emerald-400 rounded-br-xl" />

                    {/* Animated laser scan line */}
                    <div className="w-full h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_15px_#10b981] animate-scan-line" />
                  </div>
                  <div className="bg-slate-950/80 px-3 py-1 rounded-full text-[11px] text-slate-200 mt-4 backdrop-blur-md">
                    وجّه الكاميرا نحو رمز QR على التذكرة
                  </div>
                </div>
              )}
            </div>

            {scanning && (
              <div className="flex justify-center">
                <button
                  onClick={stopCamera}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-rose-400 border border-rose-500/30 transition cursor-pointer"
                >
                  إيقاف الكاميرا مؤقتاً
                </button>
              </div>
            )}

            {cameraError && (
              <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{cameraError}</span>
              </div>
            )}

            {/* Manual Code Input Fallback */}
            <div className="pt-2 border-t border-slate-800">
              <form onSubmit={handleManualSubmit} className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    placeholder="أدخل رمز التذكرة يدوياً (مثال: TIK-892147-VIP)..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-4 py-3 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 font-mono text-left"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!manualCode.trim()}
                  className="px-5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-600 font-bold text-xs flex items-center gap-1.5 transition disabled:opacity-40 cursor-pointer"
                >
                  <Search className="w-4 h-4 text-indigo-400" />
                  فحص
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Right: Live Scan Result Panel */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                نتيجة الفحص اللحظية
              </h3>
              {lastResult && (
                <span className="text-[11px] text-slate-400">
                  {new Date(lastResult.scannedAt).toLocaleTimeString('ar-SA')}
                </span>
              )}
            </div>

            {!lastResult ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <div className="w-12 h-12 rounded-full bg-slate-800/80 mx-auto flex items-center justify-center text-slate-500">
                  <ScanLine className="w-6 h-6" />
                </div>
                <div className="font-bold text-slate-300 text-sm">بانتظار مسح التذكرة...</div>
                <p className="text-xs max-w-xs mx-auto">
                  ستظهر بيانات الزائر وصلاحية التذكرة والبوابة فور مسح الرمز بالكاميرا
                </p>
              </div>
            ) : (
              <div className="py-3 space-y-4 animate-fadeIn">
                {/* 1. VALID RESULT (SUCCESS) */}
                {lastResult.status === 'valid' && (
                  <div className="p-4 rounded-2xl bg-emerald-500/15 border-2 border-emerald-500/50 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-slate-950 flex items-center justify-center font-black">
                        <CheckCircle2 className="w-7 h-7" />
                      </div>
                      <div>
                        <div className="text-emerald-400 font-black text-lg">تذكرة صالحة - تفضل بالدخول</div>
                        <div className="text-xs text-emerald-300/90">{lastResult.message}</div>
                      </div>
                    </div>

                    {lastResult.ticket && (
                      <div className="bg-slate-900/90 p-3.5 rounded-xl border border-emerald-500/30 space-y-2 text-xs">
                        <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                          <span className="text-slate-400">اسم الزائر:</span>
                          <span className="font-bold text-white text-sm">{lastResult.ticket.buyer_name}</span>
                        </div>
                        <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                          <span className="text-slate-400">فئة التذكرة:</span>
                          <span className="font-bold text-indigo-300">{lastResult.ticket.tier_name}</span>
                        </div>
                        <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                          <span className="text-slate-400">رمز التذكرة:</span>
                          <span className="font-mono text-emerald-400 font-bold">{lastResult.ticket.ticket_code}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">تم المسح عبر:</span>
                          <span className="text-slate-300 font-mono">
                            {gateName} (بواسطة {staffName})
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 2. WRONG GATE RESULT (TICKET STILL VALID) */}
                {lastResult.status === 'wrong_gate' && (
                  <div className="p-4 rounded-2xl bg-amber-500/15 border-2 border-amber-500/50 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black text-xl">
                        🚪
                      </div>
                      <div>
                        <div className="text-amber-400 font-black text-lg">تنبيه: محاولة دخول من بوابة خاطئة!</div>
                        <div className="text-xs text-amber-300/90">{lastResult.message}</div>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-200 text-xs">
                      🔒 <strong>حالة التذكرة:</strong> لم يتم استهلاك التذكرة، وهي لا تزال <strong>صالحة تماماً</strong> حتى يتم مسحها في البوابة المخصصة لها ({lastResult.expectedGate}).
                    </div>

                    {lastResult.ticket && (
                      <div className="bg-slate-900/90 p-3.5 rounded-xl border border-amber-500/30 space-y-2 text-xs">
                        <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                          <span className="text-slate-400">اسم الزائر:</span>
                          <span className="font-bold text-white text-sm">{lastResult.ticket.buyer_name}</span>
                        </div>
                        <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                          <span className="text-slate-400">فئة التذكرة:</span>
                          <span className="font-bold text-indigo-300">{lastResult.ticket.tier_name}</span>
                        </div>
                        <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                          <span className="text-slate-400">البوابة الصحيحة المخصصة:</span>
                          <span className="font-bold text-emerald-400">🚪 {lastResult.expectedGate}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">البوابة الحالية لهذا الماسح:</span>
                          <span className="font-bold text-rose-400">🚪 {lastResult.currentGate}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 3. ALREADY USED RESULT */}
                {lastResult.status === 'already_used' && (
                  <div className="p-4 rounded-2xl bg-amber-500/15 border-2 border-amber-500/50 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black">
                        <AlertTriangle className="w-7 h-7" />
                      </div>
                      <div>
                        <div className="text-amber-400 font-black text-lg">تنبيه: التذكرة مستخدمة مسبقاً!</div>
                        <div className="text-xs text-amber-300/90">{lastResult.message}</div>
                      </div>
                    </div>

                    {lastResult.ticket && (
                      <div className="bg-slate-900/90 p-3.5 rounded-xl border border-amber-500/30 space-y-2 text-xs">
                        <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                          <span className="text-slate-400">حامل التذكرة:</span>
                          <span className="font-bold text-white">{lastResult.ticket.buyer_name}</span>
                        </div>
                        <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                          <span className="text-slate-400">توقيت المسح الأول:</span>
                          <span className="font-bold text-amber-300 font-mono">
                            {lastResult.ticket.checked_in_at
                              ? new Date(lastResult.ticket.checked_in_at).toLocaleString('ar-SA')
                              : 'مسجلة مسبقاً'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">تم المسح بواسطة:</span>
                          <span className="text-slate-300 font-bold">
                            {lastResult.ticket.checked_in_by || 'موظف البوابة'} عبر ({lastResult.ticket.gate_number || 'البوابة'})
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 4. INVALID OR WRONG EVENT RESULT */}
                {(lastResult.status === 'invalid' || lastResult.status === 'wrong_event') && (
                  <div className="p-4 rounded-2xl bg-rose-500/15 border-2 border-rose-500/50 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-rose-500 text-white flex items-center justify-center font-black">
                        <XCircle className="w-7 h-7" />
                      </div>
                      <div>
                        <div className="text-rose-400 font-black text-lg">
                          {lastResult.status === 'wrong_event' ? 'فعالية مختلفة!' : 'رمز غير صالح!'}
                        </div>
                        <div className="text-xs text-rose-300/90">{lastResult.message}</div>
                      </div>
                    </div>
                  </div>
                )}

                <button
                  onClick={() => setLastResult(null)}
                  className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  مسح تذكرة تالية
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Real-time Scan Activity Feed (مزامنة فورية لحركة البوابات) */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-indigo-400" />
            <h3 className="font-bold text-sm text-white">
              سجل حركة البوابات المتزامن فورياً (Realtime Scan Feed)
            </h3>
          </div>
          <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            مزامنة حية نشطة
          </span>
        </div>

        {scanLogs.length === 0 ? (
          <div className="text-center py-6 text-slate-500 text-xs">
            لا توجد عمليات مسح مسجلة لهذه الفعالية حتى الآن.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-950/60 text-slate-400 font-bold">
                <tr>
                  <th className="py-2.5 px-3">التوقيت</th>
                  <th className="py-2.5 px-3">رمز التذكرة</th>
                  <th className="py-2.5 px-3">الزائر / الفئة</th>
                  <th className="py-2.5 px-3">البوابة</th>
                  <th className="py-2.5 px-3">الموظف الفاحص</th>
                  <th className="py-2.5 px-3">حالة العملية</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {scanLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">
                      {new Date(log.timestamp).toLocaleTimeString('ar-SA')}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-200">
                      {log.ticket_code}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-white">{log.buyer_name || '-'}</div>
                      <div className="text-[10px] text-indigo-400">{log.tier_name || ''}</div>
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-emerald-300">
                      🚪 {log.gate}
                    </td>
                    <td className="py-2.5 px-3 text-slate-300">
                      👤 {log.staff_name}
                    </td>
                    <td className="py-2.5 px-3">
                      {log.status === 'valid' && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                          تم الدخول ✅
                        </span>
                      )}
                      {log.status === 'wrong_gate' && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30">
                          بوابة خاطئة ⚠️
                        </span>
                      )}
                      {log.status === 'already_used' && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30">
                          مستخدمة مسبقاً 🚫
                        </span>
                      )}
                      {log.status === 'invalid' && (
                        <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-bold border border-rose-500/30">
                          رمز غير صالح ✕
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
