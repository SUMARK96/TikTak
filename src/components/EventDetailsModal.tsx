import React from 'react';
import { X, Calendar, MapPin, Clock, Users, Ticket as TicketIcon, CheckCircle2, ShieldCheck, Share2 } from 'lucide-react';
import { EventItem } from '../types';
import { getEventSalesStatus } from '../lib/salesUtils';

interface EventDetailsModalProps {
  event: EventItem | null;
  isOpen: boolean;
  onClose: () => void;
  onBook: (event: EventItem) => void;
}

export const EventDetailsModal: React.FC<EventDetailsModalProps> = ({
  event,
  isOpen,
  onClose,
  onBook,
}) => {
  if (!isOpen || !event) return null;

  const startDate = new Date(event.start_date);
  const formattedDate = startDate.toLocaleDateString('ar-SA', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  const formattedTime = startDate.toLocaleTimeString('ar-SA', {
    hour: '2-digit',
    minute: '2-digit'
  });

  const salesStatus = getEventSalesStatus(event);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden my-auto text-slate-100 max-h-[92vh] flex flex-col">
        {/* Banner with Close Button */}
        <div className="relative h-56 sm:h-64 w-full shrink-0 bg-slate-800">
          <img
            src={event.banner_url}
            alt={event.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/30 to-transparent" />

          <button
            onClick={onClose}
            className="absolute top-4 left-4 p-2 text-slate-200 hover:text-white rounded-full bg-slate-950/60 hover:bg-slate-900 backdrop-blur-md transition z-10"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Logo Badge */}
          <div className="absolute -bottom-6 right-6 z-10 flex items-end gap-3">
            <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-indigo-500/50 shadow-xl bg-slate-900">
              <img src={event.logo_url} alt="Logo" className="w-full h-full object-cover" />
            </div>
            <div className="pb-1">
              <span className="text-xs font-bold text-indigo-300 drop-shadow">{event.organizer_name}</span>
            </div>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-6 pt-10 overflow-y-auto space-y-6 flex-1">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white leading-tight">
              {event.title}
            </h1>
            <p className="text-xs sm:text-sm text-indigo-300/90 mt-1 font-medium">
              {event.tagline}
            </p>
          </div>

          {/* Highlights Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-800/50 p-4 rounded-2xl border border-slate-700/60 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-white">{formattedDate}</div>
                <div className="text-slate-400 text-[11px] flex items-center gap-1">
                  <Clock className="w-3 h-3" /> الساعة {formattedTime}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-600/20 text-rose-400 flex items-center justify-center shrink-0">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-white">{event.venue_name}</div>
                <div className="text-slate-400 text-[11px]">{event.city}</div>
              </div>
            </div>
          </div>

          {/* Sales Window Alert if not open */}
          {!salesStatus.isOpen && (
            <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs flex items-center gap-2">
              <Clock className="w-4 h-4 shrink-0" />
              <span>{salesStatus.message}</span>
            </div>
          )}

          {/* Description */}
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-slate-200">عن الفعالية</h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed whitespace-pre-line">
              {event.description}
            </p>
          </div>

          {/* Available Ticket Tiers Preview */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-200">الفئات المتاحة للحجز</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {event.ticket_tiers.map((tier) => (
                <div
                  key={tier.id}
                  className="p-3.5 rounded-2xl bg-slate-800/70 border border-slate-700 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-white text-xs">{tier.name}</span>
                      <span className="text-sm font-black text-indigo-400">
                        {tier.price > 0 ? `${tier.price} ${event.currency || 'ر.س'}` : 'مجاناً'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Action */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-900/95 flex items-center justify-between gap-3">
          <div>
            <div className="text-[11px] text-slate-400">السعر يبدأ من</div>
            <div className="text-lg font-black text-white">
              {event.ticket_tiers.length > 0 ? Math.min(...event.ticket_tiers.map(t => t.price)) : 0} {event.currency || 'ر.س'}
            </div>
          </div>

          {salesStatus.isOpen ? (
            <button
              onClick={() => {
                onClose();
                onBook(event);
              }}
              className="flex-1 max-w-xs py-3 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-500 font-bold text-sm text-white shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-2 transition active:scale-95"
            >
              <TicketIcon className="w-4 h-4" />
              <span>حجز التذاكر الآن</span>
            </button>
          ) : (
            <button
              disabled
              className="flex-1 max-w-xs py-3 px-4 rounded-2xl bg-slate-800 text-slate-400 border border-slate-700 font-bold text-xs flex items-center justify-center gap-2 cursor-not-allowed opacity-90"
            >
              <Clock className="w-4 h-4 text-amber-400" />
              <span>{salesStatus.buttonLabel}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
