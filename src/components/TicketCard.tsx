import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { User, CheckCircle2, AlertCircle, ShieldCheck, Tag } from 'lucide-react';
import { Ticket, TicketDesignTheme } from '../types';

interface TicketCardProps {
  ticket: Ticket;
  id?: string;
  isCompact?: boolean;
}

export const TicketCard: React.FC<TicketCardProps> = ({ ticket, id, isCompact = false }) => {
  const theme: TicketDesignTheme = ticket.ticket_theme || 'modern_dark';
  const isVIP = ticket.tier_name.toLowerCase().includes('vip') || ticket.tier_name.includes('ملكية');

  // Dynamic Theme Styling
  const getThemeStyles = () => {
    switch (theme) {
      case 'royal_gold':
        return {
          wrapper: 'bg-gradient-to-b from-slate-950 via-amber-950/40 to-slate-950 border-amber-500/50 shadow-amber-500/10',
          accentBadge: 'bg-amber-500/20 text-amber-300 border-amber-500/50',
          qrBorder: 'border-amber-500/40 shadow-amber-500/20',
          codeText: 'text-amber-400',
          tagIcon: 'text-amber-400',
        };
      case 'neon_cyber':
        return {
          wrapper: 'bg-gradient-to-b from-slate-950 via-cyan-950/40 to-indigo-950 border-cyan-500/50 shadow-cyan-500/10',
          accentBadge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50',
          qrBorder: 'border-cyan-500/40 shadow-cyan-500/20',
          codeText: 'text-cyan-400',
          tagIcon: 'text-cyan-400',
        };
      case 'festive_hologram':
        return {
          wrapper: 'bg-gradient-to-b from-slate-950 via-purple-950/40 to-pink-950/40 border-pink-500/50 shadow-pink-500/10',
          accentBadge: 'bg-pink-500/20 text-pink-300 border-pink-500/50',
          qrBorder: 'border-pink-500/40 shadow-pink-500/20',
          codeText: 'text-pink-400',
          tagIcon: 'text-pink-400',
        };
      case 'arabic_heritage':
        return {
          wrapper: 'bg-gradient-to-b from-slate-950 via-emerald-950/40 to-slate-950 border-emerald-500/50 shadow-emerald-500/10',
          accentBadge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50',
          qrBorder: 'border-emerald-500/40 shadow-emerald-500/20',
          codeText: 'text-emerald-400',
          tagIcon: 'text-emerald-400',
        };
      default: // 'modern_dark'
        return {
          wrapper: 'bg-gradient-to-b from-slate-900 via-slate-900 to-indigo-950/70 border-slate-700/60',
          accentBadge: isVIP ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
          qrBorder: 'border-indigo-500/30',
          codeText: 'text-indigo-400',
          tagIcon: 'text-indigo-400',
        };
    }
  };

  const currentStyle = getThemeStyles();

  return (
    <div
      id={id}
      className={`relative overflow-hidden rounded-3xl border shadow-2xl text-slate-100 transition-all ${
        currentStyle.wrapper
      } ${isCompact ? 'max-w-md w-full' : 'max-w-md w-full mx-auto'}`}
    >
      {/* Background Graphic overlay if custom design uploaded */}
      {ticket.ticket_bg_url && (
        <div className="absolute inset-0 z-0 opacity-15 pointer-events-none">
          <img src={ticket.ticket_bg_url} alt="Ticket Art" className="w-full h-full object-cover filter contrast-125" />
        </div>
      )}

      {/* Top Banner & Event Branding */}
      <div className="relative h-32 w-full overflow-hidden bg-slate-800 z-10">
        {ticket.event_banner || ticket.ticket_bg_url ? (
          <img
            src={ticket.ticket_bg_url || ticket.event_banner}
            alt={ticket.event_title}
            className="w-full h-full object-cover opacity-60 filter brightness-90"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-indigo-900 via-purple-900 to-slate-900" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent" />

        {/* Tier & Status Badges */}
        <div className="absolute top-3 right-3 left-3 flex items-center justify-between z-10">
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold shadow-lg backdrop-blur-md border ${currentStyle.accentBadge}`}
          >
            {ticket.tier_name}
          </span>

          {ticket.status === 'valid' && (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              صالحة للدخول
            </span>
          )}

          {ticket.status === 'checked_in' && (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40 backdrop-blur-md">
              <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
              تم استخدامها
            </span>
          )}

          {ticket.status === 'cancelled' && (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/40 backdrop-blur-md">
              <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
              ملغاة
            </span>
          )}
        </div>

        {/* Event Logo Avatar */}
        <div className="absolute -bottom-6 right-6 z-10">
          <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-indigo-500/50 shadow-xl bg-slate-900 p-1 flex items-center justify-center">
            <img
              src={ticket.event_logo || '/logo.png'}
              alt="Event Logo"
              className="w-full h-full object-contain"
            />
          </div>
        </div>
      </div>

      {/* Main Details Body */}
      <div className="p-6 pt-8 space-y-4 relative z-10">
        <div>
          <h3 className="text-xl font-black text-white leading-snug tracking-wide">
            {ticket.event_title}
          </h3>
          <p className="text-xs text-indigo-300/80 font-medium mt-0.5 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
            تذكرة موثقة عبر تيك تاك - TikTak Verified
          </p>
        </div>

        {/* Buyer & Gate Info Grid */}
        <div className="grid grid-cols-1 gap-2.5 bg-slate-800/60 p-3.5 rounded-2xl border border-slate-700/40 text-xs backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-bold text-white text-sm">{ticket.buyer_name}</span>
            </div>
            <span className="text-indigo-300 font-bold text-sm">
              {ticket.price > 0 ? `${ticket.price} ${ticket.currency || 'ر.س'}` : 'مجانية'}
            </span>
          </div>

          {/* Gate Assignment Badge if specific gate assigned */}
          {ticket.gate && (
            <div className="flex items-center justify-between border-t border-slate-700/30 pt-2 text-xs">
              <span className="text-slate-400">بوابة الدخول المخصصة:</span>
              <span className="font-bold text-emerald-400 px-2 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                🚪 {ticket.gate}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Perforated Separator with Side Notches */}
      <div className="relative flex items-center justify-between my-1 px-4 z-10">
        <div className="w-6 h-6 rounded-full bg-slate-950 -mr-7 border-r border-slate-700/60" />
        <div className="w-full border-b-2 border-dashed border-slate-700/70" />
        <div className="w-6 h-6 rounded-full bg-slate-950 -ml-7 border-l border-slate-700/60" />
      </div>

      {/* QR Code & Scan Pass Section */}
      <div className="p-6 pt-4 pb-6 flex flex-col items-center text-center space-y-3 bg-slate-900/90 relative z-10">
        <div className={`p-3 bg-white rounded-2xl shadow-xl border-4 ${currentStyle.qrBorder}`}>
          <QRCodeSVG
            value={ticket.qr_data || ticket.ticket_code}
            size={160}
            level="H"
            includeMargin={false}
            className="rounded-lg"
          />
        </div>

        <div>
          <div className="text-[11px] text-slate-400 uppercase tracking-widest font-mono">
            رقم التذكرة الإلكترونية
          </div>
          <div className={`text-lg font-black tracking-wider font-mono mt-0.5 ${currentStyle.codeText}`}>
            {ticket.ticket_code}
          </div>
        </div>

        {ticket.status === 'checked_in' && (
          <div className="w-full bg-amber-500/10 border border-amber-500/30 rounded-xl p-2.5 text-xs text-amber-200 text-right space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-amber-400" />
              تم مسحها للدخول
            </div>
            {ticket.checked_in_at && (
              <div className="text-[11px] text-amber-300/80">
                التوقيت: {new Date(ticket.checked_in_at).toLocaleTimeString('ar-SA')} - {ticket.gate_number || 'البوابة الرئيسية'}
              </div>
            )}
          </div>
        )}

        <div className="text-[11px] text-slate-500 flex items-center justify-center gap-1.5 pt-1">
          <Tag className={`w-3 h-3 ${currentStyle.tagIcon}`} />
          امسح هذا الرمز عبر ماسح TikTak عند بوابة الفعالية
        </div>
      </div>
    </div>
  );
};
