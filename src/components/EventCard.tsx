import React from 'react';
import { Calendar, MapPin, Ticket, Clock, ArrowLeft, Users } from 'lucide-react';
import { EventItem } from '../types';
import { getEventSalesStatus } from '../lib/salesUtils';

interface EventCardProps {
  event: EventItem;
  onBook: (event: EventItem) => void;
  onSelect: (event: EventItem) => void;
}

export const EventCard: React.FC<EventCardProps> = ({ event, onBook, onSelect }) => {
  const startDate = new Date(event.start_date);
  const formattedDate = startDate.toLocaleDateString('ar-SA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
  const formattedTime = startDate.toLocaleTimeString('ar-SA', {
    hour: '2-digit',
    minute: '2-digit'
  });

  // Calculate prices
  const prices = event.ticket_tiers.map((t) => t.price);
  const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
  
  const totalCapacity = event.ticket_tiers.reduce((acc, t) => acc + t.capacity, 0);
  const totalSold = event.ticket_tiers.reduce((acc, t) => acc + t.sold_count, 0);
  const percentSold = totalCapacity > 0 ? Math.min(100, Math.round((totalSold / totalCapacity) * 100)) : 0;

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'technology': return 'تقنية وذكاء اصطناعي';
      case 'music': return 'موسيقى وحفلات';
      case 'business': return 'أعمال وريادة';
      case 'sports': return 'رياضة ولياقة';
      case 'arts': return 'فنون ومسرح';
      default: return 'فعاليات عامة';
    }
  };

  const salesStatus = getEventSalesStatus(event);

  return (
    <div className="group relative bg-slate-900 border border-slate-800 hover:border-indigo-500/50 rounded-3xl overflow-hidden shadow-xl transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-500/10 flex flex-col h-full">
      {/* Banner & Logo */}
      <div className="relative h-48 w-full overflow-hidden bg-slate-800">
        <img
          src={event.banner_url}
          alt={event.title}
          style={{
            objectPosition: `center ${event.card_image_position_y ?? 50}%`,
            transform:
              event.card_image_zoom && event.card_image_zoom !== 100
                ? `scale(${event.card_image_zoom / 100})`
                : undefined,
          }}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />

        {/* Category & City Badges */}
        <div className="absolute top-3 right-3 left-3 flex items-center justify-between">
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-900/80 text-indigo-300 border border-indigo-500/30 backdrop-blur-md">
            {getCategoryLabel(event.category)}
          </span>

          <div className="flex items-center gap-1.5">
            {!salesStatus.isOpen && (
              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 backdrop-blur-md">
                {salesStatus.badgeLabel}
              </span>
            )}
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-900/80 text-slate-200 border border-slate-700 backdrop-blur-md flex items-center gap-1">
              <MapPin className="w-3 h-3 text-rose-400" />
              {event.city}
            </span>
          </div>
        </div>

        {/* Organizer Avatar & Name */}
        <div className="absolute bottom-3 right-3 flex items-center gap-2 z-10">
          <div className="w-9 h-9 rounded-xl overflow-hidden border border-slate-700 bg-slate-900 shadow-md">
            <img src={event.logo_url} alt={event.organizer_name} className="w-full h-full object-cover" />
          </div>
          <span className="text-xs font-semibold text-slate-200 drop-shadow-md">
            {event.organizer_name}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-5 flex flex-col flex-1 justify-between space-y-4">
        <div className="space-y-2">
          <h3
            onClick={() => onSelect(event)}
            className="text-lg font-black text-white group-hover:text-indigo-300 transition line-clamp-1 cursor-pointer"
          >
            {event.title}
          </h3>
          <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
            {event.tagline || event.description}
          </p>
        </div>

        {/* Date, Location & Capacity Indicator */}
        <div className="space-y-2.5 text-xs text-slate-300 border-t border-slate-800/80 pt-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-slate-300">
              <Calendar className="w-3.5 h-3.5 text-indigo-400" />
              <span>{formattedDate}</span>
            </div>
            <div className="flex items-center gap-1 text-slate-400 text-[11px]">
              <Clock className="w-3 h-3" />
              <span>{formattedTime}</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
            <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span className="truncate">{event.venue_name}</span>
          </div>

          {/* Ticket Sold Progress */}
          <div className="pt-1">
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="text-slate-400 flex items-center gap-1">
                <Users className="w-3 h-3 text-indigo-400" />
                المقاعد المحجوزة
              </span>
              <span className="font-bold text-indigo-300">{percentSold}%</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-indigo-500 to-accent-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${percentSold}%` }}
              />
            </div>
          </div>
        </div>

        {/* Price & Book Button with Sales Timing Condition */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800">
          <div>
            <div className="text-[10px] text-slate-400 uppercase font-semibold">تبدأ التذاكر من</div>
            <div className="text-base font-black text-white">
              {minPrice > 0 ? `${minPrice} ${event.currency || 'ر.س'}` : 'مجاناً'}
            </div>
          </div>

          {salesStatus.isOpen ? (
            <button
              onClick={() => onBook(event)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition active:scale-95"
            >
              <Ticket className="w-3.5 h-3.5" />
              <span>حجز التذكرة</span>
            </button>
          ) : (
            <button
              disabled
              className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-slate-800/90 text-slate-400 border border-slate-700/80 font-semibold text-[11px] cursor-not-allowed opacity-90"
              title={salesStatus.message}
            >
              <Clock className="w-3 h-3 text-amber-400" />
              <span className="max-w-[130px] truncate">{salesStatus.buttonLabel}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
