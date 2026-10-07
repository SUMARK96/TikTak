import React, { useState, useEffect } from 'react';
import { Ticket as TicketIcon, Search, Calendar, MapPin, Download, Eye, QrCode } from 'lucide-react';
import { Ticket } from '../types';
import { dbService } from '../lib/database';

interface MyTicketsViewProps {
  onSelectTicket: (ticket: Ticket) => void;
  onBrowseEvents: () => void;
}

export const MyTicketsView: React.FC<MyTicketsViewProps> = ({ onSelectTicket, onBrowseEvents }) => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTickets = async () => {
      setLoading(true);
      const data = await dbService.getMyTickets();
      setTickets(data);
      setLoading(false);
    };
    fetchTickets();
  }, []);

  const filteredTickets = tickets.filter(
    (t) =>
      t.event_title.toLowerCase().includes(search.toLowerCase()) ||
      t.ticket_code.toLowerCase().includes(search.toLowerCase()) ||
      t.buyer_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/50 to-slate-900 border border-indigo-500/20 rounded-3xl p-5 sm:p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
              <TicketIcon className="w-6 h-6 text-indigo-400" />
              محفظة تذاكري الإلكترونية
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              جميع التذاكر التي قمت بحجزها جاهزة للمسح والدخول أو التحميل كـ PDF وصور
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث في تذاكري..."
              className="w-full bg-slate-800 border border-slate-700 rounded-xl pr-9 pl-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Tickets Grid */}
      {loading ? (
        <div className="py-16 text-center text-slate-400 text-xs">جاري تحميل تذاكرك...</div>
      ) : filteredTickets.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTickets.map((ticket) => {
            const isVIP = ticket.tier_name.toLowerCase().includes('vip');
            const isCheckedIn = ticket.status === 'checked_in';

            return (
              <div
                key={ticket.id}
                onClick={() => onSelectTicket(ticket)}
                className="group relative bg-slate-900 border border-slate-800 hover:border-indigo-500/60 rounded-3xl p-5 shadow-xl transition-all cursor-pointer space-y-4 hover:shadow-indigo-500/10"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-bold">
                      <QrCode className="w-6 h-6 group-hover:scale-110 transition-transform" />
                    </div>
                    <div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          isVIP
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                        }`}
                      >
                        {ticket.tier_name}
                      </span>
                      <h3 className="font-bold text-white text-sm mt-1 line-clamp-1">
                        {ticket.event_title}
                      </h3>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-slate-300 bg-slate-800/40 p-3 rounded-2xl border border-slate-800">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span>{new Date(ticket.event_date).toLocaleDateString('ar-SA')}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400 text-[11px]">
                    <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    <span className="truncate">{ticket.event_venue}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                  <div>
                    <div className="text-[10px] text-slate-500 font-mono">رمز التذكرة</div>
                    <div className="text-xs font-mono font-bold text-indigo-400">{ticket.ticket_code}</div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isCheckedIn ? (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        تم الدخول
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        صالحة للاستخدام
                      </span>
                    )}

                    <span className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition">
                      <Eye className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-16 text-center bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-4">
          <div className="w-16 h-16 rounded-full bg-slate-800 mx-auto flex items-center justify-center text-slate-500">
            <TicketIcon className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">لا توجد لديك تذاكر حالياً</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              تصفح الفعاليات المتاحة واختر فعاليتك المفضلة لتصدر تذكرتك الإلكترونية فوراً
            </p>
          </div>
          <button
            onClick={onBrowseEvents}
            className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-xl shadow-indigo-600/30 transition active:scale-95"
          >
            استكشاف الفعاليات الآن
          </button>
        </div>
      )}
    </div>
  );
};
